# CrowdFunding

> A decentralized crowdfunding platform combining Ethereum smart contracts, a React Web3 frontend, a Django REST API, PostgreSQL, RabbitMQ, blockchain event indexing, and IPFS-based campaign metadata.

CrowdFunding is a full-stack Web3 crowdfunding application built around a hybrid Web2/Web3 architecture. Financial rules and fund custody live on-chain, while the backend and indexer provide efficient querying, authentication, profiles, analytics, and application-friendly blockchain read models.

## ✨ Features

- 🔐 Ethereum-compatible wallet connection with RainbowKit and wagmi
- 🚀 Create crowdfunding campaigns through a smart-contract factory
- 💰 Contribute ETH directly to campaigns
- 🎯 Track campaign funding progress and goals
- ⏳ Track campaign deadlines and lifecycle state
- 💸 Withdraw funds after a campaign reaches its goal
- ↩️ Claim refunds when a campaign fails
- 📝 Store campaign metadata using IPFS/Pinata
- 📊 Browse campaign and platform statistics
- 👤 User profiles and wallet-based authentication support
- 🔎 Filter, paginate, and search indexed campaign data
- 📡 Query historical blockchain events through a REST API
- ♻️ Idempotent event processing and blockchain reorganization handling
- 📨 RabbitMQ-based producer/consumer indexing pipeline
- 🗄️ PostgreSQL read model for fast application queries

## 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │      React App       │
                         │   Vite + TypeScript  │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
          │   Wallet    │    │ Django API  │    │    IPFS     │
          │ wagmi /     │    │ REST API    │    │   Pinata    │
          │ RainbowKit  │    │             │    │             │
          └──────┬──────┘    └──────┬──────┘    └─────────────┘
                 │                  │
                 ▼                  ▼
          ┌─────────────┐    ┌─────────────┐
          │  Ethereum   │    │ PostgreSQL  │
          │ Smart       │    │ Read Model  │
          │ Contracts   │    │             │
          └──────┬──────┘    └──────▲──────┘
                 │                  │
                 │ events           │
                 ▼                  │
          ┌─────────────┐     ┌─────┴───────┐
          │   Producer  │────▶│  RabbitMQ   │
          │ Blockchain  │     │   Broker    │
          │ Event Poller│     └─────┬───────┘
          └─────────────┘           │
                                    ▼
                              ┌─────────────┐
                              │  Consumers  │
                              │ Event / DB  │
                              │   Workers   │
                              └─────────────┘
```

### Component responsibilities

| Component | Technology | Responsibility |
|---|---|---|
| Frontend | React, TypeScript, Vite | User interface and Web3 interactions |
| Wallet | wagmi, RainbowKit, viem | Wallet connection and blockchain transactions |
| Smart contracts | Solidity, Hardhat | Campaign creation and fund management |
| Backend | Django, Django REST Framework | REST API, authentication, profiles, admin and read access |
| Database | PostgreSQL | Indexed blockchain/application data |
| Indexer | Python, Web3.py | Reads and decodes blockchain events |
| Message broker | RabbitMQ | Reliable event delivery between producer and consumers |
| Storage | IPFS / Pinata | Decentralized campaign metadata |
| Local blockchain | Hardhat | Local Ethereum development network |

## 🔗 Smart Contract Architecture

The contract layer follows a **Factory → Campaign** architecture.

```text
CampaignFactory
      │
      ├── Campaign A
      ├── Campaign B
      ├── Campaign C
      └── Campaign D
```

### CampaignFactory

The factory creates independent campaign contracts and maintains:

- A list of all campaigns
- Campaigns grouped by creator
- The total campaign count

Important functions include:

```solidity
createCampaign(uint256 goal, uint256 deadline, string memory cid)
getCampaigns()
getCampaignsByCreator(address creator)
getCampaignCount()
```

### Campaign

Each campaign manages:

- Creator
- Funding goal
- Deadline
- Total raised
- Contributor balances
- IPFS metadata CID
- Withdrawal state

## 💰 Campaign Lifecycle

```text
                  ┌─────────────┐
                  │   Created   │
                  └──────┬──────┘
                         │
                         ▼
                  ┌─────────────┐
                  │    Active   │
                  └──────┬──────┘
                         │
              ┌──────────┴──────────┐
              │                     │
        Goal reached           Deadline passed
              │               without goal
              ▼                     │
        ┌─────────────┐             ▼
        │  Successful │       ┌─────────────┐
        └──────┬──────┘       │    Failed   │
               │              └──────┬──────┘
               ▼                     │
        ┌─────────────┐              ▼
        │  Withdrawn  │         ┌──────────┐
        └─────────────┘         │ Refunded │
                                └──────────┘
