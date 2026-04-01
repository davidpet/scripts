#!/usr/bin/env python3
import sys
import re
import html
import json
from collections import OrderedDict

# Usage: crash-plan-files.py /path/to/crashplan.log > changes.html

LINE_RE = re.compile(
    r'^I\s+'
    r'(?P<date>\d{2}/\d{2}/\d{2})\s+'
    r'(?P<time>\d{2}:\d{2}[AP]M)\s+'
    r'(?P<num>\d+)\s+'
    r'(?P<hash>[0-9a-fA-F]{32})\s+'
    r'(?P<flag>[01])\s+'
    r'(?P<rest>.+)$'
)

FILE_WITH_META_RE = re.compile(
    r'^(?P<path>.+?)\s+\((?P<size>\d+)\)\s+\[(?P<meta>[^\]]+)\]$'
)

FILE_WITH_SIZE_ONLY_RE = re.compile(
    r'^(?P<path>.+?)\s+\((?P<size>\d+)\)$'
)

DELETED_SUFFIX = ' (deleted)'


def warn(msg: str):
    print(f"WARNING: {msg}", file=sys.stderr)


def escape_attr(value: str) -> str:
    return html.escape(value, quote=True).replace("\n", "&#10;")


def split_windows_path(path: str):
    path = path.strip().replace("\\", "/")
    m = re.match(r'^([A-Za-z]:)(?:/(.*))?$', path)
    if m:
        drive = m.group(1)
        rest = m.group(2) or ""
        parts = [p for p in rest.split("/") if p]
        return drive, parts

    parts = [p for p in path.split("/") if p]
    return "(no drive)", parts


def parent_path_and_name(path: str):
    drive, parts = split_windows_path(path)
    if not parts:
        return drive, [], ""
    return drive, parts[:-1], parts[-1]


def parse_meta_numbers(meta_str: str):
    nums = []
    for piece in meta_str.split(","):
        piece = piece.strip()
        try:
            nums.append(int(piece))
        except ValueError:
            return None
    return nums


def classify_line(flag: str, rest: str, line_no: int):
    """
    Working assumptions:
    - flag=1 => folder
    - flag=0 => file
    - folder lines are added unless they end with " (deleted)"
    - file lines:
        deleted => deleted
        [new,old,...] present:
          new>0 old==0 => added
          new>0 old>0  => modified
          new==0 old>0 => unchanged (skip)
          new==0 old==0 => added (best guess for empty/new file)
        size but no [..] present:
          keep it and fall back to added
        no size and no [..]:
          keep it and fall back to added
    """
    rest = rest.rstrip()

    if flag == "1":
        if rest.endswith(DELETED_SUFFIX):
            return {
                "kind": "folder",
                "action": "deleted",
                "path": rest[:-len(DELETED_SUFFIX)],
            }
        return {
            "kind": "folder",
            "action": "added",
            "path": rest,
        }

    if rest.endswith(DELETED_SUFFIX):
        return {
            "kind": "file",
            "action": "deleted",
            "path": rest[:-len(DELETED_SUFFIX)],
        }

    m = FILE_WITH_META_RE.match(rest)
    if m:
        path = m.group("path")
        meta = parse_meta_numbers(m.group("meta"))
        if not meta or len(meta) < 2:
            warn(f"line {line_no}: could not parse file metadata, defaulting to added:\n{rest}")
            return {
                "kind": "file",
                "action": "added",
                "path": path,
            }

        new_blocks, old_blocks = meta[0], meta[1]

        if new_blocks > 0 and old_blocks == 0:
            action = "added"
        elif new_blocks > 0 and old_blocks > 0:
            action = "modified"
        elif new_blocks == 0 and old_blocks > 0:
            return None
        elif new_blocks == 0 and old_blocks == 0:
            action = "added"
        else:
            warn(
                f"line {line_no}: unusual file metadata [{new_blocks},{old_blocks},...], "
                f"defaulting to modified:\n{rest}"
            )
            action = "modified"

        return {
            "kind": "file",
            "action": action,
            "path": path,
        }

    m = FILE_WITH_SIZE_ONLY_RE.match(rest)
    if m:
        warn(f"line {line_no}: file entry has size but no bracket metadata, defaulting to added:\n{rest}")
        return {
            "kind": "file",
            "action": "added",
            "path": m.group("path"),
        }

    warn(f"line {line_no}: file entry has no bracket metadata, defaulting to added:\n{rest}")
    return {
        "kind": "file",
        "action": "added",
        "path": rest,
    }


def make_folder_node(name, full_path):
    return {
        "type": "folder",
        "name": name,
        "full_path": full_path,
        "explicit_action": None,
        "explicit_timestamp": None,
        "first_child_timestamp": None,
        "items": [],
        "folder_children": OrderedDict(),
    }


