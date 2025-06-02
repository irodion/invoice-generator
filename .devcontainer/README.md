# DevPod Configuration for Google Sheets Invoice Generator

This directory contains configuration files for setting up a development environment using DevPod.

## Features

- Node.js 18 environment
- TypeScript support
- Clasp (Google Apps Script CLI) pre-installed
- ESLint and Prettier for code quality
- Volume mounts for persistent clasp authentication

## Getting Started

1. Create a DevPod workspace using this configuration
2. Once the container is running, authenticate with Google:
   ```bash
   clasp login
   ```
3. If you have an existing Apps Script project, clone it:
   ```bash
   clasp clone <scriptId>
   ```
   Or create a new one:
   ```bash
   clasp create --title "Google Sheets Invoice Generator" --rootDir ./build
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Build the TypeScript code:
   ```bash
   npm run build
   ```
6. Push changes to Google Apps Script:
   ```bash
   npm run push
   ```

## Development Workflow

- Use `npm run watch` to automatically compile TypeScript changes
- Use `npm run push` to push changes to Google Apps Script
- Use `npm run open` to open the project in the Google Apps Script editor

## Configuration Files

- `devcontainer.json`: Main DevPod configuration
- `Dockerfile`: Custom image configuration
- `docker-compose.yml`: Container orchestration
- `scripts/initialize.sh`: Initialization script that runs on container creation
