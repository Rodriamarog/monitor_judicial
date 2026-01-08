#!/usr/bin/env python3
"""
SCJN ID Downloader - Descarga masiva de IDs de tesis
"""

import requests
import json
import time
import logging
from pathlib import Path
from typing import List, Set

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

class IDDownloader:
    BASE_URL = "https://bicentenario.scjn.gob.mx/repositorio-scjn"
    IDS_ENDPOINT = f"{BASE_URL}/api/v1/tesis/ids"
    
    def __init__(self, output_dir: str = "./data"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'LegalTech-Research/1.0',
            'Accept': 'application/json'
        })
        
    def get_ids_page(self, page: int, size: int = 200, retries: int = 3) -> List[str]:
        """Obtiene una página de IDs con reintentos"""
        params = {
            'page': page,
            'size': size
        }

        for attempt in range(retries):
            try:
                response = self.session.get(self.IDS_ENDPOINT, params=params, timeout=30)
                response.raise_for_status()
                data = response.json()

                if isinstance(data, list):
                    return data
                return []

            except requests.exceptions.Timeout as e:
                if attempt < retries - 1:
                    wait_time = (attempt + 1) * 2  # Exponential backoff: 2s, 4s, 6s
                    logger.warning(f"Timeout on page {page}, retrying in {wait_time}s... (attempt {attempt + 1}/{retries})")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Failed to fetch page {page} after {retries} attempts: {e}")
                    return []
            except Exception as e:
                logger.error(f"Error fetching page {page}: {e}")
                if attempt < retries - 1:
                    time.sleep(2)
                else:
                    return []

        return []

    def download_ids(self, limit: int = None, batch_size: int = 500, expected_total: int = None):
        """
        Descarga IDs paginados con manejo robusto de errores

        Args:
            limit: Total máximo de IDs a descargar (None para todos)
            batch_size: Tamaño de página (max recomendado 200)
            expected_total: Total esperado de IDs (para tracking de progreso)
        """
        all_ids: List[str] = []
        seen_ids: Set[str] = set()
        page = 0
        consecutive_empty = 0
        max_consecutive_empty = 5  # Stop after 5 consecutive empty pages

        logger.info(f"Starting ID download")
        logger.info(f"  Target: {limit if limit else 'ALL'}")
        if expected_total:
            logger.info(f"  Expected total: {expected_total:,}")
            logger.info(f"  Expected pages: ~{(expected_total // batch_size) + 1}")

        while True:
            # Check limit
            if limit and len(all_ids) >= limit:
                logger.info("Reached requested limit.")
                break

            # Check if we've likely finished
            if expected_total and len(all_ids) >= expected_total:
                logger.info(f"Reached expected total of {expected_total:,} IDs.")
                break

            # Fetch page
            ids = self.get_ids_page(page, size=batch_size)

            if not ids:
                consecutive_empty += 1
                logger.warning(f"Page {page} returned empty. Consecutive empty pages: {consecutive_empty}/{max_consecutive_empty}")

                if consecutive_empty >= max_consecutive_empty:
                    logger.info(f"Stopping after {max_consecutive_empty} consecutive empty pages.")
                    break

                # Continue to next page anyway (might be temporary issue)
                page += 1
                time.sleep(1)  # Longer delay after empty page
                continue

            # Reset consecutive empty counter on success
            consecutive_empty = 0

            # Filter duplicates (just in case)
            new_ids = [x for x in ids if x not in seen_ids]

            if not new_ids and len(ids) > 0:
                logger.warning(f"Page {page} returned only duplicates.")
                page += 1
                time.sleep(0.2)
                continue

            # Add to collection
            for tid in new_ids:
                seen_ids.add(tid)
                all_ids.append(tid)

            # Progress
            progress_pct = (len(all_ids) / expected_total * 100) if expected_total else 0
            if expected_total:
                logger.info(f"Page {page}: +{len(new_ids)} IDs. Total: {len(all_ids):,}/{expected_total:,} ({progress_pct:.1f}%)")
            else:
                logger.info(f"Page {page}: +{len(new_ids)} IDs. Total: {len(all_ids):,}")

            # Prepare next
            page += 1
            time.sleep(0.3)  # Polite delay (slightly increased)

        return all_ids

    def save_ids(self, ids: List[str], filename: str = "all_ids.json"):
        output_file = self.output_dir / filename
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(ids, f, indent=2)
        logger.info(f"💾 Saved {len(ids)} IDs to {output_file}")

def main():
    downloader = IDDownloader()

    # Download ALL tesis IDs (no limit)
    TARGET_LIMIT = None  # None = download all available IDs
    EXPECTED_TOTAL = 310895  # Expected total from SCJN API

    print("="*60)
    print(f"DOWNLOADING ALL SCJN THESIS IDs")
    print(f"Expected total: {EXPECTED_TOTAL:,}")
    print("="*60)

    ids = downloader.download_ids(
        limit=TARGET_LIMIT,
        batch_size=500,  # Larger batches = fewer requests
        expected_total=EXPECTED_TOTAL
    )
    
    if ids:
        downloader.save_ids(ids)
        print(f"\n✅ Retrieved {len(ids):,} unique tesis IDs.")
        print(f"📁 Saved to: data/all_ids.json")
        print(f"\n📊 STATISTICS:")
        print(f"   Total IDs: {len(ids):,}")
        print(f"   Expected: {EXPECTED_TOTAL:,}")
        print(f"   Coverage: {(len(ids) / EXPECTED_TOTAL * 100):.2f}%")
        print(f"   Pages fetched: {(len(ids) // 500) + 1}")

        if len(ids) >= EXPECTED_TOTAL * 0.99:  # 99% or more
            print(f"\n✅ SUCCESS! Got all (or nearly all) expected IDs!")
        elif len(ids) >= EXPECTED_TOTAL * 0.90:  # 90% or more
            print(f"\n⚠️  WARNING: Got {(len(ids) / EXPECTED_TOTAL * 100):.1f}% of expected IDs")
            print(f"   Missing: {EXPECTED_TOTAL - len(ids):,} IDs")
        else:
            print(f"\n❌ INCOMPLETE: Only got {(len(ids) / EXPECTED_TOTAL * 100):.1f}% of expected IDs")
            print(f"   Missing: {EXPECTED_TOTAL - len(ids):,} IDs")
            print(f"   Consider running again or investigating API issues")

        print(f"\n💡 Next step: Run the full download script to fetch all tesis content")
    else:
        print("\n❌ Failed to retrieve IDs.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️ Interrupted by user")
