# 🚀 Aviation Weather Services - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Aviation Weather Services system to production environments. It covers containerization, cloud deployment, CI/CD pipelines, monitoring, and operational considerations.

## 📋 Deployment Architecture

### Production Environment Stack
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Servers   │    │   API Gateway   │
│    (Nginx/ALB)  │────│   (Frontend)    │────│                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Backend APIs   │    │   NLP Service   │
                       │  (Node.js)      │────│   (Python)      │
                       └─────────────────┘    └─────────────────┘
                                 │                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Cache       │    │   Databases     │
                       │    (Redis)      │    │  (MongoDB)      │
                       └─────────────────┘    └─────────────────┘
```

### Recommended Infrastructure
- **Cloud Provider**: AWS, Google Cloud, or Azure
- **Container Orchestration**: Docker + Kubernetes or Docker Compose
- **Database**: MongoDB Atlas or self-hosted MongoDB
- **Cache**: Redis Cloud or self-hosted Redis
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **CI/CD**: GitHub Actions, GitLab CI, or Jenkins

---

## 🐳 Containerization

### Docker Configuration

#### Frontend Dockerfile
```dockerfile
# frontend-react/Dockerfile
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

#### Backend Dockerfile
```dockerfile
# backend-node/Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
```

#### NLP Service Dockerfile
```dockerfile
# backend-python-nlp/Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' --uid 1001 nlpuser
RUN chown -R nlpuser:nlpuser /app

# Switch to non-root user
USER nlpuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["python", "app.py"]
```

### Docker Compose Configuration

#### Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend-react
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - app-network

  backend:
    build:
      context: ./backend-node
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=5000
      - CHECKWX_API_KEY=${CHECKWX_API_KEY}
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=${REDIS_URL}
      - NLP_SERVICE_URL=http://nlp-service:8000
    depends_on:
      - redis
      - mongodb
    restart: unless-stopped
    networks:
      - app-network

  nlp-service:
    build:
      context: ./backend-python-nlp
      dockerfile: Dockerfile
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - app-network

  mongodb:
    image: mongo:6
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USERNAME}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_data:/data/db
      - ./mongo/init.js:/docker-entrypoint-initdb.d/init.js
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  mongodb_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  app-network:
    driver: bridge
  monitoring:
    driver: bridge
```

### Nginx Configuration

#### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json application/xml;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general:10m rate=1r/s;
    
    # Upstream servers
    upstream frontend_upstream {
        server frontend:80;
        keepalive 32;
    }
    
    upstream backend_upstream {
        server backend:5000;
        keepalive 32;
    }
    
    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name aviationweather.app www.aviationweather.app;
        return 301 https://$server_name$request_uri;
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name aviationweather.app www.aviationweather.app;
        
        # SSL configuration
        ssl_certificate /etc/nginx/ssl/certificate.crt;
        ssl_certificate_key /etc/nginx/ssl/private.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        
        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend_upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 5s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            
            # Buffering
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
        }
        
        # Static files
        location / {
            limit_req zone=general burst=10 nodelay;
            
            proxy_pass http://frontend_upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

---

## ☁️ Cloud Deployment

### AWS Deployment

#### ECS Task Definition
```json
{
  "family": "aviation-weather-services",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "your-registry/aviation-weather-frontend:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aviation-weather-services",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "frontend"
        }
      }
    },
    {
      "name": "backend",
      "image": "your-registry/aviation-weather-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "CHECKWX_API_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/aviation-weather/checkwx-api-key"
        },
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/aviation-weather/mongodb-uri"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aviation-weather-services",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "backend"
        }
      }
    }
  ]
}
```

#### ECS Service Configuration
```yaml
# ecs-service.yml
apiVersion: v1
kind: Service
metadata:
  name: aviation-weather-service
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 80
      name: http
    - port: 443
      targetPort: 443
      name: https
  selector:
    app: aviation-weather
```

### Kubernetes Deployment

#### Namespace
```yaml
# k8s/namespace.yml
apiVersion: v1
kind: Namespace
metadata:
  name: aviation-weather
```

#### ConfigMap
```yaml
# k8s/configmap.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aviation-weather-config
  namespace: aviation-weather
data:
  NODE_ENV: "production"
  API_BASE_URL: "https://api.aviationweather.app"
  FRONTEND_URL: "https://aviationweather.app"
