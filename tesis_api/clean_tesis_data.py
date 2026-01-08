#!/usr/bin/env python3
"""
Clean downloaded tesis JSON files
Fixes: carriage returns, excessive whitespace, and non-standard quotes
"""

import json
import re
from pathlib import Path
from typing import Dict, Any
from tqdm import tqdm
import shutil

class TesisDataCleaner:
    """Cleans tesis JSON files"""

    def __init__(self, input_dir: Path, output_dir: Path, backup: bool = True):
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.backup = backup

        self.batch_files = sorted(input_dir.glob("tesis_batch_*.json"))

        # Statistics
        self.stats = {
            'total_tesis': 0,
            'total_files': len(self.batch_files),
            'carriage_returns_fixed': 0,
            'whitespace_normalized': 0,
            'quotes_converted': 0,
        }

    def clean_text(self, text: str) -> tuple[str, dict]:
        """
        Clean a text field

        Returns:
            (cleaned_text, stats_dict)
        """
        if not isinstance(text, str):
            return text, {}

        original = text
        changes = {
            'carriage_returns': 0,
            'whitespace': 0,
            'quotes': 0,
        }

        # 1. Remove carriage returns (\r\n -> \n, \r -> \n)
        if '\r' in text:
            changes['carriage_returns'] = text.count('\r')
            text = text.replace('\r\n', '\n').replace('\r', '\n')

        # 2. Normalize whitespace
        # - Replace tabs with spaces
        # - Replace multiple spaces with single space
        # - But preserve intentional line breaks
        if '\t' in text or re.search(r' {2,}', text):
            changes['whitespace'] = 1
            # Replace tabs with single space
            text = text.replace('\t', ' ')
            # Replace multiple spaces with single space (but not across newlines)
            text = re.sub(r' +', ' ', text)
            # Clean up spaces around newlines
            text = re.sub(r' *\n *', '\n', text)

        # 3. Convert curly quotes to straight quotes
        quote_map = {
            '\u201c': '"',  # Left double quote (")
            '\u201d': '"',  # Right double quote (")
            '\u2018': "'",  # Left single quote (')
            '\u2019': "'",  # Right single quote (')
        }

        for curly, straight in quote_map.items():
            if curly in text:
                changes['quotes'] += text.count(curly)
                text = text.replace(curly, straight)

        return text, changes

    def clean_tesis(self, tesis: Dict[str, Any]) -> Dict[str, Any]:
        """Clean a single tesis document"""
        cleaned = {}

        for field, value in tesis.items():
            if isinstance(value, str):
                cleaned_value, changes = self.clean_text(value)
                cleaned[field] = cleaned_value

                # Update global stats
                if changes['carriage_returns'] > 0:
                    self.stats['carriage_returns_fixed'] += changes['carriage_returns']
                if changes['whitespace'] > 0:
                    self.stats['whitespace_normalized'] += 1
                if changes['quotes'] > 0:
                    self.stats['quotes_converted'] += changes['quotes']
            else:
                # Keep non-string values as-is
                cleaned[field] = value

        self.stats['total_tesis'] += 1
        return cleaned

    def clean_file(self, input_file: Path, output_file: Path):
        """Clean a single JSON batch file"""
        # Read original
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Clean each tesis
        cleaned_data = [self.clean_tesis(tesis) for tesis in data]

        # Write cleaned version
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, indent=2, ensure_ascii=False)

    def clean_all(self):
        """Clean all batch files"""
        print("=" * 80)
        print("TESIS DATA CLEANER")
        print("=" * 80)
        print(f"Input: {self.input_dir}")
        print(f"Output: {self.output_dir}")
        print(f"Files to process: {len(self.batch_files)}")

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Backup if requested
        if self.backup:
            backup_dir = self.input_dir.parent / 'raw_backup'
            if not backup_dir.exists():
                print(f"\nCreating backup: {backup_dir}")
                shutil.copytree(self.input_dir, backup_dir)
                print("✓ Backup complete")

        print(f"\nCleaning {len(self.batch_files)} files...")
        print()

        # Process each file
        for input_file in tqdm(self.batch_files, desc="Cleaning batches"):
            output_file = self.output_dir / input_file.name
            self.clean_file(input_file, output_file)

        self.print_summary()

    def print_summary(self):
        """Print cleaning summary"""
        print("\n" + "=" * 80)
        print("CLEANING COMPLETE!")
        print("=" * 80)
        print(f"\n📊 STATISTICS")
        print(f"   Total tesis cleaned: {self.stats['total_tesis']:,}")
        print(f"   Total files processed: {self.stats['total_files']}")
        print()
        print(f"🔧 FIXES APPLIED")
        print(f"   Carriage returns removed: {self.stats['carriage_returns_fixed']:,}")
        print(f"   Fields with whitespace normalized: {self.stats['whitespace_normalized']:,}")
        print(f"   Curly quotes converted: {self.stats['quotes_converted']:,}")
        print()
        print(f"💾 OUTPUT")
        print(f"   Cleaned files: {self.output_dir}")

        if self.backup:
            backup_dir = self.input_dir.parent / 'raw_backup'
            print(f"   Backup: {backup_dir}")

        print("\n" + "=" * 80)
        print("Next steps:")
        print("  1. Verify cleaned data: python verify_cleaned_data.py")
        print("  2. Load to database: python load_to_database.py")
        print("=" * 80)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Clean tesis JSON files')
    parser.add_argument('--no-backup', action='store_true', help='Skip creating backup')
    parser.add_argument('--input', type=str, default='data/raw', help='Input directory')
    parser.add_argument('--output', type=str, default='data/cleaned', help='Output directory')
    args = parser.parse_args()

    base_dir = Path(__file__).parent
    input_dir = base_dir / args.input
    output_dir = base_dir / args.output

    if not input_dir.exists():
        print(f"❌ Input directory not found: {input_dir}")
        return

    cleaner = TesisDataCleaner(
        input_dir=input_dir,
        output_dir=output_dir,
        backup=not args.no_backup
    )

    cleaner.clean_all()


if __name__ == "__main__":
    main()
