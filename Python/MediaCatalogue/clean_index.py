#!/usr/bin/env python3
# Dedupes and sorts entries within each section of an index.txt file from print-music-slugs chrome snippet (and section names within file) and prints to stdout.

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path


DEFAULT_ROOT = Path("/mnt/d/Video Assets/Music/Production Crate/")


@dataclass(slots=True)
class Section:
    name: str
    entries: list[str]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Read an index.txt file, then sort and deduplicate entries "
            "within each section only."
        )
    )
    parser.add_argument(
        "root",
        nargs="?",
        type=Path,
        default=DEFAULT_ROOT,
        help=(
            "Folder containing index.txt and the section subfolders. "
            "In a shell, you can quote the path or escape spaces."
        ),
    )
    return parser.parse_args()


def index_path_from_root(root: Path) -> Path:
    return root / "index.txt"


def parse_index_file(index_path: Path) -> list[Section]:
    sections: list[Section] = []
    current_section: Section | None = None

    with index_path.open("r", encoding="utf-8") as f:
        for line_number, raw_line in enumerate(f, start=1):
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


def sort_and_deduplicate_sections(sections: list[Section]) -> list[Section]:
    normalized_sections: list[Section] = []

    for section in sections:
        unique_sorted_entries = sorted(set(section.entries))
        normalized_sections.append(
            Section(name=section.name, entries=unique_sorted_entries)
        )

    return sorted(normalized_sections, key=lambda section: section.name)


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
    args = parse_args()
    root: Path = args.root.expanduser()
    index_path = index_path_from_root(root)

    if not index_path.is_file():
        print(f"Error: index file not found: {index_path}", file=sys.stderr)
        return 1

    try:
        sections = parse_index_file(index_path)
        normalized_sections = sort_and_deduplicate_sections(sections)
        output = render_index(normalized_sections)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
