# Aviation Weather Briefing - Next.js Frontend

This is the Next.js frontend for the Aviation Weather Briefing application.

## Backend Services Integration

This frontend connects to two backend services:

1. **Node.js Backend** (Port 5000): Handles weather data, flight plans, NOTAMs, and airport information
2. **Python NLP Service** (Port 8000): Provides NOTAM parsing and weather summarization using NLP

## Environment Configuration

The application uses environment variables defined in `.env.local`:

```bash
# API Endpoints
NEXT_PUBLIC_NODE_API_BASE=http://localhost:5000/api
NEXT_PUBLIC_PYTHON_NLP_BASE=http://localhost:8000

# Map Configuration
NEXT_PUBLIC_MAPBOX_KEY=your_mapbox_key_here
```

## Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

## Development

```bash
# Run the development server
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Services

### Node.js Backend APIs (lib/api.ts)

- **Weather API**: Fetch METAR, TAF, SIGMET data
- **Flight Plan API**: Generate waypoints and analyze routes
- **NOTAM API**: Retrieve NOTAMs for airports
- **Airport API**: Search and validate airport codes

### Python NLP Service (lib/nlpApi.ts)

- **NOTAM Parsing**: Extract structured data from NOTAM text
- **Weather Summarization**: Generate natural language summaries
- **Health Check**: Verify service availability

## Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   ├── dashboard/         # Dashboard page
│   └── briefing/          # Weather briefing page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── dashboard-layout.tsx
│   └── weather-search.tsx
├── lib/                   # Utility libraries
│   ├── api.ts            # Node.js backend API client
│   ├── nlpApi.ts         # Python NLP API client
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Helper functions
└── .env.local            # Environment variables (not in git)
```

## Starting All Services

To start all services together, use the provided scripts from the root directory:

### Windows (PowerShell)
```powershell
.\start-all-services.ps1
```

### Linux/Mac
```bash
./start-all-services.sh
```

This will start:
1. Backend Node.js server on port 5000
2. Python NLP service on port 8000
3. Next.js frontend on port 3000

## Build for Production

```bash
npm run build
npm run start
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Aviation Weather API Documentation](../docs/API.md)
- [Project Architecture](../docs/ARCHITECTURE.md)
