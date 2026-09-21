"""
Legacy adapter and facade for scraper_service.
Delegates to the modular backend.services.scrapers package:
  - 🔒 Protected Library (backend.services.scrapers.protected)
  - ⏳ Experimental Library (backend.services.scrapers.experimental)
  - 🌐 Generic Fallback (backend.services.scrapers.fallback)
"""

from backend.services.scrapers import scrape_url_metadata, scraper_registry
from backend.services.screenshot_service import capture_screenshot_fallback, is_auth_url

__all__ = [
    "scrape_url_metadata",
    "scraper_registry",
    "capture_screenshot_fallback",
    "is_auth_url",
]