def make_drive_root(drive):
    full_path = drive if drive.endswith("/") else drive + "/"
    return {
        "type": "drive_root",
        "name": drive,
        "full_path": full_path,
        "items": [],
        "folder_children": OrderedDict(),
    }


def join_path(drive, folder_parts):
    if not folder_parts:
        return drive + "/"
    return drive + "/" + "/".join(folder_parts)


def ensure_folder_path(drive_root, drive, folder_parts, event_timestamp=None):
    current = drive_root
    built_parts = []

    for part in folder_parts:
        built_parts.append(part)
        if part not in current["folder_children"]:
            node = make_folder_node(part, join_path(drive, built_parts))
            current["folder_children"][part] = node
            current["items"].append(("folder", node))
        else:
            node = current["folder_children"][part]

        if event_timestamp and node["first_child_timestamp"] is None:
            node["first_child_timestamp"] = event_timestamp

        current = node

    return current


def add_explicit_folder(drive_groups, timestamp, action, path):
    drive, parts = split_windows_path(path)
    drive_root = drive_groups.setdefault(drive, make_drive_root(drive))

    if not parts:
        return

    parent = ensure_folder_path(drive_root, drive, parts[:-1], event_timestamp=timestamp)
    folder_name = parts[-1]

    if folder_name not in parent["folder_children"]:
        node = make_folder_node(folder_name, join_path(drive, parts))
        parent["folder_children"][folder_name] = node
        parent["items"].append(("folder", node))
    else:
        node = parent["folder_children"][folder_name]

    node["explicit_action"] = action
    node["explicit_timestamp"] = timestamp
    if node["first_child_timestamp"] is None:
        node["first_child_timestamp"] = timestamp


def add_file_entry(drive_groups, timestamp, action, path):
    drive, folder_parts, filename = parent_path_and_name(path)
    drive_root = drive_groups.setdefault(drive, make_drive_root(drive))

    parent = ensure_folder_path(drive_root, drive, folder_parts, event_timestamp=timestamp)

    file_entry = {
        "type": "file",
        "name": filename,
        "full_path": path.replace("\\", "/"),
        "action": action,
        "timestamp": timestamp,
    }
    parent["items"].append(("file", file_entry))


def folder_css_class(node):
    if node["explicit_action"] == "added":
        return "folder-added"
    if node["explicit_action"] == "deleted":
        return "folder-deleted"
    return "folder-implicit"


def folder_tooltip(node):
    if node["explicit_action"] and node["explicit_timestamp"]:
        return f"{node['explicit_action'].upper()} {node['explicit_timestamp']}\n{node['full_path']}"
    if node["first_child_timestamp"]:
        return f"CONTAINS CHANGES {node['first_child_timestamp']}\n{node['full_path']}"
    return node["full_path"]


def file_css_class(action):
    if action == "added":
        return "file-added"
    if action == "deleted":
        return "file-deleted"
    return "file-modified"


def file_tooltip(entry):
    return f"{entry['action'].upper()} {entry['timestamp']}\n{entry['full_path']}"


def drive_tooltip(drive_root):
    return drive_root["full_path"]


def date_tooltip(date):
    return date


def js_string(value: str):
    return html.escape(json.dumps(value))


def render_copy_label(text, value_to_copy, title, extra_class=""):
    safe_text = html.escape(text)
    safe_title = escape_attr(title)
    safe_value = js_string(value_to_copy)
    cls = f'copy-target {extra_class}'.strip()
    return (
        f'<span class="{cls}" title="{safe_title}" '
        f'onclick="copyText(event, {safe_value}, this)">{safe_text}</span>'
    )


def render_items(items, out, indent=0):
    pad = " " * indent
    out.append(f'{pad}<ul class="tree-list">')
    for kind, obj in items:
        if kind == "folder":
            cls = folder_css_class(obj)
            title = folder_tooltip(obj)
            explicit_action = obj["explicit_action"] or ""
            label_html = render_copy_label(
                obj["name"],
                obj["full_path"],
                title,
                extra_class=cls
            )
            out.append(
                f'{pad}  <li class="tree-item {cls}" data-kind="folder" '
                f'data-explicit-action="{html.escape(explicit_action)}">'
            )
            out.append(f'{pad}    <details open>')
            out.append(f'{pad}      <summary>{label_html}</summary>')
            out.append(f'{pad}      <div class="children">')
            render_items(obj["items"], out, indent + 8)
            out.append(f'{pad}      </div>')
            out.append(f'{pad}    </details>')
            out.append(f'{pad}  </li>')
        else:
            cls = file_css_class(obj["action"])
            title = file_tooltip(obj)
            label_html = render_copy_label(
                obj["name"],
                obj["full_path"],
                title,
                extra_class=cls
            )
            out.append(
                f'{pad}  <li class="tree-item {cls}" data-kind="file" '
                f'data-action="{html.escape(obj["action"])}">{label_html}</li>'
            )
    out.append(f"{pad}</ul>")


