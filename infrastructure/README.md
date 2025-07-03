# Node.js Tutorial Backend - Infrastructure Documentation

Comprehensive infrastructure documentation for the Node.js tutorial backend application demonstrating modern deployment patterns, containerization, and cloud deployment strategies.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
- [Docker and Docker Compose Deployment](#docker-and-docker-compose-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Platform Deployment](#cloud-platform-deployment)
- [CI/CD and Automation](#cicd-and-automation)
- [Environment Variables and Secrets](#environment-variables-and-secrets)
- [Security and Best Practices](#security-and-best-practices)
- [Monitoring and Observability](#monitoring-and-observability)
- [Scalability and Resource Management](#scalability-and-resource-management)
- [Troubleshooting and FAQ](#troubleshooting-and-faq)
- [References and Further Reading](#references-and-further-reading)

## Overview

This infrastructure layer provides comprehensive deployment and operational guidance for the Node.js tutorial backend application. Built with Express.js v5.1.0 and Node.js v22.x LTS, it demonstrates production-ready infrastructure patterns while maintaining educational clarity.

### Key Features

- **Multi-Environment Support**: Local development, Docker, Kubernetes, and cloud platforms
- **Production-Ready**: Security hardening, health checks, and resource management
- **Educational Focus**: Clear documentation and practical examples for learning
- **Automation**: CI/CD integration and deployment scripts
- **Scalability**: Horizontal and vertical scaling configurations
- **Observability**: Monitoring, logging, and health check implementations

### Supported Deployment Targets

| Environment | Technology | Use Case | Complexity |
|-------------|------------|----------|------------|
| Local Development | Node.js + Docker Compose | Development and testing | Low |
| Docker | Docker containers | Single-host deployment | Medium |
| Kubernetes | K8s manifests | Container orchestration | High |
| Heroku | Cloud PaaS | Simple cloud deployment | Low |
| Vercel | Serverless | Edge deployment | Medium |
| Google Cloud | Cloud Run | Serverless containers | Medium |

## Directory Structure

```
infrastructure/
├── README.md                          # This comprehensive documentation
├── docker/                            # Docker and Docker Compose configurations
│   ├── docker-compose.dev.yml         # Development environment orchestration
│   └── docker-compose.prod.yml        # Production environment orchestration
├── kubernetes/                        # Kubernetes deployment manifests
│   ├── backend-deployment.yaml        # Pod deployment specification
│   ├── backend-service.yaml           # Service definition and load balancing
│   ├── backend-ingress.yaml           # External traffic routing
│   ├── namespace.yaml                 # Logical resource isolation
│   ├── configmaps/                    # Non-sensitive configuration
│   │   └── backend-config.yaml        # Application configuration
│   └── secrets/                       # Sensitive configuration
│       └── backend-secrets.yaml       # Credentials and secrets
├── cloud/                             # Cloud platform configurations
│   ├── heroku.yml                     # Heroku deployment manifest
│   ├── vercel.json                    # Vercel serverless configuration
│   └── app.yaml                       # Google Cloud App Engine config
└── scripts/                           # Automation and deployment scripts
    ├── deploy.sh                      # Automated deployment script
    ├── setup-env.sh                   # Environment configuration script
    └── backup.sh                      # Backup utilities (for extensibility)
```

## Getting Started

### Prerequisites

Ensure you have the following tools installed:

- **Node.js**: v22.x LTS (recommended for production)
- **npm**: v11.x (included with Node.js)
- **Docker**: v20.10+ (for containerization)
- **Docker Compose**: v2.24+ (for multi-container orchestration)

### Quick Start with Docker Compose

1. **Clone and Navigate to Project**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Set Up Environment Variables**
   ```bash
   # Run the automated setup script
   bash infrastructure/scripts/setup-env.sh
   
   # Or manually copy and configure
   cp src/backend/.env.example src/backend/.env
   # Edit .env with your preferred settings
   ```

3. **Start Development Environment**
   ```bash
   # Start with Docker Compose (recommended)
   docker-compose -f infrastructure/docker/docker-compose.dev.yml up --build
   
   # Or start locally (alternative)
   cd src/backend
   npm install
   npm run dev
   ```

4. **Verify Deployment**
   ```bash
   # Test the /hello endpoint
   curl http://localhost:3000/hello
   # Expected response: "Hello world"
   
   # Check application health
   curl http://localhost:3000/health
   ```

### Environment Configuration

The application uses environment variables for configuration. Key variables include:

- **PORT**: HTTP server port (default: 3000)
- **NODE_ENV**: Runtime environment (development/production/test)
- **REQUEST_TIMEOUT_MS**: Request timeout in milliseconds (default: 30000)
- **LOG_LEVEL**: Logging verbosity (info/warn/error)

## Docker and Docker Compose Deployment

### Development Environment

The development configuration (`docker-compose.dev.yml`) provides:

- **Hot Reload**: Live code changes with nodemon
- **Volume Mounting**: Source code mounted for development
- **Environment Variables**: Loaded from .env file
- **Health Checks**: Automated service monitoring
- **Resource Limits**: Development-appropriate constraints

```bash
# Start development environment
docker-compose -f infrastructure/docker/docker-compose.dev.yml up --build

# View logs in real-time
docker-compose -f infrastructure/docker/docker-compose.dev.yml logs -f backend

# Stop development environment
docker-compose -f infrastructure/docker/docker-compose.dev.yml down
```

### Production Environment

The production configuration (`docker-compose.prod.yml`) provides:

- **Security Hardening**: Non-root user, read-only filesystem
- **Production Optimizations**: Minimal resource usage
- **Health Monitoring**: Comprehensive health checks
- **Graceful Shutdown**: Proper signal handling
- **Resource Limits**: Production-appropriate constraints

```bash
# Deploy to production
docker-compose -f infrastructure/docker/docker-compose.prod.yml up --build -d

# Monitor production deployment
docker-compose -f infrastructure/docker/docker-compose.prod.yml ps
docker-compose -f infrastructure/docker/docker-compose.prod.yml logs backend

# Stop production deployment
docker-compose -f infrastructure/docker/docker-compose.prod.yml down
```

### Single Container Deployment

For simple deployments, use Docker directly:

```bash
# Build the container image
cd src/backend
docker build -t nodejs-tutorial-backend .

# Run the container
docker run -d \
  --name nodejs-tutorial-backend \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  nodejs-tutorial-backend

# Check container status
docker ps
docker logs nodejs-tutorial-backend
```

## Kubernetes Deployment

### Prerequisites

- **Kubernetes Cluster**: v1.25+ (local: minikube, cloud: EKS/GKE/AKS)
- **kubectl**: v1.25+ configured for your cluster
- **Docker**: For building container images

### Deployment Steps

1. **Create Namespace** (Optional)
   ```bash
   kubectl apply -f infrastructure/kubernetes/namespace.yaml
   ```

2. **Apply Configuration**
   ```bash
   # Apply ConfigMap for non-sensitive configuration
   kubectl apply -f infrastructure/kubernetes/configmaps/backend-config.yaml
   
   # Apply Secrets for sensitive configuration
   kubectl apply -f infrastructure/kubernetes/secrets/backend-secrets.yaml
   ```

3. **Deploy Backend Service**
   ```bash
   # Deploy the backend application
   kubectl apply -f infrastructure/kubernetes/backend-deployment.yaml
   
   # Create service for internal access
   kubectl apply -f infrastructure/kubernetes/backend-service.yaml
   ```

4. **Configure External Access**
   ```bash
   # Apply ingress for external traffic (optional)
   kubectl apply -f infrastructure/kubernetes/backend-ingress.yaml
   ```

5. **Verify Deployment**
   ```bash
   # Check deployment status
   kubectl get deployments
   kubectl get pods
   kubectl get services
   
   # Check pod logs
   kubectl logs -l app=nodejs-tutorial-backend
   
   # Port forward for local access
   kubectl port-forward service/backend-service 3000:3000
   ```

### Kubernetes Features

- **High Availability**: 2 replicas with anti-affinity scheduling
- **Rolling Updates**: Zero-downtime deployments
- **Health Checks**: Liveness, readiness, and startup probes
- **Resource Management**: CPU and memory limits
- **Security**: Non-root containers, read-only filesystems
- **Configuration Management**: ConfigMaps and Secrets

### Scaling the Deployment

```bash
# Scale to 3 replicas
kubectl scale deployment backend --replicas=3

# Horizontal Pod Autoscaler (HPA)
kubectl autoscale deployment backend --cpu-percent=70 --min=2 --max=10

# Check autoscaler status
kubectl get hpa
```

## Cloud Platform Deployment

### Heroku Deployment

Heroku provides a simple platform-as-a-service deployment option:

1. **Install Heroku CLI**
   ```bash
   # Install via package manager or download from heroku.com
   curl https://cli-assets.heroku.com/install.sh | sh
   ```

2. **Login and Create App**
   ```bash
   heroku login
   heroku create nodejs-tutorial-backend
   ```

3. **Deploy Application**
   ```bash
   # Using the automated script
   bash infrastructure/scripts/deploy.sh heroku
   
   # Or manually
   git push heroku main
   ```

4. **Configure Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set PORT=3000
   heroku config:set REQUEST_TIMEOUT_MS=30000
   ```

5. **Monitor Deployment**
   ```bash
   heroku logs --tail
   heroku ps
   heroku open
   ```

### Vercel Deployment

Vercel provides serverless deployment with edge computing:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login and Deploy**
   ```bash
   vercel login
   vercel --prod
   ```

3. **Configure Environment Variables**
   ```bash
   vercel env add NODE_ENV production
   vercel env add PORT 3000
   vercel env add REQUEST_TIMEOUT_MS 30000
   ```

The `vercel.json` configuration handles:
- **Serverless Functions**: Node.js runtime optimization
- **Security Headers**: HTTPS enforcement, XSS protection
- **Routing**: Path-based traffic routing
- **Memory Limits**: Function resource allocation

### Google Cloud Run

Google Cloud Run provides serverless container deployment:

1. **Install Google Cloud SDK**
   ```bash
   curl https://sdk.cloud.google.com | bash
   gcloud init
   ```

2. **Configure Project**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable run.googleapis.com
   ```

3. **Deploy Service**
   ```bash
   # Using the automated script
   bash infrastructure/scripts/deploy.sh cloud
   
   # Or manually
   gcloud run deploy nodejs-tutorial-backend \
     --image gcr.io/YOUR_PROJECT_ID/nodejs-tutorial-backend \
     --region us-central1 \
     --allow-unauthenticated
   ```

## CI/CD and Automation

### Automated Deployment Script

The `deploy.sh` script provides unified deployment automation:

```bash
# Auto-detect deployment target
bash infrastructure/scripts/deploy.sh

# Deploy to specific targets
bash infrastructure/scripts/deploy.sh docker
bash infrastructure/scripts/deploy.sh compose
bash infrastructure/scripts/deploy.sh heroku
bash infrastructure/scripts/deploy.sh cloud

# Deploy with options
bash infrastructure/scripts/deploy.sh --verbose docker
bash infrastructure/scripts/deploy.sh --skip-tests compose
```

### Script Features

- **Multi-Target Support**: Docker, Compose, Heroku, Cloud platforms
- **Environment Validation**: Tool availability and configuration checks
- **Pre-Deployment Testing**: Automated test execution
- **Health Verification**: Post-deployment health checks
- **Error Handling**: Comprehensive error reporting and rollback
- **CI/CD Integration**: Environment detection and automation

### GitHub Actions Integration

Example workflow for CI/CD automation:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          
      - name: Install dependencies
        run: cd src/backend && npm ci
        
      - name: Run tests
        run: cd src/backend && npm test
        
      - name: Deploy to production
        run: bash infrastructure/scripts/deploy.sh docker
        env:
          NODE_ENV: production
```

## Environment Variables and Secrets

### Environment Configuration

Environment variables are managed through multiple layers:

1. **Development**: `.env` file (local development)
2. **Docker**: `--env-file` flag or environment sections
3. **Kubernetes**: ConfigMaps and Secrets
4. **Cloud**: Platform-specific environment variable systems

### Required Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| PORT | Integer | 3000 | HTTP server port (1024-65535) |
| NODE_ENV | String | development | Runtime environment |
| REQUEST_TIMEOUT_MS | Integer | 30000 | Request timeout in milliseconds |
| LOG_LEVEL | String | info | Logging verbosity level |

### Setup Script

Use the automated setup script for environment configuration:

```bash
# Interactive setup
bash infrastructure/scripts/setup-env.sh

# Force overwrite existing .env
bash infrastructure/scripts/setup-env.sh --force

# Quiet mode for CI/CD
bash infrastructure/scripts/setup-env.sh --quiet
```

### Security Considerations

- **Never commit secrets**: Use .env files locally, never in version control
- **Use platform secret managers**: Kubernetes Secrets, cloud secret managers
- **Rotate secrets regularly**: Update database passwords, API keys
- **Validate configurations**: Use the setup script to validate environment variables

## Security and Best Practices

### Container Security

- **Non-root execution**: Containers run as unprivileged user (UID 1000)
- **Read-only filesystems**: Prevents runtime file modifications
- **Minimal attack surface**: Alpine Linux base images
- **No shell access**: Containers don't include shell utilities
- **Resource limits**: CPU and memory constraints prevent resource exhaustion

### Network Security

- **TLS/HTTPS**: All cloud deployments enforce HTTPS
- **Security headers**: Content security policy, XSS protection
- **Network isolation**: Kubernetes network policies
- **Ingress control**: Restricted external access points

### Secrets Management

- **Environment variables**: For non-sensitive configuration
- **Kubernetes Secrets**: For sensitive data in orchestrated environments
- **Cloud secret managers**: For production cloud deployments
- **Encrypted storage**: Secrets at rest encryption

### Security Checklist

- [ ] Environment variables properly configured
- [ ] No secrets in version control
- [ ] Container images regularly updated
- [ ] Resource limits configured
- [ ] Network access restricted
- [ ] HTTPS/TLS enforced
- [ ] Security headers implemented
- [ ] Vulnerability scanning enabled

## Monitoring and Observability

### Health Checks

The application provides multiple health check endpoints:

- **Primary Health Check**: `GET /hello` - Application functionality
- **Detailed Health Check**: `GET /health` - System status (if implemented)

### Container Health Monitoring

All deployment configurations include comprehensive health checks:

```bash
# Docker health check
docker inspect nodejs-tutorial-backend | grep -A 10 Health

# Kubernetes health check
kubectl describe pod <pod-name> | grep -A 10 Conditions

# Docker Compose health check
docker-compose -f infrastructure/docker/docker-compose.prod.yml ps
```

### Logging

The application implements structured logging:

- **Development**: Console output with debug information
- **Production**: Structured JSON logs with appropriate levels
- **Container**: Docker log drivers for centralized collection
- **Kubernetes**: kubectl logs for pod-level log access

### Observability Integration

For production deployments, integrate with monitoring solutions:

```bash
# Prometheus metrics (if implemented)
curl http://localhost:3000/metrics

# Custom monitoring endpoints
curl http://localhost:3000/health
curl http://localhost:3000/status
```

### Monitoring Best Practices

- **Response time monitoring**: Track endpoint performance
- **Error rate monitoring**: Monitor 4xx/5xx response rates
- **Resource utilization**: CPU, memory, and disk usage
- **Dependency monitoring**: Database and external API health
- **Log aggregation**: Centralized log collection and analysis

## Scalability and Resource Management

### Horizontal Scaling

#### Docker Compose Scaling

```bash
# Scale backend service to 3 instances
docker-compose -f infrastructure/docker/docker-compose.prod.yml up -d --scale backend=3

# Add load balancer (nginx example)
docker-compose -f infrastructure/docker/docker-compose.prod.yml -f nginx-lb.yml up -d
```

#### Kubernetes Scaling

```bash
# Manual scaling
kubectl scale deployment backend --replicas=5

# Horizontal Pod Autoscaler
kubectl autoscale deployment backend --cpu-percent=70 --min=2 --max=10

# Custom metrics scaling
kubectl apply -f custom-metrics-hpa.yaml
```

### Vertical Scaling

#### Resource Limits

Update resource specifications based on load requirements:

```yaml
# Kubernetes resource limits
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 1Gi
```

#### Cloud Platform Scaling

```bash
# Heroku dyno scaling
heroku ps:scale web=2 -a nodejs-tutorial-backend
heroku ps:resize web=standard-1x -a nodejs-tutorial-backend

# Google Cloud Run scaling
gcloud run services update nodejs-tutorial-backend \
  --memory=512Mi \
  --cpu=1000m \
  --max-instances=10
```

### Cost Optimization

#### Resource Optimization

- **Right-sizing**: Match resources to actual usage
- **Autoscaling**: Scale down during low traffic
- **Spot instances**: Use preemptible instances for non-critical workloads
- **Reserved capacity**: Commit to long-term usage for discounts

#### Platform-Specific Optimization

```bash
# Heroku cost optimization
heroku ps:scale web=0 -a nodejs-tutorial-backend  # Scale down when not needed
heroku ps:resize web=eco -a nodejs-tutorial-backend  # Use eco dynos for development

# Google Cloud Run optimization
gcloud run services update nodejs-tutorial-backend \
  --min-instances=0 \
  --max-instances=5 \
  --concurrency=80
```

## Troubleshooting and FAQ

### Common Issues

#### Container Startup Issues

**Problem**: Container fails to start or exits immediately

**Solutions**:
```bash
# Check container logs
docker logs nodejs-tutorial-backend

# Inspect container configuration
docker inspect nodejs-tutorial-backend

# Run container interactively for debugging
docker run -it --entrypoint=/bin/sh nodejs-tutorial-backend
```

#### Port Conflicts

**Problem**: "Port already in use" errors

**Solutions**:
```bash
# Find process using port 3000
lsof -i :3000
netstat -tulpn | grep :3000

# Kill process or change port
export PORT=3001
docker-compose -f infrastructure/docker/docker-compose.dev.yml up
```

#### Environment Variable Issues

**Problem**: Configuration not loaded properly

**Solutions**:
```bash
# Validate environment file
bash infrastructure/scripts/setup-env.sh --force

# Check environment variables in container
docker exec nodejs-tutorial-backend printenv | grep -E "(PORT|NODE_ENV|REQUEST_TIMEOUT_MS)"

# Verify .env file format
cat src/backend/.env | grep -v "^#" | grep -v "^$"
```

### Kubernetes Troubleshooting

#### Pod Failures

```bash
# Check pod status
kubectl get pods -l app=nodejs-tutorial-backend

# Describe pod for detailed information
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name>

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp
```

#### Service Issues

```bash
# Check service endpoints
kubectl get endpoints backend-service

# Test service connectivity
kubectl run test-pod --image=curlimages/curl --rm -it -- curl backend-service:3000/hello

# Check ingress configuration
kubectl describe ingress backend-ingress
```

### Cloud Platform Troubleshooting

#### Heroku Issues

```bash
# Check dyno status
heroku ps -a nodejs-tutorial-backend

# View application logs
heroku logs --tail -a nodejs-tutorial-backend

# Check configuration
heroku config -a nodejs-tutorial-backend

# Restart application
heroku restart -a nodejs-tutorial-backend
```

#### Google Cloud Run Issues

```bash
# Check service status
gcloud run services describe nodejs-tutorial-backend --region=us-central1

# View logs
gcloud run services logs tail nodejs-tutorial-backend --region=us-central1

# Check revisions
gcloud run revisions list --service=nodejs-tutorial-backend --region=us-central1
```

### Performance Issues

#### High Memory Usage

```bash
# Monitor container memory usage
docker stats nodejs-tutorial-backend

# Check Node.js memory usage
kubectl exec <pod-name> -- node -e "console.log(process.memoryUsage())"

# Adjust memory limits
kubectl patch deployment backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"512Mi"}}}]}}}}'
```

#### High CPU Usage

```bash
# Monitor CPU usage
kubectl top pods -l app=nodejs-tutorial-backend

