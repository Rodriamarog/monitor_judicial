#!/usr/bin/env python3
"""
Scan downloaded tesis JSON files for data quality issues
"""

import json
import re
from pathlib import Path
from collections import defaultdict, Counter
from typing import Dict, List, Set
from tqdm import tqdm

class TesisDataScanner:
    """Scans tesis JSON files for data quality issues"""

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.batch_files = sorted(data_dir.glob("tesis_batch_*.json"))

        # Statistics
        self.stats = {
            'total_tesis': 0,
            'total_files': len(self.batch_files),
            'invalid_json_files': [],
            'missing_fields': defaultdict(int),
            'empty_fields': defaultdict(int),
            'field_types': defaultdict(set),
            'materias': Counter(),
            'tipo_tesis': Counter(),
            'epoca': Counter(),
            'anos': Counter(),
        }

        # Data quality issues
        self.issues = {
            'carriage_returns': 0,  # \r\n or \r
            'excessive_whitespace': 0,  # Multiple spaces/tabs
            'non_standard_quotes': 0,  # Curly quotes, etc.
            'html_entities': 0,  # &nbsp;, &amp;, etc.
            'null_bytes': 0,  # \x00
            'control_chars': 0,  # Other control characters
            'encoding_errors': 0,  # Replacement characters �
        }

        # Sample problematic entries
        self.samples = {
            'carriage_returns': [],
            'excessive_whitespace': [],
            'encoding_errors': [],
        }

    def scan_all(self):
        """Scan all batch files"""
        print("=" * 80)
        print("TESIS DATA SCANNER")
        print("=" * 80)
        print(f"Scanning {len(self.batch_files)} batch files...")
        print()

        for batch_file in tqdm(self.batch_files, desc="Scanning batches"):
            self.scan_file(batch_file)

        self.print_report()

    def scan_file(self, filepath: Path):
        """Scan a single JSON file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)

            if not isinstance(data, list):
                self.stats['invalid_json_files'].append(str(filepath))
                return

            for tesis in data:
                self.scan_tesis(tesis)

        except json.JSONDecodeError as e:
            self.stats['invalid_json_files'].append(f"{filepath}: {e}")
        except Exception as e:
            self.stats['invalid_json_files'].append(f"{filepath}: {e}")

    def scan_tesis(self, tesis: Dict):
        """Scan a single tesis document"""
        self.stats['total_tesis'] += 1

        # Expected fields
        expected_fields = [
            'idTesis', 'rubro', 'texto', 'precedentes', 'epoca',
            'instancia', 'organoJuris', 'fuente', 'tesis', 'tipoTesis',
            'localizacion', 'anio', 'mes', 'notaPublica', 'anexos',
            'huellaDigital', 'materias'
        ]

        # Check for missing fields
        for field in expected_fields:
            if field not in tesis:
                self.stats['missing_fields'][field] += 1

        # Check field types and collect statistics
        for field, value in tesis.items():
            self.stats['field_types'][field].add(type(value).__name__)

            # Check for empty fields
            if value is None or value == "" or value == []:
                self.stats['empty_fields'][field] += 1

            # Scan text fields for issues
            if isinstance(value, str):
                self.scan_text_field(field, value, tesis.get('idTesis'))

        # Collect metadata statistics
        if 'materias' in tesis and isinstance(tesis['materias'], list):
            for materia in tesis['materias']:
                self.stats['materias'][materia] += 1

        if 'tipoTesis' in tesis:
            self.stats['tipo_tesis'][tesis['tipoTesis']] += 1

        if 'epoca' in tesis:
            self.stats['epoca'][tesis['epoca']] += 1

        if 'anio' in tesis and tesis['anio']:
            self.stats['anos'][tesis['anio']] += 1

    def scan_text_field(self, field_name: str, text: str, tesis_id):
        """Scan text field for quality issues"""
        # Carriage returns
        if '\r' in text:
            self.issues['carriage_returns'] += 1
            if len(self.samples['carriage_returns']) < 3:
                self.samples['carriage_returns'].append({
                    'id': tesis_id,
                    'field': field_name,
                    'preview': text[:100] + '...' if len(text) > 100 else text
                })

        # Excessive whitespace (multiple spaces, tabs, etc.)
        if re.search(r'\s{3,}', text) or '\t' in text:
            self.issues['excessive_whitespace'] += 1
            if len(self.samples['excessive_whitespace']) < 3:
                self.samples['excessive_whitespace'].append({
                    'id': tesis_id,
                    'field': field_name,
                    'preview': text[:100] + '...' if len(text) > 100 else text
                })

        # Non-standard quotes
        if any(char in text for char in ['\u201c', '\u201d', '\u2018', '\u2019']):
            self.issues['non_standard_quotes'] += 1

        # HTML entities
        if re.search(r'&[a-z]+;|&#\d+;', text):
            self.issues['html_entities'] += 1

        # Null bytes
        if '\x00' in text:
            self.issues['null_bytes'] += 1

        # Control characters (except common whitespace)
        if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', text):
            self.issues['control_chars'] += 1

        # Encoding errors (replacement character)
        if '�' in text:
            self.issues['encoding_errors'] += 1
            if len(self.samples['encoding_errors']) < 3:
                self.samples['encoding_errors'].append({
                    'id': tesis_id,
                    'field': field_name,
                    'preview': text[:100] + '...' if len(text) > 100 else text
                })

    def print_report(self):
        """Print comprehensive scan report"""
        print("\n" + "=" * 80)
        print("SCAN RESULTS")
        print("=" * 80)

        # Basic stats
        print(f"\n📊 BASIC STATISTICS")
        print(f"   Total tesis scanned: {self.stats['total_tesis']:,}")
        print(f"   Total batch files: {self.stats['total_files']}")
        print(f"   Invalid JSON files: {len(self.stats['invalid_json_files'])}")

        if self.stats['invalid_json_files']:
            print(f"\n   ⚠️  Invalid files:")
            for f in self.stats['invalid_json_files']:
                print(f"      - {f}")

        # Missing fields
        print(f"\n📋 MISSING FIELDS")
        if self.stats['missing_fields']:
            for field, count in sorted(self.stats['missing_fields'].items(), key=lambda x: -x[1]):
                pct = (count / self.stats['total_tesis']) * 100
                print(f"   {field}: {count:,} ({pct:.2f}%)")
        else:
            print("   ✓ No missing fields")

        # Empty fields
        print(f"\n📝 EMPTY/NULL FIELDS (Top 10)")
        empty_sorted = sorted(self.stats['empty_fields'].items(), key=lambda x: -x[1])[:10]
        for field, count in empty_sorted:
            pct = (count / self.stats['total_tesis']) * 100
            print(f"   {field}: {count:,} ({pct:.2f}%)")

        # Data quality issues
        print(f"\n🔍 DATA QUALITY ISSUES")
        total_issues = sum(self.issues.values())
        print(f"   Total issues found: {total_issues:,}")
        print()
        for issue, count in sorted(self.issues.items(), key=lambda x: -x[1]):
            if count > 0:
                pct = (count / self.stats['total_tesis']) * 100
                print(f"   {issue.replace('_', ' ').title()}: {count:,} ({pct:.2f}%)")

        # Sample issues
        if self.samples['carriage_returns']:
            print(f"\n   Sample carriage return issues:")
            for sample in self.samples['carriage_returns'][:2]:
                print(f"      ID {sample['id']} ({sample['field']}):")
                print(f"      {repr(sample['preview'][:80])}")

        if self.samples['excessive_whitespace']:
            print(f"\n   Sample excessive whitespace issues:")
            for sample in self.samples['excessive_whitespace'][:2]:
                print(f"      ID {sample['id']} ({sample['field']}):")
                print(f"      {repr(sample['preview'][:80])}")

        if self.samples['encoding_errors']:
            print(f"\n   Sample encoding error issues:")
            for sample in self.samples['encoding_errors'][:2]:
                print(f"      ID {sample['id']} ({sample['field']}):")
                print(f"      {repr(sample['preview'][:80])}")

        # Metadata statistics
        print(f"\n📚 METADATA STATISTICS")

        print(f"\n   Tipo de Tesis (Top 5):")
        for tipo, count in self.stats['tipo_tesis'].most_common(5):
            pct = (count / self.stats['total_tesis']) * 100
            print(f"      {tipo}: {count:,} ({pct:.1f}%)")

        print(f"\n   Época (Top 5):")
        for epoca, count in self.stats['epoca'].most_common(5):
            pct = (count / self.stats['total_tesis']) * 100
            print(f"      {epoca}: {count:,} ({pct:.1f}%)")

        print(f"\n   Materias (Top 10):")
        for materia, count in self.stats['materias'].most_common(10):
            pct = (count / self.stats['total_tesis']) * 100
            print(f"      {materia}: {count:,} ({pct:.1f}%)")

        print(f"\n   Years (Range):")
        if self.stats['anos']:
            years = [y for y in self.stats['anos'].keys() if isinstance(y, int)]
            if years:
                print(f"      Min: {min(years)}, Max: {max(years)}")
                print(f"      Most common:")
                for year, count in self.stats['anos'].most_common(5):
                    print(f"         {year}: {count:,}")

        # Recommendations
        print(f"\n" + "=" * 80)
        print("💡 CLEANING RECOMMENDATIONS")
        print("=" * 80)

        recommendations = []

        if self.issues['carriage_returns'] > 0:
            recommendations.append(
                f"✓ Remove carriage returns (\\r\\n → \\n): {self.issues['carriage_returns']:,} instances"
            )

        if self.issues['excessive_whitespace'] > 0:
            recommendations.append(
                f"✓ Normalize whitespace (multiple spaces → single): {self.issues['excessive_whitespace']:,} instances"
            )

        if self.issues['non_standard_quotes'] > 0:
            recommendations.append(
                f"✓ Convert curly quotes to straight quotes: {self.issues['non_standard_quotes']:,} instances"
            )

        if self.issues['html_entities'] > 0:
            recommendations.append(
                f"✓ Decode HTML entities: {self.issues['html_entities']:,} instances"
            )

        if self.issues['control_chars'] > 0:
            recommendations.append(
                f"✓ Remove control characters: {self.issues['control_chars']:,} instances"
            )

        if self.issues['encoding_errors'] > 0:
            recommendations.append(
                f"⚠️  Fix encoding errors (� character): {self.issues['encoding_errors']:,} instances"
            )

        if recommendations:
            for i, rec in enumerate(recommendations, 1):
                print(f"{i}. {rec}")
        else:
            print("✓ No major issues found! Data looks clean.")

        print("\n" + "=" * 80)


def main():
    """Main entry point"""
    import sys
    base_dir = Path(__file__).parent

    # Allow specifying directory as argument
    if len(sys.argv) > 1:
        data_dir = base_dir / sys.argv[1]
    else:
        data_dir = base_dir / 'data' / 'raw'

    if not data_dir.exists():
        print(f"❌ Data directory not found: {data_dir}")
        return

    scanner = TesisDataScanner(data_dir)
    scanner.scan_all()


if __name__ == "__main__":
    main()