```

A campaign is active while its deadline has not passed and funds have not been withdrawn. Once `totalRaised >= goal`, the creator can withdraw. If the deadline passes before the goal is reached, contributors can claim refunds.

## 🔐 Smart Contract Security

The contracts use several security-oriented patterns:

- OpenZeppelin `ReentrancyGuard` for money-moving functions
- Checks-effects-interactions ordering around external ETH transfers
- Low-level `call{value: amount}("")` for ETH transfers
- Solidity custom errors for efficient revert handling
- Input validation for goals, deadlines, and IPFS CIDs
- Creator-only access for campaign withdrawal
- Per-contributor accounting for refunds

> **Security notice:** This repository should be treated as development software until the contracts have received an independent security review/audit. Never use local development keys with real funds.

## 📡 Blockchain Events

The contracts emit events that form the bridge between on-chain state and the indexed PostgreSQL read model.

### `CampaignCreated`

Contains campaign/factory address, creator, goal, deadline, and IPFS CID.

### `DonationReceived`

Contains campaign, donor, donation amount, updated total raised, and timestamp.

### `Withdrawn`

Contains campaign, creator, withdrawal amount, and timestamp.

### `Refunded`

Contains campaign, donor, refund amount, and timestamp.

## 📝 Campaign Metadata and IPFS

Large descriptive campaign content is kept off-chain. The campaign contract stores an IPFS CID:

```solidity
string public cid;
```

The CID can be resolved through IPFS/Pinata while the blockchain retains the durable reference associated with the campaign.

## 🖥️ Frontend

The frontend uses:

- React 19
- TypeScript
- Vite
- React Router
- wagmi
- viem
- RainbowKit
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS
- Radix UI
- Lucide icons

The application includes pages/components for:

- Home and campaign discovery
- Campaign details
- Campaign creation
- User profiles
- Platform statistics
- Reusable campaign cards and forms
- Loading and error states
- Not-found handling

Web3 interactions follow:

```text
RainbowKit → wagmi → viem → Ethereum RPC → CampaignFactory / Campaign
```

## ⚙️ Backend

The backend is built with:

- Python
- Django
- Django REST Framework
- PostgreSQL
- django-filter
- drf-spectacular
- Simple JWT
- django-cors-headers
- django-ratelimit
- eth-account
- httpx

The API exposes indexed blockchain data and application functionality such as authentication and profiles.

### API base path

```text
/api/v1/
```

### Campaign endpoints

```http
GET /api/v1/campaigns/
GET /api/v1/campaigns/{address}/
GET /api/v1/campaigns/{address}/contributions/
GET /api/v1/campaigns/{address}/events/
```

Campaign filtering includes status, creator/factory address, goal ranges, raised ranges, withdrawal state, and deadline ranges. Ordering can be applied to fields such as creation time, deadline, goal, and total raised.

### Creator and donor endpoints

```http
GET /api/v1/creators/{creator_address}/campaigns/
GET /api/v1/donors/{donor_address}/contributions/
```

### Chain and synchronization endpoints

```http
GET /api/v1/chains/
GET /api/v1/chains/{chain_id}/sync-state/
```

### Event endpoint

```http
GET /api/v1/events/
```

Events can be filtered by chain, event name, address, block range, transaction hash, and removed status.

### API documentation

With the backend running:

```text
Swagger UI: http://127.0.0.1:8000/api/schema/swagger-ui/
OpenAPI:    http://127.0.0.1:8000/api/schema/
```

## 🔄 Blockchain Indexer

The indexer uses a **Producer → RabbitMQ → Consumer** architecture.

```text
Ethereum
   │
   ▼
Producer
   │ decoded events
   ▼
RabbitMQ
   │
   ├───────────────┐
   │               │
   ▼               ▼
Consumer       Dead Letter Queue
   │
   ▼
