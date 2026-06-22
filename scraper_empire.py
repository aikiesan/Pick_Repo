import os
import time
import random
import requests
from bs4 import BeautifulSoup
import re

# Base URL for the novel chapters on Empire Novel
BASE_URL = "https://www.empirenovel.com/novel/pick-me-up/{}"

# Headers to mimic a browser and prevent bot blocking
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": "https://www.empirenovel.com/novel/pick-me-up"
}

def clean_text(text):
    """
    Cleans up redundant whitespaces and consecutive empty lines.
    """
    lines = [line.strip() for line in text.split('\n')]
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
    Fetches a single chapter from Empire Novel and returns its title and parsed content.
    """
    url = BASE_URL.format(chapter_num)
    try:
        response = session.get(url, headers=HEADERS, timeout=15)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Locate the main novel content div
            read_novel_div = soup.find('div', id='read-novel')
            if not read_novel_div:
                print(f"Warning: No div with id='read-novel' found for chapter {chapter_num}")
                return None, None
            
            # Extract chapter title
            title_tag = read_novel_div.find('h3')
            title = title_tag.get_text(strip=True) if title_tag else f"Chapter {chapter_num}"
            
            # Extract paragraphs
            paragraphs = read_novel_div.find_all('p')
            if not paragraphs:
                print(f"Warning: No paragraphs found for chapter {chapter_num}")
                return None, None
            
            # Join paragraphs with double newlines
            raw_text = "\n\n".join([p.get_text().strip() for p in paragraphs])
            cleaned_content = clean_text(raw_text)
            
            return title, cleaned_content
        else:
            print(f"Failed to load chapter {chapter_num} - Status Code: {response.status_code}")
            return None, None
    except Exception as e:
        print(f"Error fetching chapter {chapter_num}: {e}")
        return None, None

def main():
    # Configure scraper
    start_chapter = 1
    end_chapter = 327  # Empire Novel has up to chapter 327 online
    output_dir = os.path.join("public", "chapters")

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")

    session = requests.Session()
    print(f"Downloading chapters {start_chapter} to {end_chapter} from Empire Novel...")

    for ch in range(start_chapter, end_chapter + 1):
        title, content = fetch_chapter(ch, session)
        
        if title and content:
            # Create a filename-safe title
            safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ' or c=='-']).rstrip()
            # Clean double spaces that might occur
            safe_title = re.sub(r'\s+', ' ', safe_title)
            filename = f"{ch:03d}_{safe_title.replace(' ', '_')}.md"
            filepath = os.path.join(output_dir, filename)
            
            # Format as Markdown
            markdown_content = f"# {title}\n\n{content}\n"
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(markdown_content)
            print(f"Saved Chapter {ch}: {filename}")
        else:
            print(f"Skipping Chapter {ch} due to an error.")
            
        # Respectful delay between 1.0 and 2.5 seconds
        delay = random.uniform(1.0, 2.5)
        time.sleep(delay)

    print("Finished downloading all chapters from Empire Novel!")

if __name__ == "__main__":
    main()
