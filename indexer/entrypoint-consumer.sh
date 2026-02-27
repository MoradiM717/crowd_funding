#!/bin/bash
# =============================================================================
# Indexer Consumer Entrypoint Script
# =============================================================================
# This script:
# 1. Waits for RabbitMQ to be ready
# 2. Waits for PostgreSQL to be ready
# 3. Sets up RabbitMQ exchanges and queues (if not already done)
# 4. Starts the indexer consumer workers
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Starting Indexer Consumer${NC}"
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
# 2. Wait for PostgreSQL to be ready
# =============================================================================
echo -e "${YELLOW}Waiting for PostgreSQL...${NC}"

# Parse DB_URL to extract host and port
# DB_URL format: postgresql://user:pass@host:port/dbname
if [ -n "$DB_URL" ]; then
    # Extract host:port from the URL
    DB_HOST_PORT=$(echo "$DB_URL" | sed -E 's|.*@([^/]+)/.*|\1|')
    DB_HOST=$(echo "$DB_HOST_PORT" | cut -d: -f1)
    DB_PORT=$(echo "$DB_HOST_PORT" | cut -d: -f2)
else
    DB_HOST="${DB_HOST:-postgres}"
    DB_PORT="${DB_PORT:-5432}"
fi

while ! nc -z "$DB_HOST" "$DB_PORT"; do
    echo "PostgreSQL is not ready - waiting..."
    sleep 2
done

echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Additional wait to ensure PostgreSQL is accepting connections
sleep 2

# =============================================================================
# 3. Set up RabbitMQ broker (idempotent - safe to run multiple times)
# =============================================================================
echo -e "${YELLOW}Ensuring RabbitMQ broker is set up...${NC}"

python -m indexer broker setup

echo -e "${GREEN}Broker setup complete!${NC}"

# =============================================================================
# 4. Start the consumer workers
# =============================================================================
WORKERS="${CONSUMER_WORKERS:-2}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Starting consumer with $WORKERS workers...${NC}"
echo -e "${GREEN}========================================${NC}"

exec python -m indexer consumer run --workers "$WORKERS"
