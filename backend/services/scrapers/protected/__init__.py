# ==============================================================================
# 🔒 PROTECTED SCRAPERS REGISTRY (锁定区)
# Sites verified & approved OK by the user:
#   1. Bilibili (P-001)
#   2. Instagram (P-002)
#   3. YouTube (P-003)
#   4. Pinterest (P-004)
# DO NOT MODIFY without explicit user instruction.
# ==============================================================================

from backend.services.scrapers.protected.bilibili import BilibiliScraper
from backend.services.scrapers.protected.instagram import InstagramScraper
from backend.services.scrapers.protected.youtube import YoutubeScraper
from backend.services.scrapers.protected.pinterest import PinterestScraper

PROTECTED_SCRAPERS = [
    BilibiliScraper(),
    InstagramScraper(),
    YoutubeScraper(),
    PinterestScraper(),
]

__all__ = [
    "PROTECTED_SCRAPERS",
    "BilibiliScraper",
    "InstagramScraper",
    "YoutubeScraper",
    "PinterestScraper",
]
