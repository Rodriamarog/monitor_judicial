# Use official Puppeteer image (has Node.js + Chromium + all dependencies)
FROM ghcr.io/puppeteer/puppeteer:23.0.0

# Switch to root to install dependencies
USER root

# Set working directory to match expected structure
WORKDIR /app/hetzner

# Copy tribunal_electronico to parent level (so ../../../ works)
COPY tribunal_electronico/ /app/tribunal_electronico/

# Copy shared lib to parent level
COPY lib/ /app/lib/

# Copy tribunal scraper files
COPY hetzner/tribunal_scraper/package*.json ./
RUN npm ci --only=production --legacy-peer-deps

COPY hetzner/tribunal_scraper/ ./

# Change ownership
RUN chown -R pptruser:pptruser /app

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
