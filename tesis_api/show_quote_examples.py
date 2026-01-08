#!/usr/bin/env python3
"""
Show examples of non-standard quotes in tesis data
"""

import json
from pathlib import Path

def find_quote_examples():
    """Find and display examples of different quote types"""

    # Non-standard quote characters
    quotes = {
        '"': 'Left double quotation mark (curly open)',
        '"': 'Right double quotation mark (curly close)',
        ''': 'Left single quotation mark (curly open)',
        ''': 'Right single quotation mark (curly close)',
        '"': 'Standard double quote (straight)',
        "'": 'Standard single quote (straight)',
    }

    print("=" * 80)
    print("NON-STANDARD QUOTE EXAMPLES")
    print("=" * 80)
    print("\nQuote types we're looking for:")
    for char, desc in quotes.items():
        print(f"  {repr(char)} ({char}) - {desc}")

    print("\n" + "=" * 80)
    print("EXAMPLES FROM ACTUAL DATA")
    print("=" * 80)

    # Load first batch file
    base_dir = Path(__file__).parent
    first_batch = base_dir / 'data' / 'raw' / 'tesis_batch_000000_010000.json'

    with open(first_batch, 'r', encoding='utf-8') as f:
        data = json.load(f)

    examples_found = 0
    max_examples = 5

    for tesis in data:
        if examples_found >= max_examples:
            break

        # Check texto field
        texto = tesis.get('texto', '')

        # Find curly quotes
        curly_quotes = ['"', '"', ''', ''']
        has_curly = any(q in texto for q in curly_quotes)

        if has_curly:
            examples_found += 1

            print(f"\nExample {examples_found}:")
            print(f"Tesis ID: {tesis.get('idTesis')}")
            print(f"Rubro: {tesis.get('rubro', '')[:80]}...")
            print("\nText excerpt with quotes:")

            # Find and show context around curly quotes
            for i, char in enumerate(texto):
                if char in curly_quotes:
                    start = max(0, i - 50)
                    end = min(len(texto), i + 50)
                    excerpt = texto[start:end]

                    # Highlight the quote
                    highlighted = excerpt.replace(char, f">>>{char}<<<")

                    print(f"\n  Context: ...{highlighted}...")
                    print(f"  Character: {repr(char)} - {quotes[char]}")
                    break  # Just show first occurrence per tesis

    print("\n" + "=" * 80)
    print("WHY THIS MATTERS")
    print("=" * 80)
    print("""
The issue with curly quotes (", ", ', ') vs straight quotes (", '):

1. **Search & Matching Problems:**
   - Users searching for "amparo" won't match "amparo" (with curly quotes)
   - Database queries may fail or give unexpected results

2. **JSON/API Issues:**
   - Some parsers may have trouble with Unicode quotes
   - API consumers might expect ASCII-only quotes

3. **Embedding/ML Issues:**
   - Tokenizers may treat curly quotes differently than straight quotes
   - This can affect semantic search quality

4. **Consistency:**
   - Mixing quote styles makes the dataset inconsistent
   - Harder to write reliable text processing scripts

5. **Copy-Paste Issues:**
   - Users copying text may get unexpected quote characters
   - Can break when pasted into code or search boxes

**Recommendation:**
Convert all curly quotes to straight quotes for consistency and compatibility.
This is a common normalization step in text processing pipelines.

Curly quotes: " " ' '  →  Straight quotes: " " ' '
""")

    print("=" * 80)

if __name__ == "__main__":
    find_quote_examples()