```

#### Secrets
```yaml
# k8s/secrets.yml
apiVersion: v1
kind: Secret
metadata:
  name: aviation-weather-secrets
  namespace: aviation-weather
type: Opaque
data:
  checkwx-api-key: <base64-encoded-key>
  openai-api-key: <base64-encoded-key>
  mongodb-uri: <base64-encoded-uri>
  redis-password: <base64-encoded-password>
```

#### Deployment
```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aviation-weather-backend
  namespace: aviation-weather
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aviation-weather-backend
  template:
    metadata:
      labels:
        app: aviation-weather-backend
    spec:
      containers:
      - name: backend
        image: your-registry/aviation-weather-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: aviation-weather-config
              key: NODE_ENV
        - name: CHECKWX_API_KEY
          valueFrom:
            secretKeyRef:
              name: aviation-weather-secrets
              key: checkwx-api-key
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: aviation-weather-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Service
```yaml
# k8s/service.yml
apiVersion: v1
kind: Service
metadata:
  name: aviation-weather-backend-service
  namespace: aviation-weather
spec:
  selector:
    app: aviation-weather-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
  type: ClusterIP
```

#### Ingress
```yaml
# k8s/ingress.yml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: aviation-weather-ingress
  namespace: aviation-weather
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - aviationweather.app
    - api.aviationweather.app
    secretName: aviation-weather-tls
  rules:
  - host: aviationweather.app
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: aviation-weather-frontend-service
            port:
              number: 80
  - host: api.aviationweather.app
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: aviation-weather-backend-service
            port:
              number: 80
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

#### Main Workflow
```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        env:
          MONGO_INITDB_ROOT_USERNAME: admin
          MONGO_INITDB_ROOT_PASSWORD: password
        ports:
          - 27017:27017
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: |
          frontend-react/package-lock.json
          backend-node/package-lock.json
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        cache: 'pip'
    
    - name: Install Frontend Dependencies
      run: |
        cd frontend-react
        npm ci
    
    - name: Install Backend Dependencies
      run: |
        cd backend-node
        npm ci
    
    - name: Install Python Dependencies
      run: |
        cd backend-python-nlp
        pip install -r requirements.txt
    
    - name: Run Frontend Tests
      run: |
        cd frontend-react
        npm test -- --coverage --watchAll=false
    
    - name: Run Backend Tests
      run: |
        cd backend-node
        npm test
      env:
        MONGODB_URI: mongodb://admin:password@localhost:27017/test?authSource=admin
        REDIS_URL: redis://localhost:6379
    
    - name: Run Python Tests
      run: |
        cd backend-python-nlp
        python -m pytest --cov=nlp tests/
    
    - name: Upload Coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: |
          frontend-react/coverage/lcov.info
          backend-node/coverage/lcov.info
          backend-python-nlp/coverage.xml

  build:
    name: Build and Push Images
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    permissions:
      contents: read
      packages: write
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
    
    - name: Build and push Frontend image
      uses: docker/build-push-action@v4
      with:
        context: ./frontend-react
        push: true
        tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
    
    - name: Build and push Backend image
      uses: docker/build-push-action@v4
      with:
        context: ./backend-node
        push: true
        tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
    
    - name: Build and push NLP Service image
      uses: docker/build-push-action@v4
      with:
        context: ./backend-python-nlp
        push: true
        tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-nlp:${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Deploy to ECS
      run: |
        # Update ECS service with new task definition
        aws ecs update-service \
          --cluster aviation-weather-cluster \
          --service aviation-weather-service \
          --force-new-deployment
    
    - name: Verify deployment
      run: |
        # Wait for deployment to complete
        aws ecs wait services-stable \
          --cluster aviation-weather-cluster \
          --services aviation-weather-service
        
        # Check application health
        curl -f https://aviationweather.app/health || exit 1
```

### GitLab CI/CD Pipeline

#### .gitlab-ci.yml
```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

services:
  - docker:20.10.16-dind
  - mongo:6
  - redis:7-alpine

before_script:
  - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY

test:frontend:
  stage: test
  image: node:18
  cache:
    paths:
      - frontend-react/node_modules/
  script:
    - cd frontend-react
    - npm ci
    - npm test -- --coverage --watchAll=false
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: frontend-react/coverage/cobertura-coverage.xml

test:backend:
  stage: test
  image: node:18
  services:
    - mongo:6
    - redis:7-alpine
  variables:
    MONGODB_URI: mongodb://mongo:27017/test
    REDIS_URL: redis://redis:6379
  cache:
    paths:
      - backend-node/node_modules/
  script:
    - cd backend-node
    - npm ci
    - npm test
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'

test:nlp:
  stage: test
  image: python:3.11
  cache:
    paths:
      - backend-python-nlp/.pip-cache/
  script:
    - cd backend-python-nlp
    - pip install --cache-dir .pip-cache -r requirements.txt
    - python -m pytest --cov=nlp tests/
  coverage: '/TOTAL.+?(\d+\%)$/'

build:
  stage: build
  image: docker:20.10.16
  script:
    - docker build -t $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA ./frontend-react
    - docker build -t $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA ./backend-node
    - docker build -t $CI_REGISTRY_IMAGE/nlp:$CI_COMMIT_SHA ./backend-python-nlp
    - docker push $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE/nlp:$CI_COMMIT_SHA
  only:
    - main

deploy:production:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl kubectl
  script:
    - kubectl set image deployment/aviation-weather-frontend frontend=$CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA
    - kubectl set image deployment/aviation-weather-backend backend=$CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA
    - kubectl set image deployment/aviation-weather-nlp nlp=$CI_REGISTRY_IMAGE/nlp:$CI_COMMIT_SHA
    - kubectl rollout status deployment/aviation-weather-frontend
    - kubectl rollout status deployment/aviation-weather-backend
    - kubectl rollout status deployment/aviation-weather-nlp
  environment:
    name: production
    url: https://aviationweather.app
  only:
    - main
  when: manual
```

---

## 📊 Monitoring and Logging

### Prometheus Configuration

#### prometheus.yml
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'aviation-weather-frontend'
    static_configs:
      - targets: ['frontend:80']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'aviation-weather-backend'
    static_configs:
      - targets: ['backend:5000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'aviation-weather-nlp'
    static_configs:
      - targets: ['nlp-service:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'mongodb-exporter'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Application Metrics

#### Node.js Metrics
```javascript
// backend-node/middleware/metrics.js
const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'aviation-weather-backend'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const weatherApiCallsTotal = new promClient.Counter({
  name: 'weather_api_calls_total',
  help: 'Total number of weather API calls',
  labelNames: ['provider', 'status']
});

const cacheHitsTotal = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type']
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(weatherApiCallsTotal);
register.registerMetric(cacheHitsTotal);

// Middleware to collect metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
};

