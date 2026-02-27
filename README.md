# CrowdFunding

A decentralized crowdfunding platform built with Ethereum smart contracts, Django backend, and React frontend.

## Architecture

- **Smart Contracts**: Solidity contracts deployed on Ethereum (Hardhat for local development)
- **Backend**: Django REST API with PostgreSQL database
- **Frontend**: React with Vite, RainbowKit for wallet integration
- **Indexer**: Event indexer with RabbitMQ message broker
- **IPFS**: Pinata for decentralized storage of campaign metadata

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- (Optional) MetaMask browser extension for testing

### Running the Application

1. **Copy environment configuration**:
   ```bash
   cp .env.docker .env
   ```

2. **Start all services**:
   ```bash
   docker-compose up --build
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api/v1/
   - RabbitMQ Management: http://localhost:15672 (admin/admin_pass)
   - Hardhat RPC: http://localhost:8545

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | React web application |
| `backend` | 8000 | Django REST API |
| `hardhat-node` | 8545 | Local Ethereum blockchain |
| `postgres` | 5432 | PostgreSQL database |
| `rabbitmq` | 5672, 15672 | Message broker |
| `indexer-producer` | - | Blockchain event poller |
| `indexer-consumer` | - | Event processor workers |
| `contract-deployer` | - | One-time deployment job |

### Common Commands

```bash
# Start all services in detached mode
docker-compose up -d --build

# View logs for a specific service
docker-compose logs -f backend

# Stop all services (preserves data)
docker-compose down

# Full clean slate (removes all data)
docker-compose down -v

# Rebuild a specific service
docker-compose build frontend
docker-compose up -d frontend
```

### Clean Slate Mode

By default (`CLEAN_SLATE=true` in `.env`), the database is flushed on every restart. This ensures a fresh start for development. Set `CLEAN_SLATE=false` to persist data between restarts.

### Default Credentials

- **Superuser**: mostafa / 1
- **RabbitMQ**: admin / admin_pass
- **PostgreSQL**: crowdfunding / crowdfunding_pass

### Connecting MetaMask

1. Open MetaMask
2. Add custom network:
   - Network Name: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency Symbol: ETH
3. Import test account (Hardhat Account #0):
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

## Development Setup (Without Docker)

See individual README files in each subdirectory:
- [Backend README](backend/README.md)
- [Smart Contracts README](smartcontract/README.md)
- [Indexer README](indexer/README.md)
