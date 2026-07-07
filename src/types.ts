export interface Chapter {
  num: number;
  title: string;
  file: string; // path relative to the site base, e.g. "chapters/001_Chapter_1.md"
}

export type Theme = "dark" | "black" | "light" | "sepia";

export interface Bookmark {
  id: number; // creation timestamp doubles as a unique id
  num: number; // chapter number
  ratio: number; // scroll position within the chapter (0..1)
  quote?: string; // text the reader had selected when bookmarking, if any
  created: number;
}