// Metrics endpoint
const metricsEndpoint = async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  weatherApiCallsTotal,
  cacheHitsTotal
};
```

#### Python Metrics
```python
# backend-python-nlp/metrics.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time
import functools

# Metrics
REQUEST_COUNT = Counter(
    'nlp_requests_total',
    'Total NLP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'nlp_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint']
)

ACTIVE_CONNECTIONS = Gauge(
    'nlp_active_connections',
    'Active connections'
)

AI_PROCESSING_TIME = Histogram(
    'ai_processing_duration_seconds',
    'AI processing time in seconds',
    ['model', 'operation']
)

AI_REQUESTS_TOTAL = Counter(
    'ai_requests_total',
    'Total AI requests',
    ['model', 'status']
)

# Decorator for timing
def timed_request(f):
    @functools.wraps(f)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await f(*args, **kwargs)
            status = 'success'
            return result
        except Exception as e:
            status = 'error'
            raise
        finally:
            duration = time.time() - start_time
            REQUEST_DURATION.labels(
                method=f.__name__,
                endpoint=f.__name__
            ).observe(duration)
            REQUEST_COUNT.labels(
                method=f.__name__,
                endpoint=f.__name__,
                status=status
            ).inc()
    return wrapper

# Start metrics server
def start_metrics_server():
    start_http_server(8001)
