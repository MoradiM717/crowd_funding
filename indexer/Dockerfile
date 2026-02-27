# =============================================================================
# Indexer Dockerfile - Producer and Consumer Services
# =============================================================================
# This image is used for both the indexer-producer and indexer-consumer
# services. The specific service is started via entrypoint scripts.
# =============================================================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # PostgreSQL client for database operations
    postgresql-client \
    # Network utilities for health checks and connectivity
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make entrypoint scripts executable
RUN chmod +x /app/entrypoint-producer.sh /app/entrypoint-consumer.sh

# Default command (overridden in docker-compose)
CMD ["python", "-m", "indexer"]
