#!/bin/bash
# =============================================================================
# Backend Entrypoint Script
# =============================================================================
# This script:
# 1. Waits for PostgreSQL to be ready
# 2. Runs database migrations
# 3. Optionally flushes the database (CLEAN_SLATE=true)
# 4. Creates a superuser if it doesn't exist
# 5. Starts the Django development server
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Starting Backend Entrypoint Script${NC}"
echo -e "${GREEN}========================================${NC}"

# =============================================================================
# 1. Wait for PostgreSQL to be ready
# =============================================================================
echo -e "${YELLOW}Waiting for PostgreSQL...${NC}"

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

while ! nc -z "$DB_HOST" "$DB_PORT"; do
    echo "PostgreSQL is not ready - waiting..."
    sleep 1
done

echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Additional wait to ensure PostgreSQL is fully accepting connections
sleep 2

# =============================================================================
# 2. Run database migrations
# =============================================================================
echo -e "${YELLOW}Running database migrations...${NC}"
python manage.py migrate --noinput
echo -e "${GREEN}Migrations complete!${NC}"

# =============================================================================
# 3. Clean slate mode (optional)
# =============================================================================
if [ "${CLEAN_SLATE:-false}" = "true" ]; then
    echo -e "${YELLOW}CLEAN_SLATE is enabled - flushing database...${NC}"
    python manage.py flush --no-input
    echo -e "${GREEN}Database flushed!${NC}"
fi

# =============================================================================
# 4. Create superuser if it doesn't exist
# =============================================================================
SUPERUSER_USERNAME="${SUPERUSER_USERNAME:-mostafa}"
SUPERUSER_EMAIL="${SUPERUSER_EMAIL:-mostafa@example.com}"
SUPERUSER_PASSWORD="${SUPERUSER_PASSWORD:-1}"

echo -e "${YELLOW}Checking for superuser '${SUPERUSER_USERNAME}'...${NC}"

python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()

username = "${SUPERUSER_USERNAME}"
email = "${SUPERUSER_EMAIL}"
password = "${SUPERUSER_PASSWORD}"

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f"Superuser '{username}' created successfully!")
else:
    print(f"Superuser '{username}' already exists.")
EOF

echo -e "${GREEN}Superuser check complete!${NC}"

# =============================================================================
# 5. Create initial Chain record for Hardhat Local
# =============================================================================
echo -e "${YELLOW}Ensuring Hardhat Local chain exists...${NC}"

python manage.py shell << EOF
from core.models import Chain

chain_id = 31337
chain_name = "Hardhat Local"

chain, created = Chain.objects.get_or_create(
    chain_id=chain_id,
    defaults={
        'name': chain_name,
        'rpc_url': 'http://hardhat-node:8545',
        'is_active': True,
    }
)

if created:
    print(f"Chain '{chain_name}' (ID: {chain_id}) created!")
else:
    print(f"Chain '{chain_name}' (ID: {chain_id}) already exists.")
EOF

echo -e "${GREEN}Chain setup complete!${NC}"

# =============================================================================
# 6. Start the Django development server
# =============================================================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Starting Django development server...${NC}"
echo -e "${GREEN}========================================${NC}"

exec python manage.py runserver 0.0.0.0:8000
