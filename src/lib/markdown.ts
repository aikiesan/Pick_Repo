import { fetchWithCacheFallback } from "./offline";

// Normalizes a scraped chapter's Markdown for display.
//
// The scraped chapters store one sentence per line with no blank line between
// them, which Markdown would otherwise collapse into a single paragraph. We also
// drop the bare "# N" heading the scraper leaves just under the real
// "# Chapter N" title so two large headings do not stack.
export function normalizeChapterMarkdown(md: string): string {
  const withoutBareNumberHeading = md.replace(/^#\s+\d+\s*$/gm, "");
  return withoutBareNumberHeading
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n\n");
}

// Simple in-memory cache so revisiting a chapter in the same session does not
// re-fetch or re-process it.
const cache = new Map<number, string>();

export async function loadChapterMarkdown(
  num: number,
  file: string,
): Promise<string> {
  const cached = cache.get(num);
  if (cached !== undefined) return cached;

  const url = import.meta.env.BASE_URL + file;
  // Network first, then any cache (service-worker precache or the explicit
  // offline download cache), so a chapter saved by either mechanism opens
  // offline even if the service worker is not controlling the page.
  const res = await fetchWithCacheFallback(url);
  const processed = normalizeChapterMarkdown(await res.text());
  cache.set(num, processed);
  return processed;
}
