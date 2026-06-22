import os
import time
import random
import requests
from bs4 import BeautifulSoup

# Base URL for the novel chapters
BASE_URL = "https://novellunar.com/novel/pick-me-up-infinite-gacha/chapter/{}"

# Request headers to mimic a browser and avoid simple bot protection
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": "https://novellunar.com/novel/pick-me-up-infinite-gacha"
}

def clean_text(text):
    """
    Cleans up redundant whitespaces and formatting issues.
    """
    lines = [line.strip() for line in text.split('\n')]
    # Remove consecutive empty lines to keep it clean
    cleaned_lines = []
    prev_was_empty = False
    for line in lines:
        if not line:
            if not prev_was_empty:
                cleaned_lines.append("")
                prev_was_empty = True
        else:
            cleaned_lines.append(line)
            prev_was_empty = False
    return "\n".join(cleaned_lines)

def fetch_chapter(chapter_num, session):
    """
    Fetches a single chapter and returns its parsed text content and title.
    """
    url = BASE_URL.format(chapter_num)
    print(f"Fetching Chapter {chapter_num} from {url}...")
    
    # Simple retry loop
    for attempt in range(3):
        try:
            response = session.get(url, headers=HEADERS, timeout=15)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Extract chapter title
                title_tag = soup.find('h1')
                title = title_tag.get_text(strip=True) if title_tag else f"Chapter {chapter_num}"
                
                # Extract main content
                # Looking for the article tag and the div inside it with pre-wrap styling
                article = soup.find('article')
                if not article:
                    print(f"Warning: No article tag found in chapter {chapter_num}")
                    return None, None
                
                content_div = article.find('div')
                if not content_div:
                    print(f"Warning: No content div found in chapter {chapter_num}")
                    return None, None
                
                # Get the raw text content
                raw_text = content_div.get_text()
                cleaned_content = clean_text(raw_text)
                
                return title, cleaned_content
            
            elif response.status_code == 404:
                print(f"Chapter {chapter_num} returned 404 (Not Found). Ending fetch.")
                return None, None
            else:
                print(f"Unexpected status code {response.status_code} for chapter {chapter_num}. Retrying...")
        except requests.RequestException as e:
            print(f"Network error on attempt {attempt + 1} for chapter {chapter_num}: {e}")
        
        # Exponential backoff delay on retry
        time.sleep(2 ** attempt + random.random())
        
    print(f"Failed to fetch chapter {chapter_num} after 3 attempts.")
    return None, None

def main():
    # Settings
    start_chapter = 1
    end_chapter = 400
    output_dir = os.path.join("public", "chapters")
    
    # Create the output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")

    # Use a requests session to reuse TCP connections (improves speed)
    session = requests.Session()
    
    print(f"Starting downloader for Chapters {start_chapter} to {end_chapter}...")
    
    for ch in range(start_chapter, end_chapter + 1):
        title, content = fetch_chapter(ch, session)
        
        if title and content:
            # Create a filename-safe title
            safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ' or c=='-']).rstrip()
            filename = f"{ch:03d}_{safe_title.replace(' ', '_')}.md"
            filepath = os.path.join(output_dir, filename)
            
            # Format as Markdown
            markdown_content = f"# {title}\n\n{content}\n"
            
            # Save to file
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(markdown_content)
            
            print(f"Saved: {filepath}")
        else:
            print(f"Skipping Chapter {ch} due to errors.")
            
        # Rate-limiting: sleep between 1 to 2.5 seconds to avoid being blocked
        delay = random.uniform(1.0, 2.5)
        print(f"Waiting {delay:.2f} seconds before next request...")
        time.sleep(delay)
        print("-" * 40)
        
    print("Download process completed.")

if __name__ == "__main__":
    main()
