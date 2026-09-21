from abc import ABC, abstractmethod
from typing import Dict, Optional, TypedDict

class ScrapedMetadata(TypedDict, total=False):
    title: str
    description: str
    image: str
    favicon: str
    url: str

class BaseScraper(ABC):
    """
    Abstract base class for all link and image scrapers.
    Protected parsers inherit from this and define their matching logic and extraction flow.
    """
    # Unique identifier (e.g. 'bilibili', 'instagram', 'feishu')
    name: str = "base"
    
    # Status: 'PROTECTED' (locked, verified OK by user) or 'EXPERIMENTAL'
    status: str = "EXPERIMENTAL"

    @abstractmethod
    def can_handle(self, url: str) -> bool:
        """Return True if this scraper should handle the given URL."""
        pass

    @abstractmethod
    def scrape(self, url: str) -> Optional[ScrapedMetadata]:
        """Scrape metadata and cover image for the given URL. Return None if extraction fails."""
        pass
