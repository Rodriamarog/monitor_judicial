#!/usr/bin/env python3
"""
Script to test SCJN API pagination parameters
"""
import requests
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

BASE_URL = "https://bicentenario.scjn.gob.mx/repositorio-scjn"
IDS_ENDPOINT = f"{BASE_URL}/api/v1/tesis/ids"

def test_params(name, params):
    """Test a specific set of parameters"""
    logger.info(f"\n--- Testing: {name} ---")
    logger.info(f"Params: {params}")
    
    try:
        response = requests.get(IDS_ENDPOINT, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if isinstance(data, list):
            count = len(data)
            first_id = data[0] if count > 0 else "None"
            last_id = data[-1] if count > 0 else "None"
            logger.info(f"Result: Success. Got {count} items.")
            logger.info(f"First ID: {first_id}")
            logger.info(f"Last ID:  {last_id}")
            return data
        else:
            logger.info(f"Result: Unexpected format (not a list): {type(data)}")
            return None
            
    except Exception as e:
        logger.error(f"Result: Failed - {e}")
        return None

def main():
    logger.info("Starting Pagination Investigation...")
    
    # 1. Baseline: Page 1
    page1 = test_params("Baseline (Page 1)", {'page': 1})
    if not page1:
        logger.error("Could not get baseline. Aborting.")
        return

    # 2. Page 2
    page2 = test_params("Page 2", {'page': 2})
    
    if page2:
        # Compare
        if page1 == page2:
            logger.warning("⚠️  Page 1 and Page 2 are IDENTICAL. 'page' parameter might be ignored.")
        else:
            # Check for overlap
            set1 = set(page1)
            set2 = set(page2)
            overlap = set1.intersection(set2)
            if overlap:
                logger.warning(f"⚠️  Found {len(overlap)} overlapping IDs between page 1 and 2.")
            else:
                logger.info("✅ Page 1 and Page 2 are completely different. 'page' parameter WORKS.")

    # 3. Limit / Size tests
    # Try to get 200 items
    test_params("Limit=200", {'limit': 200})
    test_params("Size=200", {'size': 200})
    test_params("PageSize=200", {'pageSize': 200})
    test_params("Count=200", {'count': 200})
    
    # 4. Offset tests
    # Try to skip first 100
    offset_res = test_params("Offset=100", {'offset': 100})
    if offset_res and page1:
        if offset_res == page1:
             logger.warning("⚠️  Offset=100 returned same as Page 1. 'offset' parameter might be ignored.")
        elif offset_res == page2:
             logger.info("✅ Offset=100 returned same as Page 2. 'offset' parameter WORKS (equivalent to page=2).")
        else:
             logger.info("ℹ️  Offset=100 returned unique data.")

if __name__ == "__main__":
    main()