```

### Grafana Dashboards

#### Dashboard Configuration
```json
{
  "dashboard": {
    "id": null,
    "title": "Aviation Weather Services",
    "tags": ["aviation", "weather"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests per second"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          },
          {
            "expr": "rate(http_requests_total{status_code=~\"4..\"}[5m])",
            "legendFormat": "4xx errors"
          }
        ]
      },
      {
        "id": 4,
        "title": "Cache Hit Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(cache_hits_total[5m]) / rate(cache_requests_total[5m]) * 100",
            "legendFormat": "Cache Hit Rate %"
          }
        ],
        "valueMaps": [
          {
            "value": "null",
            "text": "N/A"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

### Alerting Rules

#### Alert Rules
```yaml
# monitoring/rules/alerts.yml
groups:
- name: aviation-weather-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} requests per second"

  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }} seconds"

  - alert: ServiceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service is down"
      description: "{{ $labels.instance }} has been down for more than 1 minute"

  - alert: DatabaseConnections
    expr: mongodb_connections{state="current"} > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High database connection count"
      description: "MongoDB has {{ $value }} active connections"

  - alert: LowCacheHitRate
    expr: rate(cache_hits_total[5m]) / rate(cache_requests_total[5m]) < 0.7
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Low cache hit rate"
      description: "Cache hit rate is {{ $value | humanizePercentage }}"
```

---

## 🛡️ Security Configuration

### SSL/TLS Configuration

#### Let's Encrypt Setup
```bash
#!/bin/bash
# scripts/setup-ssl.sh

# Install certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d aviationweather.app -d www.aviationweather.app -d api.aviationweather.app

# Set up auto-renewal
sudo crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

# Test certificate renewal
sudo certbot renew --dry-run
```

### Environment Security

#### Production Environment Variables
```bash
# .env.production
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aviation-weather?retryWrites=true&w=majority
REDIS_URL=redis://user:password@redis-host:6379

# API Keys (use AWS Secrets Manager or similar)
CHECKWX_API_KEY=${AWS_SSM:/aviation-weather/checkwx-api-key}
OPENAI_API_KEY=${AWS_SSM:/aviation-weather/openai-api-key}
MAPBOX_ACCESS_TOKEN=${AWS_SSM:/aviation-weather/mapbox-token}

# Security
CORS_ORIGIN=https://aviationweather.app
JWT_SECRET=${AWS_SSM:/aviation-weather/jwt-secret}
SESSION_SECRET=${AWS_SSM:/aviation-weather/session-secret}

# Monitoring
SENTRY_DSN=${AWS_SSM:/aviation-weather/sentry-dsn}
```

#### Secrets Management
```python
# scripts/manage-secrets.py
import boto3
import json

def create_secrets():
    """Create secrets in AWS Secrets Manager"""
    client = boto3.client('secretsmanager')
    
    secrets = {
        'aviation-weather/database': {
            'mongodb_uri': 'mongodb+srv://...',
            'redis_url': 'redis://...'
        },
        'aviation-weather/api-keys': {
            'checkwx_api_key': 'your-checkwx-key',
            'openai_api_key': 'your-openai-key',
            'mapbox_token': 'your-mapbox-token'
        },
        'aviation-weather/app': {
            'jwt_secret': 'your-jwt-secret',
            'session_secret': 'your-session-secret'
        }
    }
    
    for secret_name, secret_value in secrets.items():
        try:
            client.create_secret(
                Name=secret_name,
                SecretString=json.dumps(secret_value)
            )
            print(f"Created secret: {secret_name}")
        except client.exceptions.ResourceExistsException:
            client.update_secret(
                SecretId=secret_name,
                SecretString=json.dumps(secret_value)
            )
            print(f"Updated secret: {secret_name}")

if __name__ == '__main__':
    create_secrets()
```

---

## 🚨 Disaster Recovery

### Backup Strategy

#### Database Backups
```bash
#!/bin/bash
# scripts/backup-database.sh

# Variables
BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="aviation-weather-backup-$DATE"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Create MongoDB backup
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$BACKUP_NAME"

# Compress backup
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

# Upload to S3
aws s3 cp "$BACKUP_DIR/$BACKUP_NAME.tar.gz" "s3://aviation-weather-backups/mongodb/"

# Clean up local backups older than retention period
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_NAME.tar.gz"
```

#### Application State Backup
```bash
#!/bin/bash
# scripts/backup-app-state.sh

# Backup Redis data
redis-cli --rdb /backups/redis/dump-$(date +%Y%m%d_%H%M%S).rdb

# Backup configuration files
tar -czf "/backups/config/config-$(date +%Y%m%d_%H%M%S).tar.gz" \
  /etc/nginx/nginx.conf \
  /etc/ssl/certs/ \
  /app/config/

# Upload to S3
aws s3 sync /backups/ s3://aviation-weather-backups/
```

### Restore Procedures

#### Database Restore
```bash
#!/bin/bash
# scripts/restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# Download from S3
aws s3 cp "s3://aviation-weather-backups/mongodb/$BACKUP_FILE" /tmp/

# Extract backup
tar -xzf "/tmp/$BACKUP_FILE" -C /tmp/

# Restore database
mongorestore --uri="$MONGODB_URI" --drop /tmp/aviation-weather-backup-*/

echo "Database restored from $BACKUP_FILE"
```

### High Availability Setup

#### Load Balancer Configuration
```yaml
# docker-compose.ha.yml
version: '3.8'

services:
  nginx-lb:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/lb.conf:/etc/nginx/nginx.conf
    depends_on:
      - nginx-1
      - nginx-2

  nginx-1:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend-1
      - backend-2

  nginx-2:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend-1
      - backend-2

  backend-1:
    build: ./backend-node
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=backend-1
    depends_on:
      - mongodb-primary
      - redis-primary

  backend-2:
    build: ./backend-node
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=backend-2
    depends_on:
      - mongodb-primary
      - redis-primary

  mongodb-primary:
    image: mongo:6
    command: mongod --replSet rs0 --bind_ip_all
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_primary_data:/data/db

  mongodb-secondary:
    image: mongo:6
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongodb_secondary_data:/data/db

  redis-primary:
    image: redis:7-alpine
    command: redis-server --appendonly yes --replica-announce-ip redis-primary
    volumes:
      - redis_primary_data:/data

  redis-replica:
    image: redis:7-alpine
    command: redis-server --appendonly yes --replicaof redis-primary 6379
    depends_on:
      - redis-primary
    volumes:
      - redis_replica_data:/data

volumes:
  mongodb_primary_data:
  mongodb_secondary_data:
  redis_primary_data:
  redis_replica_data:
```

---

## 🎯 Performance Optimization

### CDN Configuration

#### CloudFront Distribution
```json
{
  "DistributionConfig": {
    "CallerReference": "aviation-weather-2023",
    "Comment": "Aviation Weather Services CDN",
    "DefaultCacheBehavior": {
      "TargetOriginId": "aviation-weather-origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "TrustedSigners": {
        "Enabled": false,
        "Quantity": 0
      },
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {
          "Forward": "none"
        }
      },
      "MinTTL": 0,
      "DefaultTTL": 86400,
      "MaxTTL": 31536000
    },
    "CacheBehaviors": [
      {
        "PathPattern": "/api/*",
        "TargetOriginId": "aviation-weather-origin",
        "ViewerProtocolPolicy": "https-only",
        "ForwardedValues": {
          "QueryString": true,
          "Cookies": {
            "Forward": "all"
          },
          "Headers": ["Authorization", "Content-Type"]
        },
        "MinTTL": 0,
        "DefaultTTL": 0,
        "MaxTTL": 0
      },
      {
        "PathPattern": "*.js",
        "TargetOriginId": "aviation-weather-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "ForwardedValues": {
          "QueryString": false,
          "Cookies": {
            "Forward": "none"
          }
        },
        "MinTTL": 31536000,
        "DefaultTTL": 31536000,
        "MaxTTL": 31536000
      },
      {
        "PathPattern": "*.css",
        "TargetOriginId": "aviation-weather-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "ForwardedValues": {
          "QueryString": false,
          "Cookies": {
            "Forward": "none"
          }
        },
        "MinTTL": 31536000,
        "DefaultTTL": 31536000,
        "MaxTTL": 31536000
      }
    ],
    "Origins": [
      {
        "Id": "aviation-weather-origin",
        "DomainName": "aviationweather.app",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only"
        }
      }
    ],
    "Enabled": true,
    "PriceClass": "PriceClass_All"
  }
}
```

### Database Optimization

#### MongoDB Indexes
```javascript
// scripts/create-indexes.js
db.weather_data.createIndex({ "icao_code": 1, "timestamp": -1 });
db.weather_data.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 604800 }); // 7 days
db.cache.createIndex({ "key": 1 }, { unique: true });
db.cache.createIndex({ "created_at": 1 }, { expireAfterSeconds: 3600 }); // 1 hour

db.users.createIndex({ "email": 1 }, { unique: true });
db.sessions.createIndex({ "expires": 1 }, { expireAfterSeconds: 0 });

// Compound indexes for common queries
db.weather_history.createIndex({ 
  "icao_code": 1, 
  "timestamp": -1, 
  "type": 1 
});
```

#### Redis Configuration
```redis
# redis.conf for production

# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass ${REDIS_PASSWORD}
bind 0.0.0.0

# Performance
tcp-keepalive 60
timeout 300

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

---

## 📈 Scaling Considerations

### Horizontal Scaling

#### Auto Scaling Group Configuration
```json
{
  "AutoScalingGroupName": "aviation-weather-asg",
  "LaunchTemplate": {
    "LaunchTemplateName": "aviation-weather-template",
    "Version": "$Latest"
  },
  "MinSize": 2,
  "MaxSize": 10,
  "DesiredCapacity": 3,
  "TargetGroupARNs": [
    "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/aviation-weather/1234567890123456"
  ],
  "HealthCheckType": "ELB",
  "HealthCheckGracePeriod": 300,
  "Tags": [
    {
      "Key": "Application",
      "Value": "aviation-weather-services",
      "PropagateAtLaunch": true
    }
  ]
}
```

#### Kubernetes HPA
```yaml
# k8s/hpa.yml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aviation-weather-backend-hpa
  namespace: aviation-weather
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aviation-weather-backend
  minReplicas: 2
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
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Database Sharding Strategy

#### MongoDB Sharding
```javascript
// scripts/setup-sharding.js

// Enable sharding for the database
sh.enableSharding("aviation_weather");

// Shard collections based on usage patterns
sh.shardCollection("aviation_weather.weather_data", {"icao_code": 1, "timestamp": 1});
sh.shardCollection("aviation_weather.user_sessions", {"user_id": 1});
sh.shardCollection("aviation_weather.cache", {"key": "hashed"});

// Add shard tags for geographic distribution
sh.addShardTag("shard0000", "US-EAST");
sh.addShardTag("shard0001", "US-WEST");
sh.addShardTag("shard0002", "EUROPE");

// Configure tag ranges
sh.addTagRange(
  "aviation_weather.weather_data",
  {"icao_code": "K", "timestamp": MinKey},
  {"icao_code": "L", "timestamp": MaxKey},
  "US-EAST"
);
```

---

## 📚 Operational Runbooks

### Deployment Checklist

#### Pre-Deployment
- [ ] **Code Review**: All changes peer-reviewed and approved
- [ ] **Tests**: All tests passing in CI/CD pipeline
- [ ] **Database Migrations**: Schema changes tested and ready
- [ ] **Environment Variables**: All secrets updated in production
- [ ] **Dependencies**: No known security vulnerabilities
- [ ] **Performance**: Load testing completed if significant changes
- [ ] **Rollback Plan**: Prepared and tested
- [ ] **Team Notification**: Deployment scheduled and communicated

#### During Deployment
- [ ] **Health Checks**: Monitor application health endpoints
- [ ] **Error Monitoring**: Watch error rates and logs
- [ ] **Performance Metrics**: Monitor response times and throughput
- [ ] **Database**: Monitor connection counts and query performance
- [ ] **External APIs**: Verify third-party service connectivity
- [ ] **User Experience**: Test critical user flows

#### Post-Deployment
- [ ] **Smoke Tests**: Run automated smoke tests
- [ ] **User Acceptance**: Verify main features working correctly
- [ ] **Performance Baseline**: Establish new performance baselines
- [ ] **Documentation**: Update deployment logs and notes
- [ ] **Team Update**: Notify team of successful deployment
- [ ] **Monitor**: Continue monitoring for 24 hours post-deployment

### Troubleshooting Guides

#### Common Issues and Solutions

**Issue: High Response Times**
```bash
# Check system resources
top
df -h
free -h

# Check application logs
docker logs aviation-weather-backend
kubectl logs deployment/aviation-weather-backend

# Check database performance
mongo --eval "db.runCommand({currentOp: true})"

# Check Redis performance
redis-cli info stats
```

**Issue: Database Connection Errors**
```bash
# Check MongoDB status
mongo --eval "rs.status()"

# Check connection pool
mongo --eval "db.runCommand({connPoolStats: 1})"

# Restart MongoDB if needed
kubectl restart deployment/mongodb
```

**Issue: External API Failures**
```bash
# Test API connectivity
curl -v https://aviationweather.gov/api/data/metar?ids=KJFK
curl -v https://api.checkwx.com/metar/KJFK

# Check API rate limits
grep "rate limit" /var/log/aviation-weather/app.log

# Switch to backup provider if needed
kubectl patch deployment aviation-weather-backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","env":[{"name":"PRIMARY_WEATHER_API","value":"checkwx"}]}]}}}}'
```

---

## 🔧 Maintenance Procedures

### Regular Maintenance Tasks

#### Weekly Tasks
```bash
#!/bin/bash
# scripts/weekly-maintenance.sh

echo "Starting weekly maintenance..."

# Update system packages
apt-get update && apt-get upgrade -y

# Clean up old Docker images
docker system prune -f

# Rotate logs
logrotate /etc/logrotate.conf

# Check disk space
df -h | grep -E '(8[0-9]|9[0-9])%' && echo "Warning: High disk usage"

# Backup databases
./scripts/backup-database.sh

# Update SSL certificates
certbot renew --quiet

echo "Weekly maintenance completed"
```

#### Monthly Tasks
```bash
#!/bin/bash
# scripts/monthly-maintenance.sh

echo "Starting monthly maintenance..."

# Update dependencies
cd frontend-react && npm audit fix
cd ../backend-node && npm audit fix
cd ../backend-python-nlp && pip-audit --fix

# Database maintenance
mongo aviation_weather --eval "
  db.weather_data.remove({timestamp: {$lt: new Date(Date.now() - 30*24*60*60*1000)}});
  db.runCommand({compact: 'weather_data'});
"

# Generate performance reports
./scripts/generate-monthly-report.sh

# Review and update documentation
echo "Review documentation for accuracy and updates"

echo "Monthly maintenance completed"
```

### Security Updates

#### Security Patch Process
```bash
#!/bin/bash
# scripts/security-update.sh

SECURITY_UPDATES=$(apt list --upgradable | grep security)

if [ ! -z "$SECURITY_UPDATES" ]; then
    echo "Security updates available:"
    echo "$SECURITY_UPDATES"
    
    # Create snapshot before updates
    aws ec2 create-snapshot --volume-id vol-12345678 --description "Pre-security-update"
    
    # Apply security updates
    apt-get update
    apt-get upgrade -y
    
    # Restart services if needed
    systemctl restart aviation-weather-backend
    systemctl restart nginx
    
    echo "Security updates applied successfully"
else
    echo "No security updates available"
fi
```

---

## 📞 Support and Escalation

### Support Tiers

#### Tier 1: Basic Support
- **Response Time**: 4 hours during business hours
- **Coverage**: Basic functionality issues, user account problems
- **Contact**: support@aviationweather.app
- **Tools**: Standard monitoring dashboards, application logs

#### Tier 2: Advanced Support  
- **Response Time**: 2 hours during business hours, 4 hours outside
- **Coverage**: API issues, performance problems, integration failures
- **Contact**: tech-support@aviationweather.app
- **Tools**: Full monitoring suite, database access, infrastructure logs

#### Tier 3: Critical Support
- **Response Time**: 30 minutes 24/7
- **Coverage**: System outages, data corruption, security incidents
- **Contact**: critical@aviationweather.app (PagerDuty integration)
- **Tools**: Full system access, emergency procedures, escalation protocols

### Emergency Contacts

#### Escalation Matrix
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tier 1 Team   │────│   Tier 2 Team   │────│   Tier 3 Team   │
│   (4h response) │    │   (2h response) │    │  (30m response) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
  Basic Issues           Advanced Issues            Critical Issues
  User Problems          Performance Issues         System Outages
  Account Access         API Failures              Security Incidents
```

### Incident Response Plan

#### Severity Levels

**Severity 1 (Critical)**
- **Definition**: Complete system outage or security breach
- **Response Time**: 30 minutes
- **Escalation**: Immediate to Tier 3, notify management
- **Communication**: Status page update every 30 minutes

**Severity 2 (High)**  
- **Definition**: Partial outage or significant performance degradation
- **Response Time**: 2 hours
- **Escalation**: To Tier 2 within 1 hour if unresolved
- **Communication**: Status page update every 2 hours

**Severity 3 (Medium)**
- **Definition**: Non-critical functionality affected
- **Response Time**: 4 hours during business hours
- **Escalation**: Standard support process
- **Communication**: Email updates to affected users

**Severity 4 (Low)**
- **Definition**: Minor issues, cosmetic problems
- **Response Time**: Next business day
- **Escalation**: None required
- **Communication**: Standard support channels

---

*This deployment guide provides comprehensive coverage of production deployment considerations. Always test deployment procedures in staging environments before applying to production, and maintain current backups before making significant changes.*

---

*Deployment Guide last updated: September 27, 2025*