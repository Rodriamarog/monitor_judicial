#!/usr/bin/env python3
"""
Script to test page=0
"""
import requests
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

BASE_URL = "https://bicentenario.scjn.gob.mx/repositorio-scjn"
IDS_ENDPOINT = f"{BASE_URL}/api/v1/tesis/ids"

def test_page(page_num):
    logger.info(f"Testing page={page_num}...")
    try:
        response = requests.get(IDS_ENDPOINT, params={'page': page_num}, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data:
            logger.info(f"Page {page_num}: {len(data)} items. First: {data[0]}, Last: {data[-1]}")
            return data
        return []
    except Exception as e:
        logger.error(f"Page {page_num} failed: {e}")
        return None

def main():
    # Test Page 0
    p0 = test_page(0)
    
    # Test Page 1
    p1 = test_page(1)
    
    if p0 and p1:
        if p0 == p1:
            logger.info("Result: Page 0 and Page 1 are IDENTICAL. (1-based indexing, 0 treated as 1)")
        else:
            logger.info("Result: Page 0 and Page 1 are DIFFERENT. (0-based indexing)")

if __name__ == "__main__":
    main()
