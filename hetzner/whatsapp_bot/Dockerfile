FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy source files
COPY server.ts ./
COPY lib/ ./lib/
COPY tsconfig.json ./

# Install tsx for running TypeScript directly
RUN npm install tsx typescript @types/express @types/node

EXPOSE 3003

CMD ["npx", "tsx", "server.ts"]
