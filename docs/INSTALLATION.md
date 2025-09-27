# 🚀 Aviation Weather Services - Installation Guide

## Prerequisites

Before installing the Aviation Weather Services system, ensure your development environment meets the following requirements:

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores, 2.0 GHz
- **RAM**: 4 GB
- **Storage**: 5 GB free space
- **Network**: Stable internet connection for API access

#### Recommended Requirements
- **CPU**: 4+ cores, 3.0+ GHz
- **RAM**: 8+ GB
- **Storage**: 10+ GB free space (for development and caching)
- **Network**: High-speed internet (for real-time weather data)

### Software Dependencies

#### Required Software
1. **Node.js** (v18.0.0 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

2. **Python** (v3.8.0 or higher)
   - Download from: https://python.org/
   - Verify: `python --version` and `pip --version`

3. **Git** (latest version)
   - Download from: https://git-scm.com/
   - Verify: `git --version`

#### Optional but Recommended
- **VS Code** or preferred IDE
- **Postman** for API testing
- **Docker** (for containerized deployment)

---

## 📥 Installation Steps

### Step 1: Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/Asheesh18-codes/Design-of-Weather-Services.git

# Navigate to project directory
cd Design-of-Weather-Services

# Verify repository structure
ls -la
```

Expected output:
```
total 64
drwxr-xr-x  8 user user 4096 Sep 27 19:00 .
drwxr-xr-x  3 user user 4096 Sep 27 19:00 ..
drwxr-xr-x  8 user user 4096 Sep 27 19:00 .git
-rw-r--r--  1 user user 1234 Sep 27 19:00 .gitignore
-rw-r--r--  1 user user 1234 Sep 27 19:00 README.md
drwxr-xr-x  5 user user 4096 Sep 27 19:00 backend-node
drwxr-xr-x  4 user user 4096 Sep 27 19:00 backend-python-nlp
drwxr-xr-x  3 user user 4096 Sep 27 19:00 docs
drwxr-xr-x  5 user user 4096 Sep 27 19:00 frontend-react
drwxr-xr-x  3 user user 4096 Sep 27 19:00 scripts
```

### Step 2: Environment Configuration

#### 2.1 Backend Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit the .env file
nano .env  # or use your preferred editor
```

Configure your `.env` file:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Python NLP Service URL
PYTHON_NLP_URL=http://localhost:8000

# CheckWX API Key (for backup weather data)
WEATHER_API_KEY=your_checkwx_api_key_here

# Optional: Database Configuration (if using database)
DATABASE_URL=postgresql://username:password@localhost:5432/aviation_weather

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

#### 2.2 Frontend Environment Setup

```bash
cd frontend-react

# Create frontend environment file
cat > .env << EOF
# Mapbox Access Token (for interactive maps)
VITE_MAPBOX_TOKEN=your_mapbox_access_token_here

# Backend API URL
VITE_API_BASE_URL=http://localhost:5000/api

# NLP Service URL
VITE_NLP_API_URL=http://localhost:8000
EOF
```

#### 2.3 Python NLP Service Environment

```bash
cd ../backend-python-nlp

# Create Python environment file (optional)
cat > .env << EOF
# NLP Service Configuration
PORT=8000
HOST=0.0.0.0

# OpenAI API Key (optional, for enhanced AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Model Configuration
MODEL_NAME=gpt-3.5-turbo
MAX_TOKENS=1500
TEMPERATURE=0.3
EOF
```

### Step 3: API Keys Setup

#### 3.1 CheckWX API Key (Required for backup weather data)

1. **Sign up at CheckWX**:
   - Visit: https://api.checkwx.com/
   - Create a free account
   - Navigate to "API Keys" section
   - Copy your API key

2. **Add to environment**:
   ```bash
   # In your .env file
   WEATHER_API_KEY=your_actual_checkwx_api_key
   ```

3. **Test API key**:
   ```bash
   curl -H "X-API-Key: YOUR_API_KEY" "https://api.checkwx.com/metar/KJFK"
   ```

#### 3.2 Mapbox Access Token (Required for maps)

1. **Create Mapbox Account**:
   - Visit: https://account.mapbox.com/
   - Sign up for free account
   - Go to "Access tokens" page
   - Copy your default public token OR create a new one

2. **Add to frontend environment**:
   ```bash
   # In frontend-react/.env
   VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
   ```

3. **Test token**:
   ```bash
   curl "https://api.mapbox.com/geocoding/v5/mapbox.places/airport.json?access_token=YOUR_TOKEN"
   ```

#### 3.3 OpenAI API Key (Optional for enhanced AI)

1. **Create OpenAI Account**:
   - Visit: https://platform.openai.com/
   - Sign up and add billing method
   - Go to API keys section
   - Create new secret key

2. **Add to Python environment**:
   ```bash
   # In backend-python-nlp/.env
   OPENAI_API_KEY=sk-your_openai_api_key_here
   ```

### Step 4: Dependencies Installation

#### 4.1 Backend Node.js Dependencies

```bash
cd backend-node

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

Expected dependencies:
```
├── express@4.18.2
├── axios@1.5.0
├── cors@2.8.5
├── dotenv@16.3.1
├── nodemon@3.0.1 (dev)
└── jest@29.6.2 (dev)
```

#### 4.2 Frontend React Dependencies

```bash
cd ../frontend-react

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

Expected dependencies:
```
├── react@18.2.0
├── react-dom@18.2.0
├── vite@4.4.9
├── @vitejs/plugin-react@4.0.4
├── tailwindcss@3.3.3
├── axios@1.5.0
├── mapbox-gl@2.15.0
└── @types/mapbox-gl@2.7.13
```

#### 4.3 Python NLP Service Dependencies

```bash
cd ../backend-python-nlp

# Create virtual environment (recommended)
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list
```

Expected packages:
```
fastapi==0.103.1
uvicorn==0.23.2
pydantic==2.3.0
requests==2.31.0
openai==1.3.0
python-dotenv==1.0.0
typing-extensions==4.7.1
```

### Step 5: Database Setup (Optional)

If you plan to use a database for caching or user data:

#### PostgreSQL Setup (Optional)

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
```

```sql
CREATE DATABASE aviation_weather;
CREATE USER weather_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE aviation_weather TO weather_user;
\q
```

#### Redis Setup (Optional for caching)

```bash
# Install Redis (Ubuntu/Debian)
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
# Should return: PONG
```

---

## ✅ Verification & Testing

### Step 6: Test Individual Services

#### 6.1 Test Backend API

```bash
cd backend-node

# Start backend server
npm start
# Server should start on http://localhost:5000

# In a new terminal, test endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/weather/current/KJFK
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-27T19:00:00Z",
  "version": "1.0.0",
  "services": {
    "weather_apis": {
      "aviationweather": "operational",
      "checkwx": "operational"
    }
  }
}
```

#### 6.2 Test Frontend Application

```bash
cd frontend-react