PostgreSQL
```

### Producer

The producer:

1. Polls the blockchain
2. Reads new blocks
3. Detects relevant contract events
4. Decodes event data
5. Publishes messages to RabbitMQ
6. Tracks synchronization state
7. Detects chain reorganizations
8. Publishes rollback/control messages when necessary

### Consumer

Consumers:

1. Receive event messages
2. Validate messages
3. Persist events
4. Update campaign state
5. Update contribution state
6. ACK successfully processed messages
7. Retry failed messages
8. Route unrecoverable messages to the dead-letter queue

Multiple consumer workers can run in parallel.

## ♻️ Idempotency and Reorganizations

Events use a uniqueness key based on blockchain identity such as `(chain_id, tx_hash, log_index)`, allowing duplicate delivery to be handled safely.

The indexer also detects block-hash mismatches and can roll synchronization state back when a blockchain reorganization occurs. Affected events can be marked as removed and state can be rebuilt from canonical events.

Periodic reconciliation provides an additional mechanism for updating time-dependent campaign state such as expired deadlines.

## 📨 RabbitMQ

RabbitMQ decouples blockchain polling from database processing.

Core queues include:

| Queue | Purpose |
|---|---|
| `queue.campaign_created` | Campaign creation events |
| `queue.donation_received` | Donation events |
| `queue.withdrawal_refund` | Withdrawals and refunds |
| `queue.control` | Rollback/reconciliation messages |
| `dlq.events` | Failed/unprocessable messages |

## 🗄️ PostgreSQL Read Model

The indexed data is organized around concepts such as:

- `chains` — supported blockchain networks
- `sync_state` — latest indexed block/hash
- `campaigns` — indexed campaign state
- `contributions` — donor contribution state
- `events` — raw/indexed blockchain events

The database is a queryable representation of blockchain activity rather than the authority for campaign funds.

## 🔐 Authentication

The project includes application authentication using JWT and Ethereum wallet signature verification support. The backend also includes rate limiting, while the frontend provides authentication context/utilities.

## 🚀 Quick Start with Docker

### Prerequisites

- Docker
- Docker Compose
- MetaMask or another Ethereum-compatible wallet for Web3 testing

### Start the stack

```bash
git clone https://github.com/MoradiM717/crowd_funding.git
cd crowd_funding
cp .env.docker .env
docker compose up --build
```

If `.env.docker` is not available in your checkout, configure the environment variables using the example files provided by the individual services.

### Local services

| Service | Port | Purpose |
|---|---:|---|
| Frontend | `3000` | React application |
| Backend | `8000` | Django REST API |
| Hardhat | `8545` | Local Ethereum RPC |
| PostgreSQL | `5432` | Database |
| RabbitMQ AMQP | `5672` | Message broker |
| RabbitMQ UI | `15672` | RabbitMQ management |
| pgAdmin | `5050` | PostgreSQL administration |

### Common Docker commands

```bash
# Start in detached mode
docker compose up -d --build

# Follow backend logs
docker compose logs -f backend

# Stop services while preserving volumes
docker compose down

# Remove containers and volumes/data
docker compose down -v

