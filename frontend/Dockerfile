# =============================================================================
# Frontend Dockerfile - React/Vite with Vite Preview
# =============================================================================
# Single-stage build using node to serve (avoids nginx dependency)
# =============================================================================
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Build arguments for environment variables
ARG VITE_API_URL=/api/v1
ARG VITE_WALLET_CONNECT_PROJECT_ID=test
ARG VITE_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
ARG VITE_PINATA_JWT=

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WALLET_CONNECT_PROJECT_ID=${VITE_WALLET_CONNECT_PROJECT_ID}
ENV VITE_FACTORY_ADDRESS=${VITE_FACTORY_ADDRESS}
ENV VITE_PINATA_JWT=${VITE_PINATA_JWT}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (vite preview uses 4173 by default, we'll configure it to use 80)
EXPOSE 80

# Serve using vite preview on port 80
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "80"]