# Start development server
npm run dev
# Should start on http://localhost:5173

# Open browser and navigate to http://localhost:5173
# You should see the Aviation Weather Services interface
```

#### 6.3 Test Python NLP Service

```bash
cd backend-python-nlp

# Activate virtual environment (if not already active)
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Start NLP service
python app.py
# Should start on http://localhost:8000

# Test in new terminal
curl http://localhost:8000/health
curl -X POST http://localhost:8000/nlp/process-taf \
  -H "Content-Type: application/json" \
  -d '{"taf": "TAF KJFK 271720Z 2718/2824 28012KT 10SM FEW250", "airport": "KJFK"}'
```

### Step 7: Full System Test

#### 7.1 Start All Services

##### Option A: Using Start Scripts (Recommended)

```bash
# Windows PowerShell
.\start-all-services.ps1

# Linux/macOS
./start-all-services.sh
```

##### Option B: Manual Start (3 terminals)

```bash
# Terminal 1: Backend
cd backend-node
npm start

# Terminal 2: Frontend  
cd frontend-react
npm run dev

# Terminal 3: NLP Service
cd backend-python-nlp
source .venv/bin/activate
python app.py
```

#### 7.2 System Integration Test

1. **Open browser**: http://localhost:5173
2. **Enter airport code**: KJFK
3. **Click "Get Weather"**: Should load METAR and TAF data
4. **Test map functionality**: Should display airport on map
5. **Check AI analysis**: Should show TAF summary and recommendations

---

## 🔧 Development Environment Setup

### IDE Configuration

#### VS Code Setup (Recommended)

1. **Install VS Code Extensions**:
   ```bash
   # Install via command line or Extension Marketplace
   code --install-extension ms-vscode.vscode-node-azure-pack
   code --install-extension ms-python.python
   code --install-extension bradlc.vscode-tailwindcss
   code --install-extension esbenp.prettier-vscode
   ```

2. **Configure VS Code Settings**:
   ```json
   // .vscode/settings.json
   {
     "python.defaultInterpreterPath": "./backend-python-nlp/.venv/bin/python",
     "editor.formatOnSave": true,
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     },
     "files.associations": {
       "*.jsx": "javascriptreact"
     }
   }
   ```

3. **Configure Launch Configuration**:
   ```json
   // .vscode/launch.json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Backend API",
         "type": "node",
         "request": "launch",
         "program": "${workspaceFolder}/backend-node/server.js",
         "env": {
           "NODE_ENV": "development"
         }
       },
       {
         "name": "Python NLP Service",
         "type": "python",
         "request": "launch",
         "program": "${workspaceFolder}/backend-python-nlp/app.py",
         "python": "${workspaceFolder}/backend-python-nlp/.venv/bin/python"
       }
     ]
   }
   ```

### Git Hooks Setup (Optional)

```bash
# Install husky for Git hooks
cd frontend-react
npm install --save-dev husky

