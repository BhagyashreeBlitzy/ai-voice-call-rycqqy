# AI Voice Agent Backend Services

Enterprise-grade backend services for real-time voice interaction with AI, featuring WebSocket communication, scalable microservices architecture, and comprehensive security measures.

## Prerequisites

- Node.js >= 20.0.0 LTS
- Docker >= 24.0.0
- Docker Compose >= 2.0.0
- PostgreSQL >= 15.0
- Redis >= 7.0
- pnpm >= 8.0.0
- Git >= 2.0.0

## Quick Start

```bash
# Clone repository and install dependencies
git clone <repository-url>
cd src/backend
pnpm install

# Configure environment
cp .env.example .env

# Setup database
pnpm run prisma:generate
pnpm run prisma:migrate

# Start development environment
docker-compose up -d
pnpm run dev
```

## Project Structure

```
src/backend/
├── src/                    # Source code
│   ├── api/               # API routes and controllers
│   ├── services/          # Business logic services
│   ├── models/            # Data models and types
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration files
│   └── server.ts          # Application entry point
├── prisma/                # Database schema and migrations
├── tests/                 # Test files
├── docker/                # Docker configuration
└── dist/                  # Compiled code
```

## Development

### Available Scripts

```bash
# Development
pnpm run dev              # Start development server
pnpm run build           # Build production bundle
pnpm run lint            # Run ESLint
pnpm run format          # Format code with Prettier

# Testing
pnpm run test            # Run all tests
pnpm run test:watch      # Run tests in watch mode
pnpm run test:coverage   # Generate coverage report

# Database
pnpm run prisma:generate # Generate Prisma client
pnpm run prisma:migrate  # Run database migrations

# Docker
pnpm run docker:build    # Build Docker image
pnpm run docker:run      # Run Docker container
```

### Environment Configuration

Key environment variables required for development:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/voice_agent
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret
API_RATE_LIMIT=100
WEBSOCKET_HEARTBEAT_INTERVAL=30
```

## Architecture

### Core Components

- **API Gateway**: Express.js-based REST API (Port 3000)
- **WebSocket Server**: Real-time voice communication (Port 8080)
- **Session Service**: Redis-based session management
- **Conversation Service**: Dialog management and persistence
- **Database**: PostgreSQL for persistent storage
- **Cache**: Redis for session and response caching

### API Documentation

#### REST Endpoints

```
POST   /api/v1/auth              # User authentication
POST   /api/v1/sessions          # Create session
GET    /api/v1/conversations     # List conversations
POST   /api/v1/conversations     # Start conversation
GET    /api/v1/voices           # List available voices
```

#### WebSocket Protocol

```
ws://hostname:8080/stream       # Audio streaming endpoint
```

### Security Features

- JWT-based authentication
- Rate limiting per IP and user
- CORS protection
- Helmet security headers
- Input validation
- SQL injection prevention
- XSS protection

## Testing

### Test Categories

- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full flow testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability scanning

### Coverage Requirements

```json
{
  "branches": 80,
  "functions": 80,
  "lines": 80,
  "statements": 80
}
```

## Deployment

### Production Build

```bash
# Build production bundle
pnpm run build

# Run database migrations
pnpm run prisma:migrate

# Start production server
NODE_ENV=production pnpm start
```

### Docker Deployment

```bash
# Build production image
docker build -t ai-voice-agent-backend .

# Run container
docker run -p 3000:3000 -p 8080:8080 ai-voice-agent-backend
```

### Health Monitoring

- Health check endpoint: `/health`
- Prometheus metrics: `/metrics`
- Application logs: `./logs/`

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL connection string
   - Check database service status
   - Ensure migrations are up to date

2. **WebSocket Connection Issues**
   - Verify WebSocket port accessibility
   - Check client connection parameters
   - Monitor server logs for connection errors

3. **Performance Issues**
   - Monitor Redis cache hit ratio
   - Check database query performance
   - Verify resource allocation in Docker

### Debug Mode

```bash
# Enable debug logging
DEBUG=voice-agent:* pnpm run dev

# Attach debugger
pnpm run dev --inspect
```

## Support

For technical support and contributions:

1. Check existing issues in the repository
2. Submit detailed bug reports with reproduction steps
3. Follow contribution guidelines for pull requests
4. Contact the development team for critical issues

## License

Copyright © 2023. All rights reserved.