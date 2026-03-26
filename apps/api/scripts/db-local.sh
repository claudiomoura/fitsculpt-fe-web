#!/bin/bash
# scripts/db-local.sh - Run commands against local PostgreSQL

# Load .env.local
set -a
source "$(dirname "$0")/../.env.local"
set +a

# Run the command
cd "$(dirname "$0")/.."
"$@"
