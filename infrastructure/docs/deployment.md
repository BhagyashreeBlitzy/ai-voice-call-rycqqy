# Node.js Tutorial Application - Infrastructure Deployment Guide

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Infrastructure Provisioning](#infrastructure-provisioning)
3. [Container Orchestration](#container-orchestration)
4. [Cloud Platform Deployment](#cloud-platform-deployment)
5. [Automation and CI/CD](#automation-and-cicd)
6. [Operational Procedures](#operational-procedures)
7. [Educational Learning Path](#educational-learning-path)
8. [Troubleshooting and Maintenance](#troubleshooting-and-maintenance)

---

## Deployment Overview

The Node.js tutorial application provides a comprehensive infrastructure deployment guide that serves as an authoritative resource for deploying Express.js 5.1.0 applications across multiple environments and platforms. This documentation demonstrates production-ready deployment patterns, Infrastructure as Code (IaC), and modern DevOps practices while maintaining educational clarity for learning modern deployment automation.

### Architecture Overview

The deployment architecture supports multiple target platforms with consistent patterns:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Development Environment                       │
├─────────────────────────────────────────────────────────────────┤
│  Local Development → Docker Compose → Kubernetes → Cloud        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Infrastructure Components                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                   │
│  │   Application   │    │  Infrastructure │                   │
│  │                 │    │                 │                   │
│  │ • Node.js 22.x  │    │ • Docker        │                   │
│  │ • Express 5.1.0 │    │ • Kubernetes    │                   │
│  │ • Health Checks │    │ • Terraform     │                   │
│  └─────────────────┘    └─────────────────┘                   │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                   │
│  │   Monitoring    │    │     CI/CD       │                   │
│  │                 │    │                 │                   │
│  │ • Prometheus    │    │ • GitHub Actions│                   │
│  │ • Grafana       │    │ • Deploy Script │                   │
│  │ • Health Probes │    │ • Multi-target  │                   │
│  └─────────────────┘    └─────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Application Specifications

- **Runtime**: Node.js v22.11.0 LTS ('Jod')
- **Framework**: Express.js v5.1.0 with enhanced async/await support
- **Default Port**: 3000 (configurable via `PORT` environment variable)
- **Health Endpoints**: `/health`, `/livez`, `/readyz`
- **Container Support**: Multi-stage Docker builds with Alpine Linux
- **Orchestration**: Kubernetes-ready with comprehensive health probes

### Supported Deployment Targets

| Platform | Complexity | Use Case | Educational Value |
|----------|------------|----------|-------------------|
| Local Development | Low | Learning and rapid prototyping | High |
| Docker Compose | Medium | Development and staging environments | High |
| Kubernetes | High | Production orchestration and scaling | High |
| Google Cloud Run | Medium | Serverless container deployment | High |
| Heroku | Low | Simple PaaS deployment | Medium |
| AWS Elastic Beanstalk | Medium | Managed container deployment | Medium |

### Key Features

- **Multi-Environment Support**: Development, staging, and production configurations
- **Infrastructure as Code**: Complete Terraform provisioning for Google Cloud Platform
- **Container Security**: Hardened container images with non-root execution
- **Health Monitoring**: Comprehensive health checks and monitoring integration
- **CI/CD Automation**: GitHub Actions workflows with multi-target deployment
- **Educational Focus**: Clear learning progression from simple to complex patterns

---

## Infrastructure Provisioning

### Terraform Infrastructure as Code

The infrastructure utilizes Terraform for automated provisioning of Google Cloud Platform resources, demonstrating enterprise-grade Infrastructure as Code practices.

#### GKE Cluster Provisioning

```bash
# Navigate to Terraform configuration
cd infrastructure/deployment/terraform

# Initialize Terraform with backend configuration
terraform init

# Review planned infrastructure changes
terraform plan -var-file="terraform.tfvars"

# Apply infrastructure configuration
terraform apply -auto-approve
```

#### Core Infrastructure Components

**VPC Network Configuration**:
```terraform
# Custom VPC with public and private subnets
resource "google_compute_network" "vpc_network" {
  name                    = "${var.cluster_name_prefix}-${var.environment}-vpc"
  auto_create_subnetworks = false
  routing_mode           = "REGIONAL"
}

# Private subnet for GKE nodes
resource "google_compute_subnetwork" "private_subnet" {
  name          = "${var.cluster_name_prefix}-${var.environment}-private"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc_network.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pod_cidr_range
  }

  secondary_ip_range {
    range_name    = "services"  
    ip_cidr_range = var.service_cidr_range
  }

  private_ip_google_access = true
}
```

**GKE Cluster with Security Hardening**:
```terraform
resource "google_container_cluster" "primary" {
  name     = "${var.cluster_name_prefix}-${var.environment}"
  location = var.region

  # Security configurations
  private_cluster_config {
    enable_private_nodes    = var.enable_private_nodes
    enable_private_endpoint = false
    master_ipv4_cidr_block = var.master_ipv4_cidr_block
  }

  # Workload identity for secure pod authentication
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Network policy support
  network_policy {
    enabled  = var.enable_network_policy
    provider = "CALICO"
  }

  # Binary authorization for container security
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Comprehensive logging and monitoring
  logging_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS",
      "API_SERVER"
    ]
  }

  monitoring_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS"
    ]
  }
}
```

#### Infrastructure Configuration Variables

Key Terraform variables for customization:

```terraform
# Environment configuration
variable "environment" {
  description = "Deployment environment (development/staging/production)"
  default     = "development"
}

# Cluster sizing
variable "cluster_min_nodes" {
  description = "Minimum nodes for auto-scaling"
  default     = 1
}

variable "cluster_max_nodes" {
  description = "Maximum nodes for auto-scaling"  
  default     = 5
}

# Machine specifications
variable "node_machine_type" {
  description = "GKE node machine type"
  default     = "e2-medium"
}

# Network configuration
variable "master_ipv4_cidr_block" {
  description = "CIDR for GKE master nodes"
  default     = "172.16.0.32/28"
}
```

#### Resource Management and Scaling

**Node Pool Configuration**:
```terraform
resource "google_container_node_pool" "primary_nodes" {
  name       = "${google_container_cluster.primary.name}-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  
  # Auto-scaling configuration
  autoscaling {
    min_node_count = var.cluster_min_nodes
    max_node_count = var.cluster_max_nodes
  }

  # Node configuration
  node_config {
    preemptible  = var.environment != "production"
    machine_type = var.node_machine_type
    disk_size_gb = var.node_disk_size_gb

    # Security contexts
    service_account = google_service_account.gke_node_pool.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Workload identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Security hardening
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  # Node management
  management {
    auto_repair  = true
    auto_upgrade = true
  }

  # Rolling update strategy
  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }
}
```

### Infrastructure Security

**IAM Service Accounts**:
```terraform
resource "google_service_account" "gke_node_pool" {
  account_id   = "${var.cluster_name_prefix}-${var.environment}-nodes"
  display_name = "GKE Node Pool Service Account"
}

resource "google_project_iam_member" "node_pool_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter", 
    "roles/monitoring.viewer",
    "roles/container.nodeServiceAgent"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_node_pool.email}"
}
```

**Firewall Rules**:
```terraform
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.cluster_name_prefix}-${var.environment}-allow-internal"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  source_ranges = [
    "10.0.0.0/16",
    var.pod_cidr_range,
    var.service_cidr_range
  ]
}
```

---

## Container Orchestration

### Docker Containerization

The application uses multi-stage Docker builds optimized for security and performance:

#### Production-Optimized Dockerfile

```dockerfile
# Multi-stage build for optimized production images
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage for development dependencies
FROM node:22-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Production stage with security hardening
FROM node:22-alpine AS production
WORKDIR /app

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=build /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Security: Switch to non-root user
USER nodejs

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Expose application port
EXPOSE 3000

# Graceful shutdown handling
STOPSIGNAL SIGTERM

# Start application
CMD ["node", "src/server.js"]
```

#### Docker Compose Development Environment

```yaml
# docker-compose.yml - Development orchestration
version: '3.8'

services:
  # Node.js application service
  nodejs-tutorial-app:
    build:
      context: ../../src/backend
      target: development
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
    volumes:
      - ../../src/backend/src:/app/src:ro
      - ../../src/backend/config:/app/config:ro
    networks:
      - frontend
      - backend
    depends_on:
      - redis

  # Nginx reverse proxy
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - frontend
    depends_on:
      - nodejs-tutorial-app

  # Redis cache
  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"
    networks:
      - backend
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  # Prometheus monitoring
  prometheus:
    image: prom/prometheus:v2.40.0
    ports:
      - "9090:9090"
    volumes:
      - ../monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    networks:
      - backend
    depends_on:
      - nodejs-tutorial-app

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge

volumes:
  redis_data:
    driver: local
```

### Kubernetes Deployment

#### Production Kubernetes Manifests

**Namespace Configuration**:
```yaml
# infrastructure/deployment/kubernetes/namespace.yml
apiVersion: v1
kind: Namespace
metadata:
  name: nodejs-tutorial
  labels:
    name: nodejs-tutorial
    environment: production
    app.kubernetes.io/name: nodejs-tutorial
    app.kubernetes.io/managed-by: terraform
```

**Deployment with Security Hardening**:
```yaml
# infrastructure/deployment/kubernetes/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodejs-tutorial-app
  namespace: nodejs-tutorial
  labels:
    app.kubernetes.io/name: nodejs-tutorial
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: application
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0

  selector:
    matchLabels:
      app.kubernetes.io/name: nodejs-tutorial

  template:
    metadata:
      labels:
        app.kubernetes.io/name: nodejs-tutorial
        app.kubernetes.io/version: "1.0.0"
    spec:
      # Security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001

      # Container specification
      containers:
      - name: nodejs-tutorial
        image: nodejs-hello-tutorial:latest
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP

        # Resource management
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi

        # Health probes
        livenessProbe:
          httpGet:
            path: /livez
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /readyz  
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3

        startupProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30

        # Security context
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

        # Environment configuration
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"

        # Temporary filesystem for writable directories
        volumeMounts:
        - name: tmp-volume
          mountPath: /tmp

      # Volume configuration
      volumes:
      - name: tmp-volume
        emptyDir: {}

      # Pod anti-affinity for high availability
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app.kubernetes.io/name
                  operator: In
                  values:
                  - nodejs-tutorial
              topologyKey: kubernetes.io/hostname
```

**Service and Ingress Configuration**:
```yaml
# Service configuration for load balancing
apiVersion: v1
kind: Service
metadata:
  name: nodejs-tutorial-service
  namespace: nodejs-tutorial
spec:
  selector:
    app.kubernetes.io/name: nodejs-tutorial
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  type: ClusterIP

---
# Ingress for external access
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nodejs-tutorial-ingress
  namespace: nodejs-tutorial
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "nodejs-tutorial-ip"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - nodejs-tutorial.example.com
    secretName: nodejs-tutorial-tls
  rules:
  - host: nodejs-tutorial.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nodejs-tutorial-service
            port:
              number: 80
```

#### Kubernetes Operations

**Deployment Commands**:
```bash
# Create namespace
kubectl apply -f infrastructure/deployment/kubernetes/namespace.yml

# Deploy application
kubectl apply -f infrastructure/deployment/kubernetes/

# Monitor rollout
kubectl rollout status deployment/nodejs-tutorial-app -n nodejs-tutorial

# Scale deployment
kubectl scale deployment/nodejs-tutorial-app --replicas=5 -n nodejs-tutorial

# Rolling update
kubectl set image deployment/nodejs-tutorial-app nodejs-tutorial=nodejs-hello-tutorial:v1.1.0 -n nodejs-tutorial

# Rollback deployment
kubectl rollout undo deployment/nodejs-tutorial-app -n nodejs-tutorial
```

**Resource Monitoring**:
```bash
# View pod status
kubectl get pods -n nodejs-tutorial -l app.kubernetes.io/name=nodejs-tutorial

# Check resource usage
kubectl top pods -n nodejs-tutorial

# View application logs
kubectl logs -f deployment/nodejs-tutorial-app -n nodejs-tutorial

# Port forwarding for local access
kubectl port-forward service/nodejs-tutorial-service 3000:80 -n nodejs-tutorial
```

---

## Cloud Platform Deployment

### Google Cloud Run Deployment

Serverless container deployment with automatic scaling:

```bash
# Build and push container image
docker build -t gcr.io/PROJECT_ID/nodejs-tutorial:v1.0.0 .
docker push gcr.io/PROJECT_ID/nodejs-tutorial:v1.0.0

# Deploy to Cloud Run
gcloud run deploy nodejs-tutorial \
  --image gcr.io/PROJECT_ID/nodejs-tutorial:v1.0.0 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --port 3000 \
  --set-env-vars NODE_ENV=production
```

**Cloud Run Service Configuration**:
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: nodejs-tutorial
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/execution-environment: gen2
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/minScale: "1"
        run.googleapis.com/memory: "512Mi"
        run.googleapis.com/cpu: "1000m"
    spec:
      containerConcurrency: 1000
      timeoutSeconds: 300
      containers:
      - image: gcr.io/PROJECT_ID/nodejs-tutorial:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
        startupProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 0
          timeoutSeconds: 5
          periodSeconds: 10
          failureThreshold: 3
```

### Heroku Platform Deployment

Simple Platform-as-a-Service deployment:

```bash
# Install Heroku CLI and authenticate
heroku login

# Create application
heroku create nodejs-tutorial-app

# Container deployment
heroku container:login
heroku container:push web --app nodejs-tutorial-app
heroku container:release web --app nodejs-tutorial-app

# Environment configuration
heroku config:set NODE_ENV=production --app nodejs-tutorial-app

# Enable logging and monitoring
heroku addons:create papertrail --app nodejs-tutorial-app
heroku addons:create newrelic --app nodejs-tutorial-app

# View application
heroku open --app nodejs-tutorial-app
```

**Heroku App Configuration**:
```json
{
  "name": "nodejs-tutorial",
  "description": "Node.js Tutorial Application with Express.js",
  "repository": "https://github.com/user/nodejs-tutorial",
  "keywords": ["node", "express", "tutorial", "education"],
  "stack": "container",
  "addons": [
    {
      "plan": "papertrail:choklad",
      "as": "PAPERTRAIL"
    }
  ],
  "env": {
    "NODE_ENV": {
      "description": "Node environment mode",
      "value": "production",
      "required": true
    }
  },
  "scripts": {
    "postdeploy": "echo 'Deployment completed successfully'"
  }
}
```

### AWS Elastic Beanstalk Deployment

```bash
# Install AWS CLI and Elastic Beanstalk CLI
pip install awscli awsebcli

# Initialize Elastic Beanstalk application
eb init nodejs-tutorial --region us-west-2 --platform "Docker running on 64bit Amazon Linux 2"

# Create environment
eb create nodejs-tutorial-prod --instance-type t3.small --cname nodejs-tutorial

# Deploy application
eb deploy

# Monitor application health
eb health
eb logs
```

**Elastic Beanstalk Configuration**:
```yaml
# .ebextensions/01-nodejs-tutorial.config
option_settings:
  aws:autoscaling:launchconfiguration:
    InstanceType: t3.small
    SecurityGroups: sg-12345678
  
  aws:autoscaling:asg:
    MinSize: 1
    MaxSize: 5
  
  aws:elasticbeanstalk:environment:
    LoadBalancerType: application
    
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health
    MatcherHTTPCode: 200
    
  aws:elasticbeanstalk:cloudwatch:logs:
    StreamLogs: true
    DeleteOnTerminate: false
    RetentionInDays: 7

packages:
  yum:
    git: []
```

---

## Automation and CI/CD

### GitHub Actions Deployment Workflow

The comprehensive deployment workflow provides multi-target automation:

```yaml
# .github/workflows/deploy.yml
name: Production Deployment Automation

on:
  workflow_dispatch:
    inputs:
      deployment_target:
        description: 'Target deployment platform'
        required: true
        default: 'kubernetes'
        type: choice
        options: [docker, kubernetes, cloud-gcp, cloud-heroku, cloud-aws]
      environment:
        description: 'Target deployment environment'
        required: true
        default: 'staging'
        type: choice
        options: [development, staging, production]

env:
  DEPLOYMENT_TARGET: ${{ inputs.deployment_target || 'kubernetes' }}
  DEPLOYMENT_ENVIRONMENT: ${{ inputs.environment || 'staging' }}
  APPLICATION_NAME: nodejs-hello-tutorial

jobs:
  validate_prerequisites:
    name: Validate Deployment Prerequisites
    runs-on: ubuntu-22.04
    steps:
    - uses: actions/checkout@v4
    
    - name: Validate Input Parameters
      run: |
        echo "Validating deployment configuration..."
        echo "Target: ${{ env.DEPLOYMENT_TARGET }}"
        echo "Environment: ${{ env.DEPLOYMENT_ENVIRONMENT }}"
        
    - name: Verify Container Image
      run: |
        docker manifest inspect ghcr.io/${{ github.repository }}/${{ env.APPLICATION_NAME }}:latest

  deploy_infrastructure:
    needs: validate_prerequisites
    runs-on: ubuntu-22.04
    if: ${{ inputs.deployment_target == 'kubernetes' }}
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: 1.5.0
        
    - name: Deploy Infrastructure
      run: |
        cd infrastructure/deployment/terraform
        terraform init
        terraform apply -auto-approve \
          -var="environment=${{ env.DEPLOYMENT_ENVIRONMENT }}" \
          -var="project_id=${{ secrets.GCP_PROJECT_ID }}"

  deploy_application:
    needs: [validate_prerequisites, deploy_infrastructure]
    runs-on: ubuntu-22.04
    steps:
    - uses: actions/checkout@v4
    
    - name: Execute Deployment
      run: |
        chmod +x infrastructure/scripts/deploy.sh
        ./infrastructure/scripts/deploy.sh \
          --target ${{ env.DEPLOYMENT_TARGET }} \
          --environment ${{ env.DEPLOYMENT_ENVIRONMENT }} \
          --verbose

  validate_deployment:
    needs: deploy_application
    runs-on: ubuntu-22.04
    steps:
    - name: Health Check Validation
      run: |
        chmod +x infrastructure/scripts/health-check.sh
        ./infrastructure/scripts/health-check.sh --detailed --retries 10
```

### Deployment Automation Script

The deployment script (`infrastructure/scripts/deploy.sh`) provides comprehensive automation:

#### Key Features

- **Multi-platform support**: Docker, Kubernetes, Google Cloud, Heroku, AWS
- **Health validation**: Automated health checks with retry logic
- **Rollback capabilities**: Automatic rollback on deployment failure
- **Security scanning**: Container image vulnerability assessment
- **Monitoring integration**: Prometheus metrics and alerting setup

#### Usage Examples

```bash
# Local development deployment
./infrastructure/scripts/deploy.sh \
  --target local \
  --environment development

# Docker production deployment
./infrastructure/scripts/deploy.sh \
  --target docker \
  --environment production \
  --build \
  --push \
  --registry ghcr.io

# Kubernetes cluster deployment
./infrastructure/scripts/deploy.sh \
  --target kubernetes \
  --environment production \
  --cluster prod-cluster \
  --namespace nodejs-tutorial \
  --rollback-on-failure

# Google Cloud Run deployment
./infrastructure/scripts/deploy.sh \
  --target cloud \
  --provider gcp \
  --environment production \
  --region us-central1 \
  --enable-monitoring

# Dry run validation
./infrastructure/scripts/deploy.sh \
  --target kubernetes \
  --environment staging \
  --dry-run \
  --verbose
```

### Health Check Automation

The health check script (`infrastructure/scripts/health-check.sh`) provides monitoring:

```bash
# Basic health validation
./infrastructure/scripts/health-check.sh

# Comprehensive health check
./infrastructure/scripts/health-check.sh \
  --url https://nodejs-tutorial.example.com \
  --detailed \
  --retries 10 \
  --timeout 30 \
  --webhook https://hooks.slack.com/webhook

# JSON output for automation
./infrastructure/scripts/health-check.sh \
  --format json \
  --output health-report.json
```

---

## Operational Procedures

### Monitoring and Observability

#### Prometheus Metrics Collection

The monitoring stack provides comprehensive observability:

**Prometheus Configuration** (`infrastructure/monitoring/prometheus.yml`):
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'nodejs-tutorial-monitor'
    environment: 'production'

scrape_configs:
- job_name: 'nodejs-tutorial-app'
  scrape_interval: 5s
  static_configs:
  - targets: ['nodejs-tutorial-app:3000']
    labels:
      service: 'nodejs-tutorial'
      component: 'application'

- job_name: 'nodejs-tutorial-health'
  metrics_path: '/health'
  params:
    detailed: ['true']
    format: ['prometheus']
  static_configs:
  - targets: ['nodejs-tutorial-app:3000']

- job_name: 'kubernetes-probes'
  metrics_path: '/livez'
  static_configs:
  - targets: ['nodejs-tutorial-app:3000']
```

#### Application Health Endpoints

| Endpoint | Purpose | Response Format | Use Case |
|----------|---------|----------------|----------|
| `/health` | Application health with system metrics | JSON with detailed info | General monitoring |
| `/livez` | Kubernetes liveness probe | Plain text "OK" | Container restart decisions |
| `/readyz` | Kubernetes readiness probe | Plain text "OK" | Traffic routing decisions |
| `/metrics` | Prometheus metrics | Prometheus format | Metrics collection |

#### Monitoring Dashboard

**Grafana Dashboard Configuration**:
```json
{
  "dashboard": {
    "title": "Node.js Tutorial Application",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(nodejs_tutorial_http_requests_total[1m])",
            "legendFormat": "{{method}} {{status_code}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, nodejs_tutorial_http_request_duration_seconds_bucket)",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "singlestat",
        "targets": [
          {
            "expr": "nodejs_tutorial_memory_usage_bytes",
            "legendFormat": "Memory Usage"
          }
        ]
      }
    ]
  }
}
```

### Logging and Debugging

#### Structured Logging Configuration

**Production Logging**:
```javascript
// Production log format (JSON structured)
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "HTTP request completed",
  "meta": {
    "method": "GET",
    "url": "/hello",
    "statusCode": 200,
    "responseTime": "2ms",
    "userAgent": "curl/7.68.0",
    "correlationId": "req-123456789"
  }
}
```

#### Log Aggregation

**Kubernetes Logging**:
```bash
# View application logs
kubectl logs -f deployment/nodejs-tutorial-app -n nodejs-tutorial

# Filter logs by level
kubectl logs deployment/nodejs-tutorial-app -n nodejs-tutorial | jq 'select(.level == "error")'

# Follow logs from all pods
kubectl logs -f -l app.kubernetes.io/name=nodejs-tutorial -n nodejs-tutorial --all-containers=true
```

**Docker Compose Logging**:
```bash
# View service logs
docker-compose logs -f nodejs-tutorial-app

# View logs with timestamps
docker-compose logs -t nodejs-tutorial-app

# Filter recent logs
docker-compose logs --tail=100 nodejs-tutorial-app
```

### Scaling and Performance

#### Horizontal Scaling

**Kubernetes Horizontal Pod Autoscaler**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nodejs-tutorial-hpa
  namespace: nodejs-tutorial
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nodejs-tutorial-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**Cloud Platform Auto-scaling**:
```bash
# Google Cloud Run auto-scaling
gcloud run services update nodejs-tutorial \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=1000 \
  --cpu=1 \
  --memory=512Mi

# AWS Elastic Beanstalk auto-scaling
eb config put scaling-config.yml
eb deploy
```

#### Performance Optimization

**Application-level optimizations**:
- Connection keep-alive enabled
- Response compression for payloads >1KB  
- Request rate limiting
- Health check response caching

**Infrastructure optimizations**:
- Container image multi-stage builds
- Resource requests and limits
- Pod anti-affinity rules
- Cluster auto-scaling

### Security Operations

#### Security Scanning

**Container Security Scanning**:
```bash
# Trivy security scanner
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image nodejs-hello-tutorial:latest

# Snyk vulnerability scanning
docker run --rm -v $(pwd):/app snyk/snyk:node test

# Docker Scout (if available)
docker scout cves nodejs-hello-tutorial:latest
```

**Kubernetes Security Policies**:
```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: nodejs-tutorial-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

#### Network Security

**Kubernetes Network Policies**:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: nodejs-tutorial-netpol
  namespace: nodejs-tutorial
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: nodejs-tutorial
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-system
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

---

## Educational Learning Path

### Progressive Learning Approach

The infrastructure deployment guide supports progressive skill development:

#### Level 1: Local Development (Beginner)
**Learning Objectives**:
- Understand Node.js application structure
- Learn basic deployment concepts
- Practice local development workflow

**Activities**:
```bash
# Start with local development
cd src/backend
npm install
npm run dev

# Test application endpoints
curl http://localhost:3000/hello
curl http://localhost:3000/health
```

#### Level 2: Container Deployment (Intermediate)
**Learning Objectives**:
- Understand containerization benefits
- Learn Docker concepts and commands
- Practice container security

**Activities**:
```bash
# Build and run container
docker build -t nodejs-tutorial:latest .
docker run -p 3000:3000 nodejs-tutorial:latest

# Docker Compose orchestration  
docker-compose up -d
docker-compose ps
```

#### Level 3: Kubernetes Orchestration (Advanced)
**Learning Objectives**:
- Understand container orchestration
- Learn Kubernetes concepts and resources
- Practice production deployment patterns

**Activities**:
```bash
# Deploy to Kubernetes
kubectl apply -f infrastructure/deployment/kubernetes/
kubectl get pods -n nodejs-tutorial
kubectl port-forward service/nodejs-tutorial-service 3000:80 -n nodejs-tutorial
```

#### Level 4: Cloud Platform Deployment (Expert)  
**Learning Objectives**:
- Understand cloud-native patterns
- Learn platform-specific deployment
- Practice multi-cloud strategies

**Activities**:
```bash
# Google Cloud Run deployment
gcloud run deploy --source . --platform managed

# Heroku container deployment  
heroku container:push web && heroku container:release web
```

#### Level 5: Infrastructure as Code (Professional)
**Learning Objectives**:
- Understand Infrastructure as Code principles
- Learn Terraform for infrastructure provisioning
- Practice GitOps workflows

**Activities**:
```bash
# Terraform infrastructure provisioning
cd infrastructure/deployment/terraform
terraform init && terraform plan && terraform apply
```

#### Level 6: CI/CD Automation (DevOps Engineer)
**Learning Objectives**:
- Understand deployment automation
- Learn GitHub Actions workflows  
- Practice GitOps and deployment best practices

**Activities**:
- Configure GitHub Actions workflows
- Implement automated testing and deployment
- Set up monitoring and alerting

### Hands-On Exercises

#### Exercise 1: Local to Container Migration
1. Run application locally
2. Containerize with Docker
3. Compare performance and behavior
4. Implement health checks

#### Exercise 2: Multi-Environment Deployment
1. Deploy to development environment
2. Promote to staging with validation
3. Deploy to production with approval
4. Practice rollback procedures

#### Exercise 3: Monitoring Implementation
1. Configure Prometheus metrics
2. Create Grafana dashboards
3. Set up alerting rules
4. Practice incident response

#### Exercise 4: Security Hardening
1. Scan containers for vulnerabilities
2. Implement security contexts
3. Configure network policies
4. Practice security incident response

### Resource Sizing Guidelines

#### Development Environment
- **CPU**: 1 core minimum, 2 cores recommended
- **Memory**: 512MB minimum, 1GB recommended  
- **Storage**: 100MB minimum, 500MB recommended
- **Network**: 1Mbps sufficient for local development

#### Production Environment

| Load Level | CPU | Memory | Storage | Network |
|------------|-----|--------|---------|---------|
| Small | 1 vCPU | 1GB | 1GB | 10Mbps |
| Medium | 2 vCPU | 2GB | 2GB | 100Mbps |
| Large | 4+ vCPU | 4GB+ | 5GB+ | 1Gbps+ |

---

## Troubleshooting and Maintenance

### Common Issues and Solutions

#### Container Issues

**Problem**: Container fails to start
```bash
# Diagnose container startup issues
docker logs <container-id>
docker inspect <container-id>

# Check port availability
netstat -tulpn | grep :3000

# Verify image integrity
docker manifest inspect nodejs-hello-tutorial:latest
```

**Problem**: Permission denied errors
```bash
# Check file permissions in container
docker exec -it <container-id> ls -la /app

# Verify non-root user configuration
docker exec -it <container-id> whoami
```

#### Kubernetes Issues

**Problem**: Pods stuck in Pending state
```bash
# Check resource constraints
kubectl describe pod <pod-name> -n nodejs-tutorial
kubectl get events -n nodejs-tutorial --sort-by=.lastTimestamp

# Check node resources
kubectl top nodes
kubectl describe node <node-name>
```

**Problem**: Health checks failing
```bash
# Test health endpoints directly
kubectl port-forward pod/<pod-name> 3000:3000 -n nodejs-tutorial
curl -v http://localhost:3000/health

# Check application logs
kubectl logs <pod-name> -n nodejs-tutorial --tail=100
```

#### Cloud Platform Issues

**Problem**: Google Cloud Run deployment fails
```bash
# Check service configuration
gcloud run services describe nodejs-tutorial --region=us-central1

# View deployment logs  
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Test service locally
docker run -p 8080:3000 gcr.io/PROJECT_ID/nodejs-tutorial:latest
```

### Maintenance Procedures

#### Regular Updates

**Monthly Maintenance Tasks**:
1. Update base container images
2. Patch security vulnerabilities  
3. Review and rotate secrets
4. Analyze performance metrics
5. Update documentation

**Quarterly Maintenance Tasks**:
1. Review resource utilization and costs
2. Update infrastructure configurations
3. Conduct security assessments
4. Review and update monitoring alerts
5. Test disaster recovery procedures

#### Backup and Recovery

**Kubernetes Backup**:
```bash
# Backup cluster configuration
kubectl get all -n nodejs-tutorial -o yaml > backup-$(date +%Y%m%d).yaml

# Backup persistent volumes (if any)
kubectl get pv,pvc -n nodejs-tutorial -o yaml > backup-storage-$(date +%Y%m%d).yaml
```

**Infrastructure Backup**:
```bash
# Terraform state backup
cd infrastructure/deployment/terraform
terraform state pull > terraform-state-backup-$(date +%Y%m%d).json

# Configuration backup
tar -czf infra-config-$(date +%Y%m%d).tar.gz infrastructure/
```

### Performance Optimization

#### Application Optimization

- Enable Node.js cluster mode for multi-core utilization
- Implement connection pooling for external services
- Use compression middleware for response optimization  
- Implement request/response caching strategies

#### Infrastructure Optimization

- Use appropriate machine types for workload requirements
- Implement cluster auto-scaling for cost optimization
- Configure resource requests and limits properly
- Use regional persistent disks for performance

### Cost Management

#### Cost Monitoring

**Google Cloud Cost Analysis**:
```bash
# View project billing information
gcloud billing projects list
gcloud billing budgets list --billing-account=BILLING_ACCOUNT

# Analyze resource costs
gcloud logging read "protoPayload.serviceName=compute.googleapis.com" --format="table(timestamp,protoPayload.resourceName)" --limit=50
```

#### Cost Optimization Strategies

1. **Right-sizing**: Use appropriate instance types
2. **Preemptible instances**: For non-critical workloads
3. **Auto-scaling**: Scale down during low usage
4. **Reserved capacity**: For predictable workloads  
5. **Resource cleanup**: Remove unused resources regularly

### Incident Response

#### Incident Response Playbook

**Level 1 - Service Degradation**:
1. Check health endpoint status
2. Review application logs
3. Verify resource utilization
4. Scale horizontally if needed

**Level 2 - Service Outage**:
1. Execute emergency rollback
2. Check infrastructure status
3. Review monitoring alerts
4. Communicate with stakeholders

**Level 3 - Data/Security Incident**:
1. Isolate affected systems
2. Preserve evidence for analysis
3. Execute incident response plan
4. Conduct post-incident review

#### Recovery Procedures

**Application Recovery**:
```bash
# Rollback Kubernetes deployment
kubectl rollout undo deployment/nodejs-tutorial-app -n nodejs-tutorial

# Rollback Docker deployment
docker-compose down
docker-compose -f docker-compose.backup.yml up -d

# Rollback cloud deployment
gcloud run services update nodejs-tutorial --image=gcr.io/PROJECT_ID/nodejs-tutorial:previous-version
```

---

## Conclusion

This comprehensive infrastructure deployment guide provides enterprise-grade deployment patterns while maintaining educational clarity for learning modern DevOps practices. The multi-platform approach demonstrates Infrastructure as Code, container orchestration, and cloud-native deployment strategies suitable for both educational environments and production workloads.

### Key Achievements

- **Multi-Platform Deployment**: Support for Docker, Kubernetes, and major cloud platforms
- **Infrastructure as Code**: Complete Terraform provisioning with security best practices  
- **CI/CD Automation**: GitHub Actions workflows with comprehensive validation
- **Security Hardening**: Container security, network policies, and compliance frameworks
- **Comprehensive Monitoring**: Prometheus metrics, Grafana dashboards, and alerting
- **Educational Progression**: Clear learning path from basic to advanced deployment concepts

### Next Steps

1. **Start with local development** for foundational understanding
2. **Progress to containerization** for modern deployment patterns  
3. **Implement Kubernetes** for production orchestration
4. **Add cloud deployment** for scalability and resilience
5. **Integrate monitoring** for operational excellence
6. **Automate with CI/CD** for deployment efficiency

For continued learning and support, refer to the deployment automation scripts, monitoring configurations, and troubleshooting procedures documented throughout this comprehensive guide.