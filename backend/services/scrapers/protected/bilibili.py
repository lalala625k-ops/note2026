# ==============================================================================
# RULE ID: P-001 | Bilibili (哔哩哔哩)
# STATUS: 🔒 PROTECTED (LOCKED - DO NOT MODIFY WITHOUT EXPLICIT USER INSTRUCTION)
# APPROVED: 2026-09-20 (User Confirmed OK)
# ==============================================================================

import re
from typing import Optional
import requests
from backend.services.scrapers.base import BaseScraper, ScrapedMetadata

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

class BilibiliScraper(BaseScraper):
    name = "bilibili"
    status = "PROTECTED"

    def can_handle(self, url: str) -> bool:
        lower = url.lower()
        return "bilibili.com" in lower or "b23.tv" in lower

    def scrape(self, url: str) -> Optional[ScrapedMetadata]:
        bv_match = re.search(r'(BV[a-zA-Z0-9]+)', url, re.IGNORECASE)
        av_match = re.search(r'av(\d+)', url, re.IGNORECASE)
        bvid = bv_match.group(1) if bv_match else None
        aid = av_match.group(1) if av_match else None

        if 'b23.tv' in url:
            try:
                r = requests.head(url, allow_redirects=True, timeout=5)
                url = r.url
                bv_match = re.search(r'(BV[a-zA-Z0-9]+)', url, re.IGNORECASE)
                if bv_match:
                    bvid = bv_match.group(1)
            except Exception:
                pass

        # 1. Video metadata via official web API
        if bvid or aid:
            api_url = f"https://api.bilibili.com/x/web-interface/view?{'bvid=' + bvid if bvid else 'aid=' + aid}"
            try:
                r = requests.get(api_url, headers={**HEADERS, "Referer": "https://www.bilibili.com"}, timeout=6)
                data = r.json()
                if data.get("code") == 0:
                    d = data.get("data", {})
                    pic = d.get("pic", "")
                    if pic.startswith("//"):
                        pic = "https:" + pic
                    return {
                        "title": d.get("title", ""),
                        "description": d.get("desc", ""),
                        "image": pic,
                        "favicon": "https://www.bilibili.com/favicon.ico",
                        "url": url,
                    }
            except Exception as e:
                print(f"[Protected Bilibili] Video API error: {e}")

        # 2. Creator space metadata via masterpiece API
        space_match = re.search(r'space\.bilibili\.com/(\d+)', url)
        if space_match:
            mid = space_match.group(1)
            try:
                r = requests.get(
                    f"https://api.bilibili.com/x/space/masterpiece?vmid={mid}",
                    headers={**HEADERS, "Referer": "https://space.bilibili.com"},
                    timeout=6
                )
                data = r.json()
                if data.get("code") == 0 and data.get("data"):
                    items = data.get("data", [])
                    if items:
                        first = items[0]
                        pic = first.get("pic", "")
                        if pic.startswith("//"):
                            pic = "https:" + pic
                        owner = first.get("owner", {})
                        return {
                            "title": f"{owner.get('name', 'UP主')} 的个人空间 - 哔哩哔哩",
                            "description": first.get("desc", ""),
                            "image": pic,
                            "favicon": "https://www.bilibili.com/favicon.ico",
                            "url": url,
                        }
            except Exception as e:
                print(f"[Protected Bilibili] Space API error: {e}")

        return None
