# Backend Setup Guide

## Introduction

Welcome to the Node.js Tutorial Application setup guide! This document provides comprehensive instructions for setting up and running a simple Node.js backend server using Express.js. This tutorial application demonstrates fundamental server-side JavaScript concepts through a single `/hello` endpoint that returns "Hello world".

This guide is designed for beginning Node.js developers, educational institutions, and anyone looking to understand the basics of creating a web server with Node.js and Express. The application uses modern technologies including Node.js 18+ and Express 5.1.0, following current best practices and security standards.

## Prerequisites

Before you begin, ensure you have the following software installed on your system:

### Required Software

| Software | Minimum Version | Recommended Version | Purpose |
|----------|----------------|-------------------|---------|
| **Node.js** | 18.x | 22.x LTS | JavaScript runtime environment |
| **npm** | 11.4.2+ | Latest (bundled with Node.js) | Package manager |
| **Git** | Any recent version | Latest | Version control (optional) |

### Version Verification

Check your installed versions by running these commands in your terminal:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version (optional)
git --version
```

**Expected Output:**
```
v22.11.0  # or higher
11.4.2    # or higher
```

### Installation Instructions

If you need to install or update Node.js:

1. **Download Node.js** from the official website: https://nodejs.org/
2. **Choose the LTS version** (Long Term Support) for stability
3. **Run the installer** and follow the installation wizard
4. **Verify installation** using the commands above

**Note:** npm is automatically installed with Node.js, so you don't need to install it separately.

## Cloning the Repository

If you're working with a Git repository, clone it to your local machine:

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd <project-name>

# Navigate to the backend directory
cd src/backend
```

If you're starting from downloaded files, simply extract them and navigate to the `src/backend` directory.

## Installing Dependencies

The application uses Express.js as its web framework. Follow these steps to install all required dependencies:

### Step 1: Initialize the Project (if needed)

If you're starting from scratch, initialize a new Node.js project:

```bash
# Initialize package.json
npm init -y
```

### Step 2: Install Express Framework

Install Express 5.1.0, which is the latest stable version:

```bash
# Install Express (production dependency)
npm install express@5.1.0
```

### Step 3: Install Development Dependencies (Optional)

For enhanced development experience, install nodemon to automatically restart the server when files change:

```bash
# Install nodemon (development dependency)
npm install --save-dev nodemon
```

### Step 4: Verify Installation

Check that dependencies were installed correctly:

```bash
# View installed packages
npm list

# Check for vulnerabilities
npm audit
```

**Expected Output:**
```
├── express@5.1.0
└── nodemon@x.x.x (devDependencies)
```

## Environment Configuration

The application supports environment-based configuration for flexible deployment.

### Step 1: Create Environment File

Create a `.env` file in the `src/backend` directory for local development:

```bash
# Create .env file
touch .env
```

### Step 2: Configure Environment Variables

Add the following configuration to your `.env` file:

```env
# Server Configuration
PORT=3000

# Development Settings
NODE_ENV=development
```

### Step 3: Environment Variables Explanation

| Variable | Purpose | Default Value | Required |
|----------|---------|---------------|----------|
| `PORT` | HTTP server port | 3000 | No |
| `NODE_ENV` | Environment mode | development | No |

### Platform-Specific Instructions

**Windows (Command Prompt):**
```cmd
set PORT=3000
```

**Windows (PowerShell):**
```powershell
$env:PORT=3000
```

**macOS/Linux:**
```bash
export PORT=3000
```

## Running the Application

You can start the application using several methods:

### Method 1: Using npm start

```bash
# Start the application
npm start
```

### Method 2: Direct Node.js execution

```bash
# Run the server directly
node server.js
```

### Method 3: Development mode with nodemon

```bash
# Start with auto-restart (if nodemon is installed)
npm run dev

# OR
npx nodemon server.js
```

### Expected Startup Output

When the server starts successfully, you should see:

```
Server is running on port 3000
Server started successfully
Express server initialized
```

**Note:** The exact output may vary depending on your server implementation.

## Verifying the Setup

After starting the server, verify that everything is working correctly:

### Step 1: Test the Hello Endpoint

**Using a Web Browser:**
1. Open your web browser
2. Navigate to: `http://localhost:3000/hello`
3. You should see: `Hello world`

**Using curl (Command Line):**
```bash
# Test the /hello endpoint
curl http://localhost:3000/hello

# Expected response:
# Hello world
```

**Using PowerShell (Windows):**
```powershell
# Test the /hello endpoint
Invoke-RestMethod -Uri http://localhost:3000/hello

# Expected response:
# Hello world
```

### Step 2: Test Error Handling

Test that the server handles non-existent routes properly:

```bash
# Test a non-existent route
curl http://localhost:3000/nonexistent

# Expected response:
# 404 Not Found
```

### Step 3: Verify Server Status

Check that the server is listening on the correct port:

```bash
# Check if port 3000 is in use (Linux/macOS)
lsof -i :3000

# Check if port 3000 is in use (Windows)
netstat -an | findstr :3000
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Port Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000          # Linux/macOS
netstat -ano | findstr :3000  # Windows

# Kill the process (replace PID with actual process ID)
kill -9 <PID>          # Linux/macOS
taskkill /PID <PID> /F # Windows

# Or use a different port
export PORT=3001
npm start
```

#### Issue 2: Node.js Version Mismatch

**Error Message:**
```
Error: Node.js version not supported
```

**Solution:**
1. Update Node.js to version 18 or higher
2. Verify version: `node --version`
3. Consider using Node Version Manager (nvm) for version management

#### Issue 3: npm Install Failures

**Error Message:**
```
npm ERR! code EACCES
npm ERR! permission denied
```

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Fix permissions (Linux/macOS)
sudo chown -R $(whoami) ~/.npm

# Or use npx for one-time package execution
npx express-generator
```

#### Issue 4: Module Not Found

**Error Message:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
rm package-lock.json
npm install
```

#### Issue 5: Server Won't Start

**Common Causes and Solutions:**

1. **Check file permissions:** Ensure server.js is readable
2. **Verify package.json:** Check start script definition
3. **Check for syntax errors:** Review server.js for JavaScript errors
4. **Ensure dependencies are installed:** Run `npm install`

### Debugging Tips

#### Enable Debug Mode

```bash
# Enable Express debugging
DEBUG=express:* npm start

# Enable all debugging
DEBUG=* npm start
```

#### Check Application Logs

Monitor the console output for error messages and debugging information.

#### Verify Environment Variables

```bash
# Check environment variables
env | grep PORT
echo $PORT
```

## Stopping the Server

To stop the server, use one of these methods:

**In the terminal where the server is running:**
- Press `Ctrl+C` (Windows/Linux/macOS)
- Press `Cmd+C` (macOS alternative)

**If running in background:**
```bash
# Find and kill the process
ps aux | grep node
kill <PID>
```

## Additional Resources

### Documentation

- **Node.js Official Documentation:** https://nodejs.org/en/docs/
- **Express.js Documentation:** https://expressjs.com/
- **npm Documentation:** https://docs.npmjs.com/

### Learning Resources

- **Node.js Tutorial:** https://nodejs.org/en/docs/guides/
- **Express.js Getting Started:** https://expressjs.com/en/starter/installing.html
- **JavaScript MDN Web Docs:** https://developer.mozilla.org/en-US/docs/Web/JavaScript

### Related Files in This Project

- `server.js` - Main application file
- `package.json` - Project configuration and dependencies
- `README.md` - Project overview and additional information
- `.env` - Environment configuration (create this file)

### Next Steps

After successfully setting up the backend server, consider exploring:

1. **API Documentation:** Review the available endpoints and their functionality
2. **Code Structure:** Examine the server.js file to understand the implementation
3. **Testing:** Learn how to write tests for the application
4. **Deployment:** Explore deployment options for production environments

### Support

If you encounter issues not covered in this guide:

1. Check the project's README.md for additional information
2. Review the official Node.js and Express.js documentation
3. Search for similar issues in the project's issue tracker
4. Ask for help from instructors or mentors if this is part of a course

---

**Congratulations!** You have successfully set up the Node.js tutorial application. The server should now be running and responding to requests at `http://localhost:3000/hello` with "Hello world".

This setup provides a solid foundation for learning Node.js and Express.js development concepts. From here, you can explore more advanced topics like middleware, routing, error handling, and deployment strategies.