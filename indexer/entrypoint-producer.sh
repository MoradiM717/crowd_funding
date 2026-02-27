#!/bin/bash
# =============================================================================
# Indexer Producer Entrypoint Script
# =============================================================================
# This script:
# 1. Waits for RabbitMQ to be ready
# 2. Waits for Hardhat node to be ready
# 3. Sets up RabbitMQ exchanges and queues
# 4. Starts the indexer producer
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Starting Indexer Producer${NC}"
echo -e "${GREEN}========================================${NC}"

# =============================================================================
# 1. Wait for RabbitMQ to be ready
# =============================================================================
echo -e "${YELLOW}Waiting for RabbitMQ...${NC}"

RABBITMQ_HOST="${RABBITMQ_HOST:-rabbitmq}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"

while ! nc -z "$RABBITMQ_HOST" "$RABBITMQ_PORT"; do
    echo "RabbitMQ is not ready - waiting..."
    sleep 2
done

echo -e "${GREEN}RabbitMQ is ready!${NC}"

# Additional wait to ensure RabbitMQ is fully initialized
sleep 5

# =============================================================================
# 2. Wait for Hardhat node to be ready
# =============================================================================
echo -e "${YELLOW}Waiting for Hardhat node...${NC}"

# Extract host and port from RPC_URL or use defaults
RPC_HOST="${RPC_HOST:-hardhat-node}"
RPC_PORT="${RPC_PORT:-8545}"

# Try to connect to Hardhat node
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf "http://${RPC_HOST}:${RPC_PORT}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
        echo -e "${GREEN}Hardhat node is ready!${NC}"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Hardhat node is not ready - waiting... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}Failed to connect to Hardhat node after $MAX_RETRIES attempts${NC}"
    exit 1
fi

# =============================================================================
# 3. Set up RabbitMQ exchanges and queues
# =============================================================================
echo -e "${YELLOW}Setting up RabbitMQ broker...${NC}"

python -m indexer broker setup

echo -e "${GREEN}Broker setup complete!${NC}"

# =============================================================================
# 4. Start the producer
# =============================================================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Starting producer in polling mode...${NC}"
echo -e "${GREEN}========================================${NC}"

exec python -m indexer producer run
