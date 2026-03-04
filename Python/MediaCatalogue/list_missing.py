#!/usr/bin/env python3
# Print an index of entries that are in index.txt but missing from index_local.txt (which comes from running index_media.py).

import sys
from dataclasses import dataclass
from pathlib import Path


DEFAULT_ROOT = Path("/mnt/d/Video Assets/Music/Production Crate/")
INDEX_PATH = DEFAULT_ROOT / "index.txt"
INDEX_LOCAL_PATH = DEFAULT_ROOT / "index_local.txt"


@dataclass(slots=True)
class Section:
    name: str
    entries: list[str]


def parse_index_file(index_path: Path) -> list[Section]:
    sections: list[Section] = []
    current_section: Section | None = None

    with index_path.open("r", encoding="utf-8") as file:
        for line_number, raw_line in enumerate(file, start=1):
            line = raw_line.strip()

            if not line:
                continue

            if line.startswith("[") and line.endswith("]"):
                section_name = line[1:-1]
                current_section = Section(name=section_name, entries=[])
                sections.append(current_section)
                continue

            if current_section is None:
                raise ValueError(
                    f"Found entry before first section at line {line_number}: {line!r}"
                )

            current_section.entries.append(line)

    return sections


def build_entry_set(sections: list[Section]) -> set[str]:
    entries: set[str] = set()

    for section in sections:
        entries.update(section.entries)

    return entries


def find_missing_sections(
    source_sections: list[Section],
    local_entries: set[str],
) -> list[Section]:
    missing_sections: list[Section] = []
    emitted_entries: set[str] = set()

    for section in source_sections:
        missing_entries: list[str] = []

        for entry in section.entries:
            if entry in local_entries:
                continue

            if entry in emitted_entries:
                continue

            emitted_entries.add(entry)
            missing_entries.append(entry)

        if missing_entries:
            missing_sections.append(Section(name=section.name, entries=missing_entries))

    return missing_sections


def render_index(sections: list[Section]) -> str:
    output_lines: list[str] = []

    for section in sections:
        output_lines.append(f"[{section.name}]")
        output_lines.extend(section.entries)
        output_lines.append("")

    if not output_lines:
        return ""

    return "\n".join(output_lines).rstrip() + "\n"


def main() -> int:
    if not INDEX_PATH.is_file():
        print(f"Error: index file not found: {INDEX_PATH}", file=sys.stderr)
        return 1

    if not INDEX_LOCAL_PATH.is_file():
        print(f"Error: local index file not found: {INDEX_LOCAL_PATH}", file=sys.stderr)
        return 1

    try:
        source_sections = parse_index_file(INDEX_PATH)
        local_sections = parse_index_file(INDEX_LOCAL_PATH)
        local_entries = build_entry_set(local_sections)
        missing_sections = find_missing_sections(source_sections, local_entries)
        output = render_index(missing_sections)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
