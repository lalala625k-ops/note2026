# ==============================================================================
# RULE ID: P-003 | YouTube
# STATUS: 🔒 PROTECTED (LOCKED - DO NOT MODIFY WITHOUT EXPLICIT USER INSTRUCTION)
# APPROVED: 2026-09-21 (User Confirmed OK)
# ==============================================================================

import re
from typing import Optional
import requests
from bs4 import BeautifulSoup
from backend.services.scrapers.base import BaseScraper, ScrapedMetadata
from backend.services.screenshot_service import detect_local_proxy

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

class YoutubeScraper(BaseScraper):
    name = "youtube"
    status = "PROTECTED"

    def can_handle(self, url: str) -> bool:
        lower = url.lower()
        return "youtube.com" in lower or "youtu.be" in lower

    def scrape(self, url: str) -> Optional[ScrapedMetadata]:
        proxy = detect_local_proxy()
        proxies = {"http": proxy, "https": proxy} if proxy else None

        # 1. Extract YouTube Video ID
        vid_match = re.search(r'(?:v=|youtu\.be/|shorts/|embed/)([a-zA-Z0-9_-]{11})', url)
        video_id = vid_match.group(1) if vid_match else None

        title = ""
        description = ""
        image = ""

        if video_id:
            # Optimal HD thumbnail: maxresdefault -> hqdefault fallback
            hd_img = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
            try:
                r_img = requests.head(hd_img, headers=HEADERS, proxies=proxies, timeout=4)
                if r_img.status_code == 200:
                    image = hd_img
                else:
                    image = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
            except Exception:
                image = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

            # Fetch metadata via official oEmbed API (fast, reliable, no rate-limiting)
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            try:
                r_oembed = requests.get(oembed_url, headers=HEADERS, proxies=proxies, timeout=5)
                if r_oembed.status_code == 200:
                    data = r_oembed.json()
                    title = data.get("title", "")
                    author = data.get("author_name", "")
                    if author:
                        description = f"UP主 / 频道: {author}"
            except Exception as e:
                print(f"[Protected YouTube] oEmbed error: {e}")

        # 2. Fallback to HTML OpenGraph if title is missing
        if not title:
            try:
                r = requests.get(url, headers=HEADERS, proxies=proxies, timeout=6)
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, "html.parser")
                    og_title = soup.find("meta", property="og:title")
                    og_desc = soup.find("meta", property="og:description")
                    og_img = soup.find("meta", property="og:image")
                    if og_title and og_title.get("content"):
                        title = og_title["content"].strip()
                    if og_desc and og_desc.get("content"):
                        description = og_desc["content"].strip()
                    if not image and og_img and og_img.get("content"):
                        image = og_img["content"].strip()
            except Exception as e:
                print(f"[Protected YouTube] HTML fallback error: {e}")

        if title or image:
            return {
                "title": title or "YouTube 视频",
                "description": description,
                "image": image,
                "favicon": "https://www.youtube.com/s/desktop/b0f1b2cc/img/favicon.ico",
                "url": url,
            }

        return None
