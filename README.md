# AI Voice Agent

Enterprise-grade web application enabling natural, real-time voice conversations between users and AI assistants through standard web browsers.

## Features

- Real-time voice conversations with <500ms latency
- High-quality speech recognition with >95% accuracy
- Context-aware natural language processing
- High-quality voice synthesis with multiple voice options
- Browser-based interface with visual feedback
- Enterprise-grade security and monitoring
- Comprehensive internationalization support

## Prerequisites

- Node.js >= 20.0.0 LTS
- Docker >= 24.0.0
- Docker Compose >= 2.0.0
- pnpm >= 8.0.0
- Modern web browser:
  - Chrome >= 83
  - Firefox >= 78
  - Safari >= 14
  - Edge >= 88

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd ai-voice-agent

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env

# Start development environment
docker-compose up -d
pnpm dev
```

## Project Structure

```
├── src/
│   ├── web/                 # Frontend application
│   │   ├── components/      # React components
│   │   ├── features/        # Feature modules
│   │   ├── services/        # API services
│   │   └── utils/           # Utility functions
│   │
│   ├── backend/            # Backend services
│   │   ├── api/            # API routes
│   │   ├── services/       # Business logic
│   │   ├── models/         # Data models
│   │   └── utils/          # Utility functions
│   │
│   └── shared/            # Shared code
├── docs/                  # Documentation
├── tests/                # Test suites
└── docker/              # Docker configuration
```

## Development

### Frontend Development

```bash
# Start frontend development server
cd src/web
pnpm dev

# Run tests
pnpm test
pnpm test:e2e
pnpm test:a11y

# Build for production
pnpm build
```

### Backend Development

```bash
# Start backend services
cd src/backend
pnpm dev

# Run tests
pnpm test
pnpm test:coverage

# Build for production
pnpm build
```

## Core Technologies

### Frontend
- React 18.2.0 - UI framework
- Redux Toolkit 2.0.0 - State management
- Material UI 5.0.0 - Component library
- WebRTC Adapter 8.2.3 - WebRTC compatibility
- Socket.io-client 4.7.0 - WebSocket communication

### Backend
- Node.js 20 LTS - Runtime environment
- Express 4.18.2 - API framework
- PostgreSQL 15 - Primary database
- Redis 7.0 - Session and cache storage
- WebSocket - Real-time communication

## API Documentation

### REST Endpoints
```
POST   /api/v1/auth              # User authentication
POST   /api/v1/sessions          # Create session
GET    /api/v1/conversations     # List conversations
POST   /api/v1/conversations     # Start conversation
GET    /api/v1/voices           # List available voices
```

### WebSocket Protocol
```
ws://hostname:8080/stream       # Audio streaming endpoint
```

## Deployment

### Production Build

```bash
# Build all services
pnpm build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

### Infrastructure Requirements

- Minimum 4GB RAM
- 2 CPU cores
- PostgreSQL 15+
- Redis 7.0+
- SSL certificate
- CDN for static assets

## Security Features

- JWT-based authentication
- Rate limiting and DDoS protection
- CORS and CSP policies
- Input validation and sanitization
- Data encryption at rest and in transit
- Regular security audits
- GDPR compliance measures

## Performance Metrics

- Speech recognition accuracy: >95%
- End-to-end latency: <2 seconds
- System uptime: >99.9%
- First-time user success rate: >90%
- API response time: <500ms

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open pull request

## License

Copyright © 2023. All rights reserved.

## Support

For technical support and contributions:
- GitHub Issues: Report bugs and feature requests
- Documentation: [docs/](docs/)
- Email: dev-team@example.com