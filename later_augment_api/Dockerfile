# syntax=docker/dockerfile:1.4
# This line is a Dockerfile linter hint, ensuring you use a recent syntax version.

# Stage 1: Build Stage (for installing gems and other build-time dependencies)
# Using a slightly larger image for build, then copying only what's needed to a smaller runtime image.
# This helps keep the final image size down.
FROM ruby:3.2.0-slim-bullseye AS base

# Set environment variables for consistency
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    RAILS_ENV=development \
    BUNDLE_JOBS=4 \
    BUNDLE_RETRY=3 \
    BUNDLE_PATH=/bundle

# Install system dependencies required for Ruby gems and Rails itself.
# `build-essential` is for compiling native extensions (e.g., for `pg` gem).
# `libpq-dev` is the PostgreSQL client library.
# `nodejs` and `npm` are needed if you precompile assets (even if API-only Rails, sometimes assets are used for front-end frameworks).
# `git` is useful if any gems are pulled directly from Git repositories.
RUN apt-get update -qq && apt-get install -yq --no-install-recommends \
    build-essential \
    libpq-dev \
    nodejs \
    npm \
    git \
    ruby-dev \   
    libffi-dev \ 
    libxml2-dev \
    libxslt1-dev \    
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside the container
WORKDIR /app

# Copy Gemfile and Gemfile.lock first to leverage Docker's build cache.
# If Gemfile.lock doesn't change, this layer (and subsequent bundle install) won't rebuild.
COPY Gemfile Gemfile.lock ./

# Install RubyGems dependencies.
# Using --without development test ensures production image is smaller, but for dev, we need all.
# Since this is for the `base` image which will then be copied, `without` is good.
RUN bundle install --jobs $(nproc) --without development test

# Copy the rest of the application code
COPY . .

# Expose the port Rails will run on.
# This is mainly for documentation and network configuration in docker-compose.
EXPOSE 3000

# Entrypoint script for Rails applications
# This handles common Rails issues like removing stale PIDs and running migrations (optional)
# We'll put this in a separate file called entrypoint.sh in the same directory.
# This CMD is the default that will run if no other command is specified when starting the container.
CMD ["/app/entrypoint.sh"]