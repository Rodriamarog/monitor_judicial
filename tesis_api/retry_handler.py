#!/usr/bin/env python3
"""
Retry Handler for API Calls
Implements exponential backoff for handling API failures
"""
import time
import logging
from typing import Callable, Any
import openai

logger = logging.getLogger(__name__)


class RetryHandler:
    """Handles API failures with exponential backoff"""

    def __init__(self, max_retries: int = 5, base_delay: float = 1.0):
        """
        Initialize retry handler

        Args:
            max_retries: Maximum number of retry attempts
            base_delay: Base delay in seconds (doubles each retry)
        """
        self.max_retries = max_retries
        self.base_delay = base_delay

    def execute_with_retry(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with retry logic

        Args:
            func: Function to execute
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function

        Returns:
            Function result

        Raises:
            Exception: If all retries exhausted
        """
        for attempt in range(self.max_retries):
            try:
                return func(*args, **kwargs)

            except openai.RateLimitError as e:
                if attempt == self.max_retries - 1:
                    logger.error(f"Rate limit error after {self.max_retries} attempts: {e}")
                    raise

                delay = self.base_delay * (2 ** attempt)
                logger.warning(f"Rate limit hit (attempt {attempt + 1}/{self.max_retries}). "
                             f"Retrying in {delay:.1f}s... Error: {e}")
                time.sleep(delay)

            except openai.APIError as e:
                if attempt == self.max_retries - 1:
                    logger.error(f"API error after {self.max_retries} attempts: {e}")
                    raise

                delay = self.base_delay * (2 ** attempt)
                logger.warning(f"API error (attempt {attempt + 1}/{self.max_retries}). "
                             f"Retrying in {delay:.1f}s... Error: {e}")
                time.sleep(delay)

            except openai.APIConnectionError as e:
                if attempt == self.max_retries - 1:
                    logger.error(f"Connection error after {self.max_retries} attempts: {e}")
                    raise

                delay = self.base_delay * (2 ** attempt)
                logger.warning(f"Connection error (attempt {attempt + 1}/{self.max_retries}). "
                             f"Retrying in {delay:.1f}s... Error: {e}")
                time.sleep(delay)

            except openai.Timeout as e:
                if attempt == self.max_retries - 1:
                    logger.error(f"Timeout after {self.max_retries} attempts: {e}")
                    raise

                delay = self.base_delay * (2 ** attempt)
                logger.warning(f"Request timeout (attempt {attempt + 1}/{self.max_retries}). "
                             f"Retrying in {delay:.1f}s... Error: {e}")
                time.sleep(delay)

            except Exception as e:
                # Non-retriable error
                logger.error(f"Non-retriable error: {type(e).__name__}: {e}")
                raise

        # Should never reach here, but just in case
        raise Exception(f"Failed after {self.max_retries} retries")
