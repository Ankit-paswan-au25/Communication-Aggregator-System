# Communication-Aggregator-System
Backend that receives messages from multiple sources and routes them intelligently to the right communication channel (Email, SMS, WhatsApp, etc.).

## Architecture

The system consists of multiple microservices:
- **task-router-service**: Main API endpoint that receives communication requests and routes them to appropriate channels
- **email-service**: Processes email communication tasks
- **sms-service**: Processes SMS communication tasks via Twilio
- **whatsapp-service**: Processes WhatsApp communication tasks
- **logging-service**: Aggregates logs from all services

## Tech Stack

- **Node.js** with Express
- **MongoDB** for persistent storage
- **Redis Streams** for message queue
- **Elasticsearch** for search and analytics
- **Kibana** for visualization and monitoring

## Prerequisites

- Node.js (v18+)
- MongoDB
- Redis
- Elasticsearch (v8.x)
- Kibana (v8.x)

## Setup Instructions

### 1. Install Dependencies

Install dependencies for each service:
```bash
cd task-router-service && npm install
cd ../logging-service && npm install
cd ../sms-service && npm install
cd ../email-service && npm install
cd ../whatsapp-service && npm install
```

### 2. Environment Configuration

Create `.env` files in each service directory (or use a shared `.env` in the root):

```env
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017/communication-aggregator

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Elasticsearch Configuration
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=your_elasticsearch_password

# Twilio Configuration (for SMS Service)
ACCOUNTSID=your_twilio_account_sid
AUTHTOKEN=your_twilio_auth_token
MSG_ID=your_twilio_messaging_service_sid

# Server Port
PORT=3001
```

### 3. Start Services

Start all services (each in a separate terminal):

```bash
# Terminal 1: Task Router
cd task-router-service && node index.js

# Terminal 2: Logging Service
cd logging-service && node index.js

# Terminal 3: SMS Service
cd sms-service && node index.js

# Terminal 4: Email Service
cd email-service && node index.js

# Terminal 5: WhatsApp Service
cd whatsapp-service && node index.js
```

## Elasticsearch Integration

### Indices Created

The system automatically creates two Elasticsearch indices:

1. **communications**: Stores all communication requests
   - Fields: `from`, `to`, `msg`, `status`, `type`, `stream`, `communicationId`, `timestamp`, `createdAt`

2. **communication-logs**: Stores operational logs from all services
   - Fields: `service`, `status`, `from`, `to`, `msg`, `error`, `timestamp`, `communicationId`

### Viewing Data in Kibana

1. Open Kibana at `http://localhost:5601`
2. Go to **Stack Management** > **Index Patterns**
3. Create index patterns:
   - `communications*`
   - `communication-logs*`
4. Go to **Discover** to view and search your data
5. Create dashboards to visualize:
   - Communication volume by service
   - Success/failure rates
   - Response times
   - Error patterns

### API Usage

Send a communication request:

```bash
POST http://localhost:3001/api/v1/communication
Content-Type: application/json

{
  "type": "sms",
  "data": {
    "from": "+1234567890",
    "to": "+0987654321",
    "msg": "Hello, this is a test message"
  }
}
```

Supported types: `email`, `sms`, `whatsapp`

## Features

- ✅ Multi-channel communication routing
- ✅ Redis Streams for reliable message queuing
- ✅ MongoDB for persistent storage
- ✅ Elasticsearch for search and analytics
- ✅ Real-time logging and monitoring
- ✅ Error handling and status tracking

## Project Structure

```
Communication-Aggregator-System/
├── task-router-service/     # Main API and routing logic
│   ├── config/
│   │   ├── dbConfig.js
│   │   └── elasticsearch.js
│   ├── model/
│   │   └── communication.js
│   └── index.js
├── email-service/           # Email processing service
│   ├── config/
│   │   └── elasticsearch.js
│   └── index.js
├── sms-service/             # SMS processing service
│   ├── config/
│   │   └── elasticsearch.js
│   └── index.js
├── whatsapp-service/        # WhatsApp processing service
│   ├── config/
│   │   └── elasticsearch.js
│   └── index.js
└── logging-service/         # Log aggregation service
    ├── config/
    │   └── elasticsearch.js
    └── index.js
```