# Use official Puppeteer image (has Node.js + Chromium + all dependencies)
FROM ghcr.io/puppeteer/puppeteer:23.0.0

# Switch to root to install dependencies
USER root

# Set working directory
WORKDIR /app

# Copy root package.json first (for shared dependencies)
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy required source directories
COPY tribunal_electronico/ ./tribunal_electronico/
COPY lib/ ./lib/

# Copy hetzner directory and install its dependencies
COPY hetzner/ ./hetzner/
WORKDIR /app/hetzner
RUN npm ci --only=production

# Change ownership back to pptruser
WORKDIR /app
RUN chown -R pptruser:pptruser /app

# Stay as root for X11 access (needed for visual mode)
# In production, switch back to: USER pptruser

# Set working directory to hetzner
WORKDIR /app/hetzner

# Expose validation server port
EXPOSE 3001

# Start the validation server
CMD ["npm", "start"]
