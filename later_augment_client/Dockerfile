# syntax=docker/dockerfile:1.4

# Use the official Node.js image as the base
FROM node:20.12.2-alpine AS base

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) first
# to leverage Docker's layer caching.
# This ensures that npm install only runs if these files change.
COPY package.json ./
COPY package-lock.json ./

# If you're using yarn (check your project if it uses npm or yarn/pnpm):
# COPY yarn.lock ./ # For Yarn
# COPY pnpm-lock.yaml ./ # For pnpm

# Install Node.js dependencies
# Using `npm ci` is good practice for CI/CD and Docker builds for consistent installs
RUN npm ci

# Copy the rest of the application code
# This is done after npm install so that code changes don't invalidate the node_modules layer
COPY . .

# Expose the port where the Vite development server will run
# Vite often defaults to 5173 for dev, but can be 3000 if configured
EXPOSE 5173

# Command to run the Vite development server
# Vite typically uses `npm run dev`
CMD ["npm", "run", "dev"]