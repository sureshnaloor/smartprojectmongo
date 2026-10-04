#!/bin/bash

# Production Deployment Script (Optimized for DigitalOcean)
# This script installs dev dependencies for building, then cleans up

set -e  # Exit on error

echo "🚀 Starting Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install

# Step 2: Build Frontend
echo ""
echo "🏗️  Building frontend..."
cd frontend-smartproject

# Install ALL dependencies (including dev) for building
echo "   Installing frontend dependencies (including dev dependencies for build)..."
npm install

# Build the frontend (raise Node heap — Vite OOM on 2GB droplets otherwise)
echo "   Building frontend with Vite..."
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Frontend build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build completed${NC}"

# Optional: Remove dev dependencies after build to save space
# Uncomment the next line if you want to clean up dev dependencies
# echo "   Cleaning up dev dependencies..."
# npm prune --production

cd ..

# Step 3: Setup Backend
echo ""
echo "🔧 Setting up backend..."
cd backend-smartproject

# Install backend dependencies
echo "   Installing backend dependencies..."
npm install

# Backend uses tsx, so no build step needed
echo -e "${GREEN}✅ Backend setup complete${NC}"
cd ..

echo ""
echo -e "${GREEN}✅ Production deployment completed!${NC}"
echo ""
echo "The frontend is built in: frontend-smartproject/dist/"
echo "Start the backend with: cd backend-smartproject && npm start"
