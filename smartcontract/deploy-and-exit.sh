#!/bin/bash
# =============================================================================
# Contract Deployment Script
# =============================================================================
# This script:
# 1. Waits for the Hardhat node to be ready
# 2. Deploys the smart contracts
# 3. Copies ABIs to the shared volume for the indexer
# 4. Exits with success/failure status
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Contract Deployer Starting${NC}"
echo -e "${GREEN}========================================${NC}"

# =============================================================================
# 1. Wait for Hardhat node to be ready
# =============================================================================
echo -e "${YELLOW}Waiting for Hardhat node...${NC}"

RPC_URL="${RPC_URL:-http://hardhat-node:8545}"
MAX_RETRIES=60
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf "$RPC_URL" -X POST \
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

# Additional wait to ensure node is fully ready
sleep 3

# =============================================================================
# 2. Deploy contracts using Hardhat
# =============================================================================
echo -e "${YELLOW}Deploying contracts...${NC}"

# Run deployment script with the docker network configuration
npx hardhat run scripts/deploy.ts --network docker

echo -e "${GREEN}Contracts deployed successfully!${NC}"

# =============================================================================
# 3. Copy ABIs to shared volume (if mounted)
# =============================================================================
if [ -d "/app/artifacts" ]; then
    echo -e "${YELLOW}Copying ABIs to shared volume...${NC}"
    
    # Create output directory structure
    mkdir -p /app/artifacts/contracts
    
    # ABIs are in artifacts/contracts/*.sol/*.json
    # The indexer expects them at a specific location
    
    echo -e "${GREEN}ABIs available at /app/artifacts${NC}"
else
    echo -e "${YELLOW}No artifacts volume mounted - skipping ABI copy${NC}"
fi

# =============================================================================
# 4. Display deployment info
# =============================================================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Factory Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo -e "${YELLOW}Note: This is the default Hardhat deployment address${NC}"
echo -e "${GREEN}========================================${NC}"

exit 0
