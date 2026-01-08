#!/usr/bin/env python3
"""
Checkpoint Manager for Embedding Pipeline
Provides resume capability by saving progress to disk
"""
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class CheckpointManager:
    """Manages progress checkpoints for resume capability"""

    def __init__(self, checkpoint_file: str = "embedding_progress.json"):
        """
        Initialize checkpoint manager

        Args:
            checkpoint_file: Path to checkpoint file
        """
        self.checkpoint_file = Path(checkpoint_file)
        self.state = self.load_checkpoint()

        if self.state['processed_tesis']:
            logger.info(f"Loaded checkpoint with {len(self.state['processed_tesis']):,} processed tesis")

    def load_checkpoint(self) -> Dict:
        """
        Load existing checkpoint or create new one

        Returns:
            Dict with checkpoint state
        """
        if self.checkpoint_file.exists():
            try:
                with open(self.checkpoint_file, 'r') as f:
                    state = json.load(f)
                    logger.info(f"Loaded checkpoint from {self.checkpoint_file}")
                    return state
            except Exception as e:
                logger.error(f"Error loading checkpoint: {e}")
                logger.info("Starting with fresh checkpoint")

        # Return fresh checkpoint
        return {
            'processed_tesis': [],  # IDs of successfully processed tesis
            'failed_tesis': [],  # List of {id, error, timestamp}
            'last_batch_id': None,
            'total_chunks': 0,
            'total_tokens': 0,
            'actual_cost': 0.0,
            'start_time': None,
            'last_update': None,
            'version': '1.0'
        }

    def save_checkpoint(self):
        """Save current state to disk"""
        try:
            self.state['last_update'] = datetime.now().isoformat()

            # Write to temporary file first, then rename (atomic operation)
            temp_file = self.checkpoint_file.with_suffix('.tmp')
            with open(temp_file, 'w') as f:
                json.dump(self.state, f, indent=2)

            # Atomic rename
            temp_file.replace(self.checkpoint_file)

        except Exception as e:
            logger.error(f"Error saving checkpoint: {e}")

    def mark_processed(self, tesis_id: int, chunks: int, tokens: int):
        """
        Mark tesis as successfully processed

        Args:
            tesis_id: Tesis ID
            chunks: Number of chunks created
            tokens: Number of tokens processed
        """
        self.state['processed_tesis'].append(tesis_id)
        self.state['total_chunks'] += chunks
        self.state['total_tokens'] += tokens

        # Calculate actual cost (OpenAI text-embedding-3-small: $0.020 per 1M tokens)
        self.state['actual_cost'] = (self.state['total_tokens'] / 1_000_000) * 0.020

        # Set start time if not set
        if not self.state['start_time']:
            self.state['start_time'] = datetime.now().isoformat()

    def mark_failed(self, tesis_id: int, error: str):
        """
        Mark tesis as failed

        Args:
            tesis_id: Tesis ID
            error: Error message
        """
        self.state['failed_tesis'].append({
            'id': tesis_id,
            'error': str(error),
            'timestamp': datetime.now().isoformat()
        })

    def is_processed(self, tesis_id: int) -> bool:
        """
        Check if tesis already processed

        Args:
            tesis_id: Tesis ID

        Returns:
            True if already processed
        """
        return tesis_id in self.state['processed_tesis']

    def get_processed_count(self) -> int:
        """Get number of processed tesis"""
        return len(self.state['processed_tesis'])

    def get_failed_count(self) -> int:
        """Get number of failed tesis"""
        return len(self.state['failed_tesis'])

    def get_progress_percentage(self, total: int) -> float:
        """
        Get progress percentage

        Args:
            total: Total number of tesis

        Returns:
            Progress percentage (0-100)
        """
        if total == 0:
            return 0.0
        return (self.get_processed_count() / total) * 100

    def get_stats(self) -> Dict:
        """
        Get current statistics

        Returns:
            Dict with current stats
        """
        return {
            'processed': self.get_processed_count(),
            'failed': self.get_failed_count(),
            'total_chunks': self.state['total_chunks'],
            'total_tokens': self.state['total_tokens'],
            'actual_cost': self.state['actual_cost'],
            'start_time': self.state['start_time'],
            'last_update': self.state['last_update']
        }

    def clear(self):
        """Clear checkpoint (start fresh)"""
        self.state = {
            'processed_tesis': [],
            'failed_tesis': [],
            'last_batch_id': None,
            'total_chunks': 0,
            'total_tokens': 0,
            'actual_cost': 0.0,
            'start_time': None,
            'last_update': None,
            'version': '1.0'
        }
        self.save_checkpoint()
        logger.info("Checkpoint cleared")

    def export_failed(self, output_file: str = "failed_tesis.json"):
        """
        Export list of failed tesis to separate file

        Args:
            output_file: Output file path
        """
        if not self.state['failed_tesis']:
            logger.info("No failed tesis to export")
            return

        try:
            with open(output_file, 'w') as f:
                json.dump(self.state['failed_tesis'], f, indent=2)
            logger.info(f"Exported {len(self.state['failed_tesis'])} failed tesis to {output_file}")
        except Exception as e:
            logger.error(f"Error exporting failed tesis: {e}")

    def get_failed_ids(self) -> List[int]:
        """
        Get list of failed tesis IDs

        Returns:
            List of failed tesis IDs
        """
        return [item['id'] for item in self.state['failed_tesis']]
