#!/bin/bash

# ============================================
# Healthcare Conversation Platform - Database Setup
# ============================================
# Creates database and user in HAL9000 shared PostgreSQL
#
# Usage:
#   ./scripts/create-postgres-db.sh              # Interactive mode
#   ./scripts/create-postgres-db.sh --production # Use production credentials
#
# Prerequisites:
#   - HAL9000 PostgreSQL container must be running
#   - Docker must be accessible
# ============================================

set -e

# Configuration
CONTAINER_NAME="hal9000-postgres"
DB_NAME="conversationdb"

# Dedicated user for this application (better security than using superuser)
APP_DB_USER="conversation_user"
APP_DB_PASSWORD="Hc9Kp2mX7vR4nL6qW8sT3jF5bY1aD0eG"  # Generated secure password

# HAL9000 PostgreSQL superuser credentials (from .env.contabo18)
# These are used to CREATE the database and user
POSTGRES_SUPERUSER="postgres"
POSTGRES_SUPERUSER_PASSWORD="qCKO4bLYIzhmaxQtszgsEKWtpRO9pWBS"

# Parse arguments
ENVIRONMENT="development"
if [[ "$1" == "--production" ]]; then
    ENVIRONMENT="production"
fi

echo "============================================"
echo "Healthcare Conversation Platform - DB Setup"
echo "============================================"
echo "Environment: $ENVIRONMENT"
echo "Container: $CONTAINER_NAME"
echo "Database: $DB_NAME"
echo "App User: $APP_DB_USER"
echo "============================================"
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: Container '$CONTAINER_NAME' is not running."
    echo "Please start HAL9000 infrastructure first:"
    echo "  cd /opt/system-infra && ./scripts/up.sh"
    exit 1
fi

echo "Step 1: Checking if database '$DB_NAME' exists..."
DB_EXISTS=$(docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_SUPERUSER}" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
    echo "  Database '$DB_NAME' already exists."
else
    echo "  Creating database '$DB_NAME'..."
    docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_SUPERUSER}" -d postgres -c \
        "CREATE DATABASE ${DB_NAME};"
    echo "  Database created successfully."
fi

echo ""
echo "Step 2: Checking if user '$APP_DB_USER' exists..."
USER_EXISTS=$(docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_SUPERUSER}" -d postgres -tAc \
    "SELECT 1 FROM pg_roles WHERE rolname='${APP_DB_USER}'" 2>/dev/null || echo "")

if [ "$USER_EXISTS" = "1" ]; then
    echo "  User '$APP_DB_USER' already exists. Updating password..."
    docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_SUPERUSER}" -d postgres -c \
        "ALTER USER ${APP_DB_USER} WITH PASSWORD '${APP_DB_PASSWORD}';"
else
    echo "  Creating user '$APP_DB_USER'..."
    docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_SUPERUSER}" -d postgres -c \
        "CREATE USER ${APP_DB_USER} WITH PASSWORD '${APP_DB_PASSWORD}';"
fi
echo "  User configured successfully."

echo ""
echo "Step 3: Granting privileges..."
docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_SUPERUSER}" -d postgres -c \
    "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${APP_DB_USER};"

# Grant schema privileges (required for Prisma)
docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_SUPERUSER}" -d "${DB_NAME}" -c \
    "GRANT ALL ON SCHEMA public TO ${APP_DB_USER};"
docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_SUPERUSER}" -d "${DB_NAME}" -c \
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${APP_DB_USER};"
docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_SUPERUSER}" -d "${DB_NAME}" -c \
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${APP_DB_USER};"

echo "  Privileges granted successfully."

echo ""
echo "Step 4: Enabling pgvector extension (for future AI features)..."
docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_SUPERUSER}" -d "${DB_NAME}" -c \
    "CREATE EXTENSION IF NOT EXISTS vector;"
echo "  pgvector extension enabled."

echo ""
echo "============================================"
echo "Database setup completed successfully!"
echo "============================================"
echo ""
echo "Connection Strings:"
echo ""
echo "For LOCAL development (.env):"
echo "  DATABASE_URL=postgresql://${APP_DB_USER}:${APP_DB_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""
echo "For DOCKER containers on hal9000-network:"
echo "  DATABASE_URL=postgresql://${APP_DB_USER}:${APP_DB_PASSWORD}@hal9000-postgres:5432/${DB_NAME}"
echo ""
echo "For PRODUCTION server (.env.production):"
echo "  DATABASE_URL=postgresql://${APP_DB_USER}:${APP_DB_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""
echo "============================================"
echo ""
echo "Alternative: Using postgres superuser (simpler but less secure):"
echo "  DATABASE_URL=postgresql://${POSTGRES_SUPERUSER}:${POSTGRES_SUPERUSER_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""
