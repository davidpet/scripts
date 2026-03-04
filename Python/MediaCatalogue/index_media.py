#!/usr/bin/env python3
# Generate index.txt-style output by scanning immediate subfolders for .wav files.

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
            "Generate index.txt-style output by scanning subfolders for .wav files."
        )
    )
    parser.add_argument(
        "root",
        nargs="?",
        type=Path,
        default=DEFAULT_ROOT,
        help=(
            "Folder containing the media subfolders. "
            "In a shell, you can quote the path or escape spaces."
        ),
    )
    return parser.parse_args()


def get_section_folders(root: Path) -> list[Path]:
    return sorted(
        (path for path in root.iterdir() if path.is_dir()),
        key=lambda path: path.name,
    )


def get_wav_entries(folder: Path) -> list[str]:
    entries = [
        path.stem
        for path in folder.iterdir()
        if path.is_file() and path.suffix.lower() == ".wav"
    ]
    return sorted(entries)


def build_sections(root: Path) -> list[Section]:
    sections: list[Section] = []

    for folder in get_section_folders(root):
        entries = get_wav_entries(folder)
        if entries:
            sections.append(Section(name=folder.name, entries=entries))

    return sections


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

    if not root.is_dir():
        print(
            f"Error: root folder not found or is not a directory: {root}",
            file=sys.stderr,
        )
        return 1

    try:
        sections = build_sections(root)
        output = render_index(sections)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
