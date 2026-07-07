import type { Chapter } from "../types";
import { OfflineManager } from "./OfflineManager";

interface HomeProps {
  resumeNum: number | null;
  onResume: () => void;
  onStart: () => void;
  hasChapters: boolean;
  chapters: Chapter[];
}

export function Home({ resumeNum, onResume, onStart, hasChapters, chapters }: HomeProps) {
  return (
    <main className="reader">
      <div className="chapter-scroll">
        <div className="welcome">
          <div className="welcome-mark" aria-hidden="true">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="welcome-book-icon"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
              <path d="M6 14h10" />
            </svg>
          </div>
          <h2>Pick Me Up</h2>
          <p className="welcome-sub">Infinite Gacha &middot; Offline Reader</p>

          {hasChapters ? (
            <div className="welcome-actions">
              {resumeNum != null && (
                <button className="btn btn-primary" onClick={onResume}>
                  Resume Chapter {resumeNum}
                </button>
              )}
              <button className="btn" onClick={onStart}>
                Start from Chapter 1
              </button>
            </div>
          ) : (
            <p className="welcome-sub">Loading chapters...</p>
          )}

          <OfflineManager chapters={chapters} />
        </div>
      </div>
    </main>
  );
}