# Check Node.js process details
kubectl exec <pod-name> -- ps aux

# Scale horizontally to distribute load
kubectl scale deployment backend --replicas=3
```

### FAQ

**Q: Which deployment method should I use?**
A: For learning: Docker Compose. For production: Kubernetes or cloud platforms.

**Q: How do I update the application?**
A: Use the deployment script: `bash infrastructure/scripts/deploy.sh <target>`

**Q: Can I run multiple instances?**
A: Yes, the application is stateless and supports horizontal scaling.

**Q: How do I secure the deployment?**
A: Follow the security checklist and use platform-specific security features.

**Q: What if I need persistent storage?**
A: The current tutorial is stateless. For persistence, add database services to your deployment.

**Q: How do I monitor the application?**
A: Use platform-specific monitoring tools and health check endpoints.

## References and Further Reading

### Official Documentation

- [Node.js Official Documentation](https://nodejs.org/docs/)
- [Express.js v5 Documentation](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

### Platform-Specific Resources

- [Heroku Node.js Guide](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Vercel Node.js Documentation](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [Google Cloud Run Node.js Guide](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/nodejs)

### Best Practices and Patterns

- [Twelve-Factor App Methodology](https://12factor.net/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

### Security Resources

- [OWASP Node.js Security Guide](https://owasp.org/www-project-nodejs-goat/)
- [Container Security Best Practices](https://kubernetes.io/docs/concepts/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

### Monitoring and Observability

- [Prometheus Node.js Monitoring](https://prometheus.io/docs/guides/node-exporter/)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/)
- [Grafana Dashboards for Node.js](https://grafana.com/grafana/dashboards/)

---

**Note**: This infrastructure documentation is designed to be a living document. Update it as your infrastructure evolves and new deployment patterns emerge. For application-level documentation, see `src/backend/README.md`.

**Support**: For questions or issues, consult the troubleshooting section above or refer to the platform-specific documentation links provided.

**Contributing**: When adding new infrastructure components, ensure they follow the established patterns and include appropriate documentation updates.