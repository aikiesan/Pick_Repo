interface HomeProps {
  resumeNum: number | null;
  onResume: () => void;
  onStart: () => void;
  hasChapters: boolean;
}

export function Home({ resumeNum, onResume, onStart, hasChapters }: HomeProps) {
  return (
    <main className="reader">
      <div className="chapter-scroll">
        <div className="welcome">
          <div className="welcome-mark" aria-hidden="true" />
          <h2>Pick Me Up</h2>
          <p className="welcome-sub">Infinite Gacha &middot; offline reader</p>

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
        </div>
      </div>
    </main>
  );
}
