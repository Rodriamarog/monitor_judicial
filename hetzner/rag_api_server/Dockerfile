FROM node:20-slim

WORKDIR /app

# Install ALL dependencies (including tsx for running TypeScript)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY src/ ./src/
COPY tsconfig.json ./

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Run TypeScript directly with tsx (no compilation needed)
CMD ["npx", "tsx", "src/index.ts"]
