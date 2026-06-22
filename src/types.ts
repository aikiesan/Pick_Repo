export interface Chapter {
  num: number;
  title: string;
  file: string; // path relative to the site base, e.g. "chapters/001_Chapter_1.md"
}

export type Theme = "dark" | "light" | "sepia";