def emit_html(grouped):
    out = []
    out.append("""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CrashPlan Change Summary</title>
<style>
  body {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    margin: 24px;
    line-height: 1.35;
    color: #222;
    background: #fff;
  }

  h1 {
    margin-top: 0;
    margin-bottom: 0.6rem;
  }

  .controls {
    margin-bottom: 1rem;
    padding: 0.65rem 0.8rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fafafa;
  }

  .controls strong {
    margin-right: 0.8rem;
  }

  .controls label {
    margin-right: 1rem;
    cursor: pointer;
    user-select: none;
  }

  .controls input[type="checkbox"] {
    margin-right: 0.3rem;
    vertical-align: middle;
  }

  .filter-added-label {
    color: #1a7f37;
  }

  .filter-modified-label {
    color: #0969da;
  }

  .filter-deleted-label {
    color: #cf222e;
  }

  ul {
    margin-top: 0.2rem;
    margin-bottom: 0.2rem;
  }

  li {
    margin: 0.14rem 0;
    word-break: break-word;
  }

  details {
    margin: 0.15rem 0;
  }

  summary {
    cursor: pointer;
    user-select: none;
  }

  summary::-webkit-details-marker {
    cursor: pointer;
  }

  .date-group > .children > .drive-group {
    display: block;
    margin-left: 1.4rem;
  }

  .copy-target {
    cursor: pointer;
    user-select: text;
    padding: 1px 3px;
    border-radius: 4px;
  }

  .copy-target:hover {
    background: rgba(0, 0, 0, 0.06);
  }

  .copied {
    outline: 2px solid rgba(0, 0, 0, 0.18);
    background: rgba(0, 0, 0, 0.08);
  }

  .date-label,
  .drive-label,
  .folder-added,
  .folder-deleted,
  .folder-implicit {
    font-weight: 600;
  }

  .folder-added {
    color: #1b5e20;
  }

  .folder-deleted {
    color: #8b0000;
  }

  .folder-implicit {
    color: #222;
  }

  .file-added {
    color: #1a7f37;
  }

  .file-modified {
    color: #0969da;
  }

  .file-deleted {
    color: #cf222e;
  }

  .drive-label,
  .date-label {
    color: #222;
    font-weight: 700;
  }

  .tree-item {
    list-style-position: outside;
  }
</style>
<script>
async function copyText(event, text, el) {
  event.preventDefault();
  event.stopPropagation();

  try {
    await navigator.clipboard.writeText(text);
    el.classList.add('copied');
    const oldTitle = el.getAttribute('title') || '';
    el.setAttribute('data-old-title', oldTitle);
    el.setAttribute('title', 'Copied: ' + text);
    setTimeout(() => {
      el.classList.remove('copied');
      const prev = el.getAttribute('data-old-title');
      if (prev !== null) {
        el.setAttribute('title', prev);
        el.removeAttribute('data-old-title');
      }
    }, 900);
  } catch (err) {
    console.error('Clipboard copy failed:', err);
  }
}

function setShown(el, shown, shownDisplay) {
  el.style.display = shown ? shownDisplay : 'none';
}

function firstElementChildByClass(parent, className) {
  if (!parent) return null;
  for (const child of parent.children) {
    if (child.classList && child.classList.contains(className)) {
      return child;
    }
  }
  return null;
}

function firstElementChildByTag(parent, tagName) {
  if (!parent) return null;
  const wanted = tagName.toUpperCase();
  for (const child of parent.children) {
    if (child.tagName === wanted) {
      return child;
    }
  }
  return null;
}

function itemChildrenContainerForFolderLi(folderLi) {
  const details = firstElementChildByTag(folderLi, 'details');
  return firstElementChildByClass(details, 'children');
}

function directVisibleTreeItemsInContainer(container) {
  const ul = firstElementChildByTag(container, 'ul');
  if (!ul) return 0;

  let count = 0;
  for (const child of ul.children) {
    if (child.style.display !== 'none') {
      count += 1;
    }
  }
  return count;
}

function hasVisibleChildInContainer(container) {
  if (!container) return false;

  for (const child of container.children) {
    if (child.tagName === 'UL') {
      if (directVisibleTreeItemsInContainer(container) > 0) {
        return true;
      }
    } else if (child.style.display !== 'none') {
      return true;
    }
  }
  return false;
}

function applyFilters() {
  const showAdded = document.getElementById('filter-added').checked;
  const showModified = document.getElementById('filter-modified').checked;
  const showDeleted = document.getElementById('filter-deleted').checked;

  const actionVisible = {
    added: showAdded,
    modified: showModified,
    deleted: showDeleted,
  };

  for (const fileNode of document.querySelectorAll('li[data-kind="file"]')) {
    const action = fileNode.dataset.action;
    setShown(fileNode, !!actionVisible[action], 'list-item');
  }

  const folderNodes = Array.from(document.querySelectorAll('li[data-kind="folder"]')).reverse();
  for (const folderNode of folderNodes) {
    const explicitAction = folderNode.dataset.explicitAction || '';

    if (explicitAction === 'added' || explicitAction === 'deleted') {
      setShown(folderNode, true, 'list-item');
      continue;
    }

    const childrenContainer = itemChildrenContainerForFolderLi(folderNode);
    const shouldShow = directVisibleTreeItemsInContainer(childrenContainer) > 0;
    setShown(folderNode, shouldShow, 'list-item');
  }

  const driveGroups = Array.from(document.querySelectorAll('details.drive-group')).reverse();
  for (const driveGroup of driveGroups) {
    const childrenContainer = firstElementChildByClass(driveGroup, 'children');
    const shouldShow = hasVisibleChildInContainer(childrenContainer);
    setShown(driveGroup, shouldShow, 'block');
  }

  const dateGroups = Array.from(document.querySelectorAll('details.date-group')).reverse();
  for (const dateGroup of dateGroups) {
    const childrenContainer = firstElementChildByClass(dateGroup, 'children');
    const shouldShow = hasVisibleChildInContainer(childrenContainer);
    setShown(dateGroup, shouldShow, 'block');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  for (const cb of document.querySelectorAll('.controls input[type="checkbox"]')) {
    cb.addEventListener('change', applyFilters);
  }
  applyFilters();
});
</script>
</head>
<body>
<h1>CrashPlan Change Summary</h1>

<div class="controls">
  <strong>Show files:</strong>
  <label class="filter-added-label"><input type="checkbox" id="filter-added" checked> Added</label>
  <label class="filter-modified-label"><input type="checkbox" id="filter-modified" checked> Modified</label>
  <label class="filter-deleted-label"><input type="checkbox" id="filter-deleted" checked> Deleted</label>
</div>
""")

    for date, drive_groups in grouped.items():
        date_label = render_copy_label(
            date,
            date,
            date_tooltip(date),
            extra_class="date-label"
        )
        out.append('<details class="date-group" data-kind="date-group">')
        out.append(f'  <summary>{date_label}</summary>')
        out.append('  <div class="children">')

        for drive, drive_root in drive_groups.items():
            drive_label = render_copy_label(
                drive,
                drive_root["full_path"],
                drive_tooltip(drive_root),
                extra_class="drive-label"
            )
            out.append('    <details class="drive-group" data-kind="drive-group">')
            out.append(f'      <summary>{drive_label}</summary>')
            out.append('      <div class="children">')
            render_items(drive_root["items"], out, indent=8)
            out.append('      </div>')
            out.append('    </details>')

        out.append('  </div>')
        out.append('</details>')

    out.append("</body>")
    out.append("</html>")
    print("\n".join(out))


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} /path/to/crashplan.log", file=sys.stderr)
        sys.exit(1)

    log_path = sys.argv[1]
    grouped = OrderedDict()

    try:
        with open(log_path, "r", encoding="utf-8", errors="replace") as f:
            for line_no, raw_line in enumerate(f, start=1):
                line = raw_line.rstrip("\r\n")

                if line and not line.startswith("I "):
                    warn(f"line {line_no}: unexpected line prefix (not 'I '):\n{line}")

                m = LINE_RE.match(line)
                if not m:
                    continue

                date = m.group("date")
                time_str = m.group("time")
                timestamp = f"{date} {time_str}"
                flag = m.group("flag")
                rest = m.group("rest")

                entry = classify_line(flag, rest, line_no)
                if entry is None:
                    continue

                drive_groups = grouped.setdefault(date, OrderedDict())

                if entry["kind"] == "folder":
                    add_explicit_folder(
                        drive_groups,
                        timestamp,
                        entry["action"],
                        entry["path"],
                    )
                else:
                    add_file_entry(
                        drive_groups,
                        timestamp,
                        entry["action"],
                        entry["path"],
                    )

    except OSError as e:
        print(f"Error reading {log_path}: {e}", file=sys.stderr)
        sys.exit(1)

    emit_html(grouped)


if __name__ == "__main__":
    main()