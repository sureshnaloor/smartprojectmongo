# Quick Deployment Guide

## The Problem You Encountered

When you ran:
```bash
npm ci --only=production
npm run build
```

You got `vite: command not found` because:
- `vite` is a **dev dependency** (needed for building)
- `--only=production` excludes dev dependencies
- You need dev dependencies to build, but not to run

## The Solution

### For Building (Development Dependencies Required)

```bash
# Install ALL dependencies (including dev) for building
cd frontend-smartproject
npm install  # NOT npm ci --only=production
npm run build
```

### For Production Runtime (Production Dependencies Only)

After building, you can optionally remove dev dependencies:
```bash
npm prune --production
```

## Quick Deploy Commands

### Option 1: Use the Deployment Script (Easiest)
```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

### Option 2: Manual Steps
```bash
# 1. Install root dependencies
npm install

# 2. Build frontend (needs dev dependencies)
cd frontend-smartproject
npm install  # Includes dev dependencies
npm run build
cd ..

# 3. Setup backend
cd backend-smartproject
npm install
cd ..
```

## Node Version Note

The backend specifies Node 20.x, but Node 22.x should work fine. The warning is just informational. If you encounter issues, use `nvm` to switch to Node 20:

```bash
nvm install 20
nvm use 20
```

## Summary

- ✅ **For building**: Use `npm install` (includes dev dependencies)
- ❌ **Don't use**: `npm ci --only=production` before building
- ✅ **For runtime**: After building, you can use `npm prune --production` to clean up
