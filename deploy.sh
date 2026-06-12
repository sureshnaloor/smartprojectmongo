#!/bin/bash

# Production Deployment Script for SmartProject
# This script properly handles building with dev dependencies

set -e  # Exit on error

echo "🚀 Starting SmartProject Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
echo "📦 Node.js version: $(node -v)"

if [ "$NODE_VERSION" != "20" ] && [ "$NODE_VERSION" != "22" ]; then
    echo -e "${YELLOW}⚠️  Warning: Backend requires Node 20.x, but you have Node $NODE_VERSION${NC}"
    echo -e "${YELLOW}   This may cause issues. Consider using nvm to switch to Node 20.x${NC}"
fi

# Step 1: Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install

# Step 2: Build Frontend (needs dev dependencies for vite)
echo ""
echo "🏗️  Building frontend (this requires dev dependencies)..."
cd frontend-smartproject

# Install ALL dependencies (including dev) for building
echo "   Installing frontend dependencies (including dev dependencies)..."
npm install  # This installs both prod and dev dependencies

# Build the frontend
echo "   Building frontend with Vite..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Frontend build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build completed successfully${NC}"
cd ..

# Step 3: Setup Backend
echo ""
echo "🔧 Setting up backend..."
cd backend-smartproject

# For backend, we can use --omit=dev for production runtime
# But first install all to ensure everything works
echo "   Installing backend dependencies..."
npm install

# Backend doesn't need a build step (uses tsx), but verify it's ready
echo "   Backend setup complete (using tsx for runtime)"
cd ..

echo ""
echo -e "${GREEN}✅ Deployment preparation completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure your .env file in backend-smartproject/"
echo "2. Run database migrations if needed"
echo "3. Start the server with: cd backend-smartproject && npm start"
echo "   Or use PM2: pm2 start npm --name 'smartproject-api' -- start"