# Rebuild a service
docker compose build frontend
docker compose up -d frontend
```

### Database reset behavior

The development environment supports a clean-slate mode controlled by `CLEAN_SLATE`. When enabled, the database is reset on startup; disable it when you want development data to persist.

> **Security:** Any default credentials in local Docker configuration are for development only. Change every credential before exposing a service outside a local development environment.

## 🦊 MetaMask and Hardhat

Configure MetaMask with:

```text
Network Name: Hardhat Local
RPC URL:      http://localhost:8545
Chain ID:     31337
Currency:     ETH
```

Hardhat supplies funded development accounts.

> ⚠️ Hardhat private keys are publicly known test keys. Never import them for real funds or use them on mainnet/testnets containing valuable assets.

## 🧩 Development Without Docker

### Smart contracts

```bash
cd smartcontract
npm install
npm run compile
npm run test
npm run coverage
```

Run a local node and deploy:

```bash
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
```

The smart-contract scripts also provide helpers for creating campaigns, reading campaign information, listing campaigns, donating, withdrawing, and refunding.

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Other useful commands:

```bash
npm run build
npm run lint
npm run preview
```

### Indexer

```bash
cd indexer
pip install -r requirements.txt
cp .env.example .env
```

Typical configuration includes:

```env
FACTORY_ADDRESS=<factory-address>
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
DB_URL=<postgresql-connection-string>
CONFIRMATIONS=1
BLOCK_BATCH_SIZE=2000
POLL_INTERVAL_SECONDS=2
REORG_ROLLBACK_BLOCKS=50
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=<user>
RABBITMQ_PASSWORD=<password>
CONSUMER_WORKERS=4
MAX_RETRIES=3
```

Useful indexer commands include:

```bash
python -m indexer broker setup
python -m indexer broker status
python -m indexer producer run
python -m indexer consumer run
python -m indexer producer backfill --from-block 0 --to-block 1000
python -m indexer consumer run --workers 8
python -m indexer consumer status
```

## 🧪 Testing

### Smart contracts

The contract tests cover deployment, campaign creation, donations, withdrawal/refund behavior, edge cases, view functions, events, and reentrancy protection.

```bash
cd smartcontract
npm test
npm run coverage
```

### Indexer

Indexer tests cover event decoding, idempotency, state updates, and blockchain reorganization handling.

```bash
cd indexer
pytest
```

### Frontend

Run lint and production build checks:

```bash
cd frontend
npm run lint
npm run build
```

## 📁 Repository Structure

```text
crowd_funding/
├── backend/
│   ├── _base/
│   ├── core/
│   │   ├── api/
│   │   ├── services/
│   │   ├── models.py
│   │   └── authentication.py
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── campaigns/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── abi/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── contracts.ts
│   │   │   ├── ipfs.ts
│   │   │   └── wagmi.ts
│   │   ├── pages/
│   │   └── types/
│   └── package.json
│
├── indexer/
│   ├── consumer/
│   ├── producer/
│   ├── messaging/
│   ├── eth/
│   ├── db/
│   ├── tests/
│   └── requirements.txt
│
├── smartcontract/
│   ├── contracts/
│   │   ├── Campaign.sol
│   │   └── CampaignFactory.sol
│   ├── scripts/
│   ├── test/
│   ├── hardhat.config.ts
│   └── package.json
│
└── README.md
```

## 🧠 Design Principles

### Blockchain as the source of truth

Financial operations and campaign rules are enforced by smart contracts. The backend database should not be considered authoritative for custody of funds.

### Event-driven synchronization

Blockchain events are transformed into messages and persisted into PostgreSQL, allowing the application to support filtering, pagination, search, statistics, and historical event queries without repeatedly querying the chain directly.

### Separation of responsibilities

```text
Smart contracts → Financial state and fund custody
Indexer          → Blockchain → database synchronization
PostgreSQL       → Queryable read model
Django           → API/application layer
React            → User experience
IPFS             → Campaign metadata
```

## ⚠️ Production Checklist

Before production deployment:

- Set `DEBUG=False`
- Generate strong, unique secrets
- Configure production `ALLOWED_HOSTS` and CORS origins
- Use HTTPS
- Use production WSGI/ASGI infrastructure
- Secure PostgreSQL and RabbitMQ credentials
- Protect IPFS/Pinata credentials
- Configure monitoring, logging, and health checks
- Back up PostgreSQL
- Use reliable RPC infrastructure and appropriate confirmation depth
- Verify deployed contract addresses
- Verify source code on the relevant block explorer
- Remove all development credentials and test keys
- Perform an independent smart-contract security review
- Test indexer recovery, replay, reorganization, and database rebuild procedures

## 🩺 Troubleshooting

### Backend cannot connect to PostgreSQL

Check service status and verify database host, port, credentials, and database name:

```bash
docker compose ps
docker compose logs postgres
```

### Indexer cannot connect to RabbitMQ

Verify RabbitMQ is running and that `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USER`, and `RABBITMQ_PASSWORD` match the running broker.

### Indexer is not receiving events

Verify:

1. Hardhat/Ethereum node is running
2. RPC URL is correct
3. Factory address is correct
4. Chain ID is correct
5. Contracts are deployed
6. Producer is running
7. RabbitMQ queues are available

### RabbitMQ queues are filling up

Inspect consumer logs and the dead-letter queue. Common causes include database connectivity issues, invalid payloads, consumer exceptions, or insufficient worker capacity.

## 🤝 Contributing

Contributions are welcome.

Create a feature branch:

```bash
git checkout -b feature/my-feature
```

Before opening a pull request:

- Keep changes focused
- Add tests for new behavior
- Update relevant documentation
- Never commit secrets or private keys
- Run the relevant test and lint commands
- Verify compatibility between contracts, ABIs, indexer, backend, and frontend

## 📚 Component Documentation

Additional component-level documentation is available in:

- `backend/README.md`
- `smartcontract/README.md`
- `smartcontract/SETUP.md`
- `indexer/README.md`
- `frontend/README.md`

## 📄 License

This project is licensed under the **MIT License**.

## ⚠️ Disclaimer

CrowdFunding is software for decentralized crowdfunding. The smart contracts can control cryptocurrency funds. Do not use the system with real funds or deploy it to a production network without appropriate security testing, operational hardening, and independent smart-contract review.

## 🌟 Project Highlights

CrowdFunding demonstrates how decentralized and traditional application infrastructure can work together:

```text
React / TypeScript
       │
       ▼
Web3 / wagmi / RainbowKit
       │
       ▼
Ethereum Smart Contracts
       │
     Events
       │
       ▼
Blockchain Indexer
       │
       ▼
RabbitMQ
       │
       ▼
PostgreSQL
       │
       ▼
Django REST API

IPFS / Pinata
       │
       ▼
Campaign Metadata
```

The architecture keeps **financial rules and custody on-chain** while using conventional backend infrastructure for **indexing, querying, authentication, analytics, and user experience**.
