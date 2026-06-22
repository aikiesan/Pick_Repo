#!/usr/bin/env python3
"""
generate_index.py

Scans the chapters/ folder and writes chapters_index.json at the project root.

The reader app fetches chapters_index.json first and uses it to build the
sidebar and to know which Markdown file backs each chapter.

This script is safe to re-run any time chapters are added or rescraped. It is
idempotent and sorts chapters numerically (1, 2, 10) rather than lexically
(1, 10, 2). It does not trust filenames blindly: it cross-checks the numeric
prefix in each filename against the "# Chapter N" heading inside the file and
warns on any mismatch, placeholder stub, duplicate, or gap in the sequence.

Output schema (one object per line for clean git diffs):
    [
    {"num": 1, "title": "Chapter 1", "file": "chapters/001_Chapter_1.md"},
    ...
    ]

Warnings are non-fatal so a partially scraped set still produces an index.
Exit code is non-zero only on a hard error (no chapters dir, unparseable
filenames, or duplicate chapter numbers that would make routing ambiguous).
"""

import json
import re
import sys
from pathlib import Path

# Resolve paths relative to this script so it works from any working directory
# (local shell or the GitHub Actions runner).
ROOT = Path(__file__).resolve().parent
# Chapters and the generated index live under public/ so Vite serves them as
# static assets (and the PWA plugin precaches them for offline use).
PUBLIC_DIR = ROOT / "public"
CHAPTERS_DIR = PUBLIC_DIR / "chapters"
OUTPUT_FILE = PUBLIC_DIR / "chapters_index.json"

# Filename pattern: NNN_Some_Title.md  (zero-padded numeric prefix + slug)
FILENAME_RE = re.compile(r"^(\d+)_(.*)\.md$")
# First heading inside the file, e.g. "# Chapter 12"
HEADING_RE = re.compile(r"^#\s*Chapter\s+(\d+)\b", re.IGNORECASE)
# Markers left by the scraper when a chapter is not yet published
PLACEHOLDER_MARKERS = ("coming soon", "this chapter is being updated")


def format_ranges(nums):
    """Collapse a sorted list of ints into compact ranges, e.g. [3,4,5,9] -> '3-5, 9'."""
    nums = sorted(nums)
    if not nums:
        return ""
    parts = []
    start = prev = nums[0]
    for n in nums[1:]:
        if n == prev + 1:
            prev = n
            continue
        parts.append(str(start) if start == prev else f"{start}-{prev}")
        start = prev = n
    parts.append(str(start) if start == prev else f"{start}-{prev}")
    return ", ".join(parts)


def read_heading_num(path):
    """Return the chapter number from the first '# Chapter N' heading, or None."""
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            stripped = line.strip()
            if not stripped:
                continue
            match = HEADING_RE.match(stripped)
            return int(match.group(1)) if match else None
    return None


def is_placeholder(path):
    """True if the file body is a 'Coming Soon' stub rather than real content."""
    text = path.read_text(encoding="utf-8").lower()
    return any(marker in text for marker in PLACEHOLDER_MARKERS)


def main():
    if not CHAPTERS_DIR.is_dir():
        print(f"ERROR: chapters directory not found at {CHAPTERS_DIR}", file=sys.stderr)
        return 1

    md_files = sorted(CHAPTERS_DIR.glob("*.md"))
    if not md_files:
        print(f"ERROR: no .md files found in {CHAPTERS_DIR}", file=sys.stderr)
        return 1

    entries = []
    warnings = []
    placeholders = []
    seen_nums = {}
    had_hard_error = False

    for path in md_files:
        match = FILENAME_RE.match(path.name)
        if not match:
            warnings.append(f"  - unparseable filename, skipped: {path.name}")
            had_hard_error = True
            continue

        num = int(match.group(1))
        title = match.group(2).replace("_", " ").strip()

        # Cross-check: numeric prefix vs the "# Chapter N" heading in the file.
        heading_num = read_heading_num(path)
        if heading_num is None:
            warnings.append(f"  - {path.name}: no '# Chapter N' heading found to cross-check")
        elif heading_num != num:
            warnings.append(
                f"  - {path.name}: filename says chapter {num} but heading says chapter {heading_num}"
            )

        # Duplicate numbers would make #/chapter/N routing ambiguous.
        if num in seen_nums:
            warnings.append(
                f"  - duplicate chapter number {num}: {seen_nums[num]} and {path.name}"
            )
            had_hard_error = True
        seen_nums[num] = path.name

        if is_placeholder(path):
            placeholders.append(num)

        entries.append(
            {
                "num": num,
                "title": title,
                # Forward slashes: this becomes a fetch URL in the browser.
                "file": f"chapters/{path.name}",
            }
        )

    # Sort numerically, not lexically.
    entries.sort(key=lambda e: e["num"])

    # Report gaps in the 1..max sequence (missing/failed chapters).
    if entries:
        present = {e["num"] for e in entries}
        full_range = set(range(1, max(present) + 1))
        gaps = sorted(full_range - present)
        if gaps:
            warnings.append(f"  - missing chapter numbers in sequence: {format_ranges(gaps)}")

    # Write one JSON object per line inside the array for readable git diffs.
    lines = [json.dumps(e, ensure_ascii=False) for e in entries]
    OUTPUT_FILE.write_text("[\n" + ",\n".join(lines) + "\n]\n", encoding="utf-8")

    # Summary.
    print(f"Wrote {OUTPUT_FILE.name}: {len(entries)} chapters indexed.")
    if placeholders:
        print(
            f"Placeholder (Coming Soon) chapters: {len(placeholders)} "
            f"-> {format_ranges(placeholders)}"
        )
    if warnings:
        print("Warnings:")
        for w in warnings:
            print(w)
    else:
        print("No warnings. Filenames and headings are consistent.")

    # Only fail the build on hard errors; placeholders and gaps are expected
    # during an in-progress scrape and must not block a deploy.
    return 1 if had_hard_error else 0


if __name__ == "__main__":
    sys.exit(main())