# Set up pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

---

## 🚨 Troubleshooting

### Common Installation Issues

#### Node.js Issues

**Issue**: `node: command not found`
```bash
# Solution: Install Node.js via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
nvm use node
```

**Issue**: `npm ERR! peer dep missing`
```bash
# Solution: Install peer dependencies
npm install --legacy-peer-deps
# or
rm package-lock.json node_modules -rf && npm install
```

#### Python Issues

**Issue**: `python: command not found`
```bash
# On Ubuntu/Debian
sudo apt update && sudo apt install python3 python3-pip python3-venv

# On macOS (using Homebrew)
brew install python3

# On Windows: Download from python.org
```

**Issue**: `pip install fails with permission error`
```bash
# Solution: Use virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

#### Port Conflicts

**Issue**: `EADDRINUSE: address already in use :::5000`
```bash
# Find and kill process using port
lsof -ti:5000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5000   # Windows (then use taskkill)

# Or use different ports in .env
PORT=5001
```

#### API Key Issues

**Issue**: `401 Unauthorized` from CheckWX
```bash
# Verify API key
curl -H "X-API-Key: YOUR_KEY" "https://api.checkwx.com/metar/KJFK"

# Check rate limits
curl -H "X-API-Key: YOUR_KEY" "https://api.checkwx.com/account/"
```

**Issue**: Mapbox token invalid
```bash
# Test token
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/airport.json?access_token=YOUR_TOKEN"

# Make sure token starts with 'pk.' for public access
```

#### Environment Variable Issues

**Issue**: Environment variables not loading
```bash
# Ensure .env file is in correct location
ls -la .env

# Check file content
cat .env

# Restart all services after changing .env
```

### Performance Issues

#### Slow API Responses

1. **Check internet connection**
2. **Verify API endpoints status**:
   ```bash
   curl -I https://aviationweather.gov/adds/dataserver_current/
   ```
3. **Enable caching** (if implemented)
4. **Check rate limiting**

#### High Memory Usage

1. **Monitor with Activity Monitor/Task Manager**
2. **Restart services periodically**
3. **Adjust Python memory limits**:
   ```bash
   # Limit memory usage
   export PYTHONMALLOC=malloc
   ```

### Development Issues

#### Hot Reload Not Working

```bash
# Frontend (Vite)
cd frontend-react
rm -rf node_modules/.vite
npm run dev

# Backend (nodemon)
cd backend-node
rm -rf node_modules
npm install
```

#### CORS Errors

```javascript
// backend-node/server.js
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
```

---

## 📊 System Monitoring

### Health Checks

Create a monitoring script:
```bash
#!/bin/bash
# monitor.sh

echo "=== System Health Check ==="

# Check services
curl -f http://localhost:5000/api/health || echo "❌ Backend API down"
curl -f http://localhost:8000/health || echo "❌ NLP Service down"
curl -f http://localhost:5173/ || echo "❌ Frontend down"

echo "✅ Health check complete"
```

### Logging Configuration

```javascript
// backend-node/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'aviation-weather-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

---

## 🎯 Production Considerations

### Environment Preparation

```bash
# Set production environment
NODE_ENV=production

# Install only production dependencies
npm ci --only=production

# Build frontend for production
cd frontend-react
npm run build
```

### Security Checklist

- [ ] Remove development API keys
- [ ] Enable HTTPS certificates  
- [ ] Set up proper CORS policies
- [ ] Configure rate limiting
- [ ] Enable security headers
- [ ] Set up monitoring and alerting

### Performance Optimization

- [ ] Enable gzip compression
- [ ] Configure caching headers
- [ ] Optimize bundle sizes
- [ ] Set up CDN for static assets
- [ ] Database connection pooling
- [ ] Redis caching layer

---

## ✅ Installation Complete!

Once all steps are completed successfully:

1. **All services running**:
   - ✅ Backend API: http://localhost:5000
   - ✅ Frontend: http://localhost:5173  
   - ✅ NLP Service: http://localhost:8000

2. **Environment configured**:
   - ✅ API keys set up
   - ✅ Database connected (if applicable)
   - ✅ Dependencies installed

3. **System tested**:
   - ✅ Health checks passing
   - ✅ Weather data loading
   - ✅ Maps displaying
   - ✅ AI analysis working

**Next Steps**: 
- Review the [User Manual](USER_MANUAL.md)
- Check out the [API Documentation](API.md)  
- Explore the [Developer Guide](DEVELOPER_GUIDE.md)

---

## 📞 Installation Support

If you encounter issues during installation:

1. **Check troubleshooting section above**
2. **Search existing [GitHub Issues](https://github.com/Asheesh18-codes/Design-of-Weather-Services/issues)**
3. **Create new issue** with:
   - Operating system and version
   - Node.js and Python versions
   - Complete error messages
   - Steps you followed
   - Environment configuration (without API keys)

---

*Installation guide last updated: September 27, 2025*