# Tribunal Electrónico Source Code

This directory contains the source code for the Tribunal Electrónico automation.

## Structure

- `src/` - TypeScript source files
  - `login.ts` - Main login and scraping logic
  - `scraper.ts` - Document scraping functions
  - `downloader.ts` - PDF download functionality
  - `config.ts` - Configuration and types

- `credentials/` - Certificate files (.key and .cer files) for authentication
- `data/` - Scraped data and downloaded PDFs (local testing)
- `screenshots/` - Debug screenshots from Puppeteer

## Usage

This code is **integrated into the main Next.js application** and should not be run standalone.

The integration is located in:
- `lib/tribunal/` - Wrapper functions that use this code
- `app/api/tribunal/` - API routes for the integration

## Dependencies

Dependencies are managed in the **root package.json**, not here.

Required packages:
- `puppeteer` - Browser automation
- `puppeteer-extra` - Plugin framework
- `puppeteer-extra-plugin-stealth` - Anti-detection

## Reference

`package.json.reference` contains the original standalone dependencies for reference only.
