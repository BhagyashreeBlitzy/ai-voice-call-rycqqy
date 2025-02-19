# AI Voice Agent Web Frontend

Enterprise-grade React application for real-time voice interactions with AI, featuring WebRTC audio processing, accessibility compliance, and comprehensive internationalization support.

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Modern web browser:
  - Chrome >= 83
  - Firefox >= 78
  - Safari >= 14
  - Edge >= 88

## Installation

```bash
# Install dependencies with exact versions
pnpm install

# Verify setup
pnpm typecheck
```

## Development

### Available Commands

```bash
# Start development server with hot reload
pnpm dev

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Run tests
pnpm test                # Unit and integration tests
pnpm test:watch         # Watch mode
pnpm test:e2e           # End-to-end tests
pnpm test:a11y          # Accessibility tests

# Analyze bundle size
pnpm analyze
```

### Environment Configuration

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3001
VITE_SENTRY_DSN=your-sentry-dsn
```

## Project Structure

```
src/
├── assets/          # Static assets
├── components/      # Reusable UI components
├── config/          # Configuration files
├── features/        # Feature-based modules
├── hooks/           # Custom React hooks
├── i18n/            # Internationalization
├── layouts/         # Page layouts
├── lib/             # Utility libraries
├── pages/           # Route pages
├── services/        # API services
├── store/           # Redux store
├── styles/          # Global styles
├── types/           # TypeScript types
└── utils/           # Utility functions
```

## Core Dependencies

- React 18.2.0 - UI framework
- Redux Toolkit 2.0.0 - State management
- Material UI 5.0.0 - Component library
- WebRTC Adapter 8.2.3 - WebRTC compatibility
- Socket.io-client 4.7.0 - WebSocket communication
- i18next 23.5.0 - Internationalization

## Testing

### Unit & Integration Tests

- Jest and React Testing Library
- Run with `pnpm test`
- Coverage requirements: 80% minimum

### E2E Testing

- Cypress for end-to-end testing
- Run with `pnpm test:e2e`
- Tests critical user flows

### Accessibility Testing

- WCAG 2.1 Level AA compliance
- Automated testing with axe-core
- Run with `pnpm test:a11y`

## Building

```bash
# Production build
pnpm build

# Preview production build
pnpm preview
```

### Build Optimization

- Code splitting by route
- Tree shaking enabled
- Asset optimization
- Lazy loading for heavy components

## Deployment

### Production Deployment

1. Build the application
2. Verify environment variables
3. Deploy to CDN/hosting service
4. Verify SSL configuration
5. Test production build

### CI/CD Pipeline

- Automated testing
- Build verification
- Bundle size monitoring
- Accessibility checks
- Security scanning

## Browser Support

Verified browser support:
- Chrome >= 83
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## Accessibility (a11y)

- WCAG 2.1 Level AA compliant
- Screen reader optimized
- Keyboard navigation support
- Focus management
- ARIA attributes
- Color contrast compliance

## Performance

### Metrics

- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Lighthouse score > 90
- Bundle size < 250KB (initial load)

### Optimizations

- Code splitting
- Tree shaking
- Image optimization
- Caching strategies
- Performance monitoring

## Security

- CSP implementation
- XSS prevention
- CSRF protection
- Secure WebSocket
- Input sanitization
- Dependency scanning

## Internationalization

- RTL support
- Dynamic language loading
- Number and date formatting
- Locale detection
- Translation management

## Contributing

1. Fork the repository
2. Create feature branch
3. Follow coding standards
4. Write tests
5. Submit pull request

### Code Standards

- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Component documentation
- Test coverage requirements

## License

Private - All rights reserved

## Support

Contact the development team for support:
- Email: dev-team@example.com
- Internal: #web-frontend channel