# ==============================================================================
# RULE ID: P-004 | Pinterest
# STATUS: 🔒 PROTECTED (LOCKED - DO NOT MODIFY WITHOUT EXPLICIT USER INSTRUCTION)
# APPROVED: 2026-09-21 (User Confirmed OK)
# ==============================================================================

from typing import Optional
import requests
from bs4 import BeautifulSoup
from backend.services.scrapers.base import BaseScraper, ScrapedMetadata
from backend.services.screenshot_service import detect_local_proxy

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

class PinterestScraper(BaseScraper):
    name = "pinterest"
    status = "PROTECTED"

    def can_handle(self, url: str) -> bool:
        lower = url.lower()
        return "pinterest.com" in lower or "pin.it" in lower

    def scrape(self, url: str) -> Optional[ScrapedMetadata]:
        proxy = detect_local_proxy()
        proxies = {"http": proxy, "https": proxy} if proxy else None

        try:
            r = requests.get(url, headers=HEADERS, proxies=proxies, timeout=8, allow_redirects=True)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                og_img = soup.find("meta", property="og:image")
                og_title = soup.find("meta", property="og:title")
                og_desc = soup.find("meta", property="og:description")

                title = og_title.get("content", "").strip() if og_title else ""
                image = og_img.get("content", "").strip() if og_img else ""
                desc = og_desc.get("content", "").strip() if og_desc else ""

                # Pinterest High-Res Upgrade:
                # If image uses /736x/ preview, verify if /originals/ source is accessible
                if image and "/736x/" in image:
                    orig_image = image.replace("/736x/", "/originals/")
                    try:
                        r_head = requests.head(orig_image, headers=HEADERS, proxies=proxies, timeout=3)
                        if r_head.status_code == 200:
                            image = orig_image
                    except Exception:
                        pass

                return {
                    "title": title or "Pinterest Pin",
                    "description": desc,
                    "image": image,
                    "favicon": "https://s.pinimg.com/webapp/logo_transparent_144x144-3da7a67b.png",
                    "url": r.url or url,
                }
        except Exception as e:
            print(f"[Protected Pinterest] Scraping error: {e}")

        return None
