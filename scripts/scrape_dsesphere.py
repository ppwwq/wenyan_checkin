"""Scrape DSE Sphere for all 16 essays: original text, annotations, translations."""
import requests
import json
import re
import os
from bs4 import BeautifulSoup

BASE = "https://dsesphere.com/learn-online/十二篇範文"

ESSAYS = [
    "論仁、論孝、論君子",
    "魚我所欲也",
    "逍遙遊",
    "勸學",
    "廉頗藺相如列傳",
    "出師表",
    "師說",
    "始得西山宴遊記",
    "岳陽樓記",
    "六國論",
    "山居秋暝",
    "月下獨酌",
    "登樓",
    "念奴嬌·赤壁懷古",
    "聲聲慢·秋情",
    "青玉案·元夕",
]

def scrape_essay(slug):
    url = f"{BASE}/{slug}"
    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    resp.encoding = 'utf-8'
    soup = BeautifulSoup(resp.text, 'html.parser')

    # Extract original text segments (s-N spans)
    original_spans = soup.select('span[class^="s-"]')
    original_parts = []
    for span in original_spans:
        text = span.get_text(strip=True)
        if text:
            original_parts.append(text)

    # Extract translation segments (r-N spans)
    translation_spans = soup.select('span[class^="r-"]')
    translation_parts = []
    for span in translation_spans:
        text = span.get_text(strip=True)
        if text:
            translation_parts.append(text)

    # Extract annotations from popover elements
    annotations = []
    popovers = soup.select('[data-content]')
    for pop in popovers:
        word = pop.get_text(strip=True)
        meaning = pop.get('data-content', '').strip()
        if word and meaning:
            annotations.append({"word": word, "meaning": meaning})

    # Title
    title = soup.select_one('h1').get_text(strip=True) if soup.select_one('h1') else slug

    return {
        "title": title,
        "original_text": "".join(original_parts) if original_parts else "",
        "original_segments": original_parts,
        "translation_segments": translation_parts,
        "annotations": annotations,
    }

def generate_questions(essay_data):
    """Auto-generate multiple-choice word questions from annotations."""
    questions = []
    for ann in essay_data.get("annotations", []):
        q = {
            "type": "word_mc",
            "dimension": "語譯詞解",
            "difficulty": 1,
            "stem": f"「{ann['word']}」的意思是？",
            "correct_answer": ann['meaning'],
            "explanation": f"「{ann['word']}」即{ann['meaning']}。",
            "source": "auto_generated",
        }
        questions.append(q)
    return questions

def main():
    os.makedirs("assets/seed_data", exist_ok=True)
    all_data = []

    for i, slug in enumerate(ESSAYS):
        print(f"[{i+1}/16] Scraping: {slug}")
        try:
            essay = scrape_essay(slug)
            essay['id'] = i + 1
            essay['questions'] = generate_questions(essay)
            all_data.append(essay)

            filename = f"assets/seed_data/essay_{i+1:02d}.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(essay, f, ensure_ascii=False, indent=2)
            print(f"  -> Saved {filename} ({len(essay['annotations'])} annotations)")
        except Exception as e:
            print(f"  -> ERROR: {e}")

    # Save combined
    with open("assets/seed_data/all_essays.json", 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f"\nDone! {len(all_data)} essays scraped.")

if __name__ == "__main__":
    main()
