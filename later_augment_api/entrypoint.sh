#!/bin/bash
set -e

# Remove a potentially pre-existing server.pid for Rails.
rm -f /app/tmp/pids/server.pid

# Run migrations ONLY if the database needs to be set up or updated.
# 'db:prepare' is robust: it runs db:create, db:migrate, and db:seed (if present)
# if the database doesn't exist or is not up-to-date.
echo "Running Rails database setup (db:prepare)..."
bundle exec rails db:prepare

# Then exec the container's main process (what's set as CMD in the Dockerfile
# or `command` in docker-compose.yml).
# This is crucial: it replaces the current shell with the specified command,
# ensuring signals (like Ctrl+C) are correctly handled.
echo "Starting Rails server..."
exec bundle exec rails server -b 0.0.0.0