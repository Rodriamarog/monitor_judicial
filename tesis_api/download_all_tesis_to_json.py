#!/usr/bin/env python3
"""
Mass SCJN Tesis Downloader - Downloads all 310,895 tesis to JSON files
Downloads to chunked JSON files with checkpointing and retry logic
"""

import asyncio
import aiohttp
import aiofiles
import json
import time
import logging
from pathlib import Path
from typing import List, Dict, Optional, Set
from collections import deque
from datetime import datetime
import argparse
from tqdm.asyncio import tqdm

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter for API requests"""

    def __init__(self, rate: int = 10):
        """
        Initialize rate limiter

        Args:
            rate: Maximum requests per second
        """
        self.rate = rate
        self.semaphore = asyncio.Semaphore(rate)
        self.min_interval = 1.0 / rate
        self.last_requests = deque(maxlen=rate)
        self.current_rate = rate
        self.reduced_until = None

    async def acquire(self):
        """Acquire permission to make a request with rate limiting"""
        # Check if we're in reduced rate period
        if self.reduced_until and time.time() < self.reduced_until:
            effective_rate = max(1, self.rate // 2)
        else:
            effective_rate = self.rate
            self.reduced_until = None

        async with self.semaphore:
            now = time.time()

            # Clean old requests
            while self.last_requests and now - self.last_requests[0] > 1.0:
                self.last_requests.popleft()

            # If we've made too many requests in the last second, wait
            if len(self.last_requests) >= effective_rate:
                oldest = self.last_requests[0]
                elapsed = now - oldest
                if elapsed < 1.0:
                    await asyncio.sleep(1.0 - elapsed)

            self.last_requests.append(time.time())

    def reduce_rate(self, duration: int = 300):
        """
        Reduce rate for a period (e.g., after 429 errors)

        Args:
            duration: Seconds to reduce rate for
        """
        self.reduced_until = time.time() + duration
        logger.warning(f"Rate reduced to {self.rate // 2} req/sec for {duration}s")


class Checkpoint:
    """Manages download checkpoint state"""

    def __init__(self, checkpoint_file: Path):
        self.checkpoint_file = checkpoint_file
        self.data = {
            'last_completed_index': -1,
            'last_completed_id': None,
            'total_processed': 0,
            'successful': 0,
            'failed': 0,
            'failed_ids': [],
            'current_batch_file': None,
            'completed_batches': [],
            'timestamp': None,
            'resume_from': 0
        }
        self.load()

    def load(self):
        """Load checkpoint from file if it exists"""
        if self.checkpoint_file.exists():
            try:
                with open(self.checkpoint_file, 'r') as f:
                    self.data = json.load(f)
                logger.info(f"Loaded checkpoint: {self.data['total_processed']:,} already processed")
            except Exception as e:
                logger.warning(f"Could not load checkpoint: {e}")

    async def save(self):
        """Save checkpoint to file atomically"""
        self.data['timestamp'] = datetime.now().isoformat()

        # Write to temp file first, then rename (atomic operation)
        temp_file = self.checkpoint_file.with_suffix('.tmp')
        try:
            async with aiofiles.open(temp_file, 'w') as f:
                await f.write(json.dumps(self.data, indent=2))

            # Atomic rename
            temp_file.replace(self.checkpoint_file)
        except Exception as e:
            logger.error(f"Error saving checkpoint: {e}")

    def update(self, **kwargs):
        """Update checkpoint data"""
        self.data.update(kwargs)

    def archive_as_complete(self):
        """Archive checkpoint as final complete version"""
        if self.checkpoint_file.exists():
            archive_file = self.checkpoint_file.with_name('download_checkpoint_COMPLETE.json')
            self.checkpoint_file.rename(archive_file)
            logger.info(f"Checkpoint archived to: {archive_file}")


class MassTesisDownloader:
    """Downloads all tesis from SCJN API to JSON files"""

    BASE_URL = "https://bicentenario.scjn.gob.mx/repositorio-scjn"
    BATCH_SIZE = 10000  # Tesis per JSON file
    CHECKPOINT_INTERVAL = 5000  # Save checkpoint every N documents

    def __init__(
        self,
        ids_file: Path,
        output_dir: Path,
        checkpoint_file: Path,
        rate: int = 10,
        max_concurrent: int = 10
    ):
        self.ids_file = ids_file
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.rate_limiter = RateLimiter(rate=rate)
        self.checkpoint = Checkpoint(checkpoint_file)
        self.max_concurrent = max_concurrent

        # Statistics
        self.stats = {
            'start_time': None,
            'consecutive_failures': 0,
            'total_retries': 0,
            'rate_limit_hits': 0
        }

        # Load IDs
        with open(ids_file, 'r') as f:
            self.all_ids = json.load(f)

        logger.info(f"Loaded {len(self.all_ids):,} tesis IDs")

    async def download_tesis(
        self,
        session: aiohttp.ClientSession,
        tesis_id: str,
        retries: int = 3
    ) -> Dict:
        """
        Download a single tesis with retry logic

        Args:
            session: aiohttp session
            tesis_id: Tesis ID to download
            retries: Number of retry attempts

        Returns:
            Dict with 'success', 'data'/'error', and 'id'
        """
        url = f"{self.BASE_URL}/api/v1/tesis/{tesis_id}"

        for attempt in range(retries):
            try:
                await self.rate_limiter.acquire()

                async with session.get(url, timeout=30) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.stats['consecutive_failures'] = 0
                        return {'success': True, 'data': data, 'id': tesis_id}

                    elif response.status == 429:
                        # Rate limited
                        self.stats['rate_limit_hits'] += 1
                        self.rate_limiter.reduce_rate(duration=60)
                        logger.warning(f"Rate limited on {tesis_id}, waiting 60s...")
                        await asyncio.sleep(60)
                        self.stats['total_retries'] += 1
                        continue

                    elif response.status >= 500:
                        # Server error, retry with backoff
                        if attempt < retries - 1:
                            wait = 2 ** attempt
                            logger.warning(f"Server error {response.status} for {tesis_id}, retrying in {wait}s...")
                            await asyncio.sleep(wait)
                            self.stats['total_retries'] += 1
                            continue
                        else:
                            return {'success': False, 'id': tesis_id, 'error': f'HTTP {response.status}'}

                    elif response.status == 404:
                        # Not found - possibly deleted tesis
                        logger.debug(f"Tesis {tesis_id} not found (404)")
                        return {'success': False, 'id': tesis_id, 'error': 'Not found (404)'}

                    else:
                        # Other client error
                        return {'success': False, 'id': tesis_id, 'error': f'HTTP {response.status}'}

            except asyncio.TimeoutError:
                if attempt < retries - 1:
                    wait = 2 ** attempt
                    logger.warning(f"Timeout for {tesis_id}, retrying in {wait}s...")
                    await asyncio.sleep(wait)
                    self.stats['total_retries'] += 1
                else:
                    return {'success': False, 'id': tesis_id, 'error': 'Timeout'}

            except Exception as e:
                logger.error(f"Error downloading {tesis_id}: {e}")
                return {'success': False, 'id': tesis_id, 'error': str(e)}

        return {'success': False, 'id': tesis_id, 'error': 'Max retries exceeded'}

    async def process_batch(
        self,
        session: aiohttp.ClientSession,
        batch_start: int,
        batch_end: int,
        pbar: tqdm
    ) -> Dict:
        """
        Process a batch of tesis IDs

        Args:
            session: aiohttp session
            batch_start: Starting index
            batch_end: Ending index (exclusive)
            pbar: Progress bar

        Returns:
            Dict with results statistics
        """
        batch_ids = self.all_ids[batch_start:batch_end]

        # Download concurrently with semaphore
        tasks = []
        for tesis_id in batch_ids:
            task = self.download_tesis(session, tesis_id)
            tasks.append(task)

        results = []
        for coro in asyncio.as_completed(tasks):
            result = await coro
            results.append(result)
            pbar.update(1)

            # Circuit breaker check
            if not result['success']:
                self.stats['consecutive_failures'] += 1
                if self.stats['consecutive_failures'] >= 50:
                    logger.error("Circuit breaker triggered: 50 consecutive failures")
                    logger.error("Pausing for 5 minutes...")
                    await asyncio.sleep(300)
                    self.stats['consecutive_failures'] = 0

        # Separate successes and failures
        successful = [r['data'] for r in results if r['success']]
        failed_ids = [r['id'] for r in results if not r['success']]

        # Write batch file
        filename = f"tesis_batch_{batch_start:06d}_{batch_end:06d}.json"
        filepath = self.output_dir / filename

        async with aiofiles.open(filepath, 'w', encoding='utf-8') as f:
            content = json.dumps(successful, indent=2, ensure_ascii=False)
            await f.write(content)

        logger.info(f"Wrote batch: {filename} ({len(successful):,} tesis)")

        return {
            'filename': filename,
            'filepath': str(filepath),
            'successful': len(successful),
            'failed': failed_ids,
            'batch_start': batch_start,
            'batch_end': batch_end
        }

    async def download_all(self, limit: Optional[int] = None):
        """
        Download all tesis to JSON files

        Args:
            limit: Optional limit for testing (downloads first N tesis)
        """
        self.stats['start_time'] = time.time()

        # Determine range
        start_index = self.checkpoint.data['resume_from']
        total_ids = limit if limit else len(self.all_ids)

        if start_index > 0:
            logger.info(f"Resuming from index {start_index:,}")
            logger.info(f"Already completed: {self.checkpoint.data['successful']:,} successful, {self.checkpoint.data['failed']:,} failed")

        logger.info("=" * 80)
        logger.info("MASS TESIS DOWNLOAD TO JSON")
        logger.info(f"Target: {total_ids:,} documents")
        logger.info(f"Rate: {self.rate_limiter.rate} req/sec")
        logger.info(f"Output: {self.output_dir}")
        logger.info(f"Batch size: {self.BATCH_SIZE:,} tesis per file")
        logger.info("=" * 80)

        # Create aiohttp session
        connector = aiohttp.TCPConnector(limit=self.max_concurrent)
        timeout = aiohttp.ClientTimeout(total=60)

        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            # Process in batches
            with tqdm(total=total_ids, initial=start_index, desc="Downloading") as pbar:
                current_index = start_index

                while current_index < total_ids:
                    # Determine batch boundaries
                    batch_start = current_index
                    batch_end = min(batch_start + self.BATCH_SIZE, total_ids)

                    # Process batch
                    result = await self.process_batch(session, batch_start, batch_end, pbar)

                    # Update checkpoint
                    self.checkpoint.update(
                        last_completed_index=batch_end - 1,
                        last_completed_id=self.all_ids[batch_end - 1] if batch_end <= len(self.all_ids) else None,
                        total_processed=batch_end,
                        successful=self.checkpoint.data['successful'] + result['successful'],
                        failed=self.checkpoint.data['failed'] + len(result['failed']),
                        current_batch_file=result['filename'],
                        resume_from=batch_end
                    )

                    # Add failed IDs to checkpoint
                    self.checkpoint.data['failed_ids'].extend(result['failed'])

                    # Add completed batch to list
                    if result['filepath'] not in self.checkpoint.data['completed_batches']:
                        self.checkpoint.data['completed_batches'].append(result['filepath'])

                    # Save checkpoint periodically
                    if batch_end % self.CHECKPOINT_INTERVAL < self.BATCH_SIZE:
                        await self.checkpoint.save()
                        logger.info(f"Checkpoint saved: {batch_end:,}/{total_ids:,} complete")

                    current_index = batch_end

        # Final checkpoint save
        await self.checkpoint.save()

        # Print summary
        self.print_summary(total_ids)

        # Archive checkpoint
        self.checkpoint.archive_as_complete()

    def print_summary(self, total_ids: int):
        """Print download summary"""
        elapsed = time.time() - self.stats['start_time']
        hours = elapsed / 3600

        successful = self.checkpoint.data['successful']
        failed = self.checkpoint.data['failed']
        success_rate = (successful / total_ids * 100) if total_ids > 0 else 0
        avg_rate = total_ids / elapsed if elapsed > 0 else 0

        print("\n" + "=" * 80)
        print("DOWNLOAD COMPLETE!")
        print("=" * 80)
        print(f"Total downloaded: {successful:,}/{total_ids:,} ({success_rate:.2f}%)")
        print(f"Failed: {failed:,} tesis")
        print(f"Time elapsed: {hours:.1f} hours")
        print(f"Average rate: {avg_rate:.1f} req/sec")
        print(f"Total retries: {self.stats['total_retries']:,}")
        print(f"Rate limit hits: {self.stats['rate_limit_hits']}")
        print()
        print(f"Output files ({len(self.checkpoint.data['completed_batches'])} batches):")
        for batch_file in self.checkpoint.data['completed_batches'][:5]:
            print(f"  {Path(batch_file).name}")
        if len(self.checkpoint.data['completed_batches']) > 5:
            print(f"  ... and {len(self.checkpoint.data['completed_batches']) - 5} more")
        print()
        print(f"Checkpoint: {self.checkpoint.checkpoint_file.parent / 'download_checkpoint_COMPLETE.json'}")

        if failed > 0:
            print(f"\n⚠️  {failed:,} tesis failed to download")
            print(f"   Failed IDs saved in checkpoint file")
            print(f"   You can retry with: --retry-failed")

        print("\n" + "=" * 80)
        print("Next steps:")
        print("  1. Review JSON files for data quality")
        print("  2. Run clean_tesis_data.py (to be created)")
        print("  3. Load to database with load_to_database.py")
        print("=" * 80)


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Download all SCJN tesis to JSON files')
    parser.add_argument('--limit', type=int, help='Limit number of tesis (for testing)')
    parser.add_argument('--rate', type=int, default=10, help='Requests per second (default: 10)')
    parser.add_argument('--retry-failed', action='store_true', help='Retry only failed IDs from checkpoint')
    args = parser.parse_args()

    # Paths
    base_dir = Path(__file__).parent
    ids_file = base_dir / 'data' / 'all_ids.json'
    output_dir = base_dir / 'data' / 'raw'
    checkpoint_file = base_dir / 'data' / 'download_checkpoint.json'

    # Verify IDs file exists
    if not ids_file.exists():
        print(f"❌ IDs file not found: {ids_file}")
        print(f"   Run get_all_ids.py first to download the ID list")
        return

    # Create downloader
    downloader = MassTesisDownloader(
        ids_file=ids_file,
        output_dir=output_dir,
        checkpoint_file=checkpoint_file,
        rate=args.rate
    )

    # Handle retry-failed mode
    if args.retry_failed:
        failed_ids = downloader.checkpoint.data.get('failed_ids', [])
        if not failed_ids:
            print("No failed IDs to retry")
            return

        print(f"Retrying {len(failed_ids):,} failed IDs...")
        downloader.all_ids = failed_ids
        downloader.checkpoint.update(resume_from=0, failed_ids=[])

    # Run download
    try:
        await downloader.download_all(limit=args.limit)
    except KeyboardInterrupt:
        print("\n\n⚠️  Download interrupted by user")
        print("Progress saved. Re-run to resume from checkpoint.")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
