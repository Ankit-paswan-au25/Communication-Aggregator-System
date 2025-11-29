# High-Level Design (HLD) Document
## Communication Aggregator System

**Version:** 1.0  
**Date:** 2024  
**Author:** System Architecture Team

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Component Details](#3-component-details)
4. [Data Flow](#4-data-flow)
5. [Technology Stack](#5-technology-stack)
6. [Data Models](#6-data-models)
7. [API Specifications](#7-api-specifications)
8. [Integration Points](#8-integration-points)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Scalability Considerations](#10-scalability-considerations)
11. [Security Considerations](#11-security-considerations)
12. [Monitoring and Observability](#12-monitoring-and-observability)

---

## 1. System Overview

### 1.1 Purpose
The Communication Aggregator System is a microservices-based backend application that receives communication requests from multiple sources and intelligently routes them to appropriate communication channels (Email, SMS, WhatsApp, etc.). The system provides reliable message queuing, persistent storage, search capabilities, and comprehensive logging/observability.

### 1.2 Key Features
- **Multi-channel Communication Routing**: Supports Email, SMS, and WhatsApp
- **Reliable Message Queuing**: Uses Redis Streams for asynchronous processing
- **Persistent Storage**: MongoDB for transaction records
- **Search & Analytics**: Elasticsearch for indexing and Kibana for visualization
- **Real-time Logging**: Comprehensive logging with Elasticsearch integration
- **Error Handling**: Robust error handling and status tracking
- **Scalable Architecture**: Microservices architecture for independent scaling

### 1.3 Non-Functional Requirements
- **Availability**: High availability through microservices architecture
- **Scalability**: Horizontal scaling of individual services
- **Reliability**: Message persistence and queue-based processing
- **Observability**: Full logging and monitoring capabilities
- **Performance**: Asynchronous processing for high throughput

---

## 2. Architecture Overview

### 2.1 Architecture Pattern
The system follows a **Microservices Architecture** with:
- **Event-Driven Communication**: Redis Streams for inter-service messaging
- **API Gateway Pattern**: Task Router Service acts as the entry point
- **Consumer Pattern**: Worker services consume from Redis Streams
- **CQRS-like Approach**: Separate read (Elasticsearch) and write (MongoDB) paths

### 2.2 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         External Clients                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP POST
                            │ /api/v1/communication
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Task Router Service                           │
│                  (Port: 3001)                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Request Validation                                    │  │
│  │  • MongoDB Write (Communication Record)                  │  │
│  │  • Elasticsearch Indexing (Communication)                │  │
│  │  • Redis Stream Producer                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└───┬──────────────────┬──────────────────┬──────────────────┬───┘
    │                  │                  │                  │
    │                  │                  │                  │
    ▼                  ▼                  ▼                  ▼
┌─────────┐      ┌─────────┐      ┌──────────┐      ┌─────────┐
│  Redis  │      │  Redis  │      │  Redis   │      │  Redis  │
│ Stream  │      │ Stream  │      │ Stream   │      │ Stream  │
│ email_  │      │ sms_    │      │whatsapp_ │      │ log_    │
│ stream  │      │ stream  │      │ stream   │      │ stream  │
└────┬────┘      └────┬────┘      └────┬─────┘      └────┬────┘
     │                │                │                  │
     │                │                │                  │
     ▼                ▼                ▼                  ▼
┌─────────┐      ┌─────────┐      ┌──────────┐      ┌──────────┐
│ Email   │      │  SMS    │      │ WhatsApp │      │ Logging  │
│ Service │      │ Service │      │ Service  │      │ Service  │
│         │      │         │      │          │      │          │
│ ┌─────┐ │      │ ┌─────┐ │      │ ┌──────┐ │      │ ┌──────┐ │
│ │ES   │ │      │ │ES   │ │      │ │ES    │ │      │ │ES    │ │
│ │Index│ │      │ │Index│ │      │ │Index │ │      │ │Index │ │
│ └─────┘ │      │ └─────┘ │      │ └──────┘ │      │ └──────┘ │
│         │      │         │      │          │      │          │
│ • Read  │      │ • Read  │      │ • Read   │      │ • Read   │
│   from  │      │   from  │      │   from   │      │   from   │
│   stream│      │   stream│      │   stream │      │   stream │
│         │      │         │      │          │      │          │
│ • Log   │      │ • Send  │      │ • Log    │      │ • Index  │
│   to ES │      │   SMS   │      │   to ES  │      │   logs   │
│         │      │   (Twilio)│   │          │      │   to ES  │
│ • Write │      │ • Index │      │ • Write  │      │          │
│   to    │      │   to ES │      │   to     │      │          │
│   stream│      │         │      │   stream │      │          │
└─────────┘      └─────────┘      └──────────┘      └──────────┘
     │                │                │                  │
     │                │                │                  │
     └────────────────┴────────────────┴──────────────────┘
                      │
                      │
                      ▼
           ┌──────────────────────┐
           │   Elasticsearch      │
           │   (Indexing & Search)│
           │                      │
           │  • communications    │
           │  • communication-logs│
           └──────────┬───────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │      Kibana          │
           │   (Visualization)    │
           │                      │
           │  • Discover          │
           │  • Dashboards        │
           │  • Analytics         │
           └──────────────────────┘
                      │
                      │
                      ▼
           ┌──────────────────────┐
           │      MongoDB         │
           │  (Primary Database)  │
           │                      │
           │  • communications    │
           │    collection        │
           └──────────────────────┘
```

### 2.3 System Boundaries
- **Input**: HTTP REST API requests from external clients
- **Output**: Messages sent via Email, SMS, WhatsApp channels
- **Storage**: MongoDB for persistent data, Elasticsearch for search/analytics
- **Queue**: Redis Streams for asynchronous message processing

---

## 3. Component Details

### 3.1 Task Router Service

**Purpose**: Main API gateway and request router

**Responsibilities**:
- Accept HTTP POST requests at `/api/v1/communication`
- Validate incoming requests (type, data fields)
- Persist communication records to MongoDB
- Index communications to Elasticsearch for search/analytics
- Route tasks to appropriate Redis Streams based on communication type

**Technology**:
- Framework: Express.js
- Port: 3001 (configurable)
- Database: MongoDB (via Mongoose)
- Queue: Redis Streams (producer)
- Search: Elasticsearch (indexer)

**Key Functions**:
```javascript
POST /api/v1/communication
  - Validates request body (type, data)
  - Creates MongoDB document
  - Indexes to Elasticsearch
  - Publishes to Redis Stream
  - Returns queued status
```

**Dependencies**:
- MongoDB (persistent storage)
- Redis (message queue)
- Elasticsearch (search/analytics)

---

### 3.2 Email Service

**Purpose**: Process email communication tasks

**Responsibilities**:
- Consume messages from `email_stream` Redis Stream
- Process email tasks asynchronously
- Log processing status to Elasticsearch
- Write logs to `log_stream` for centralized logging

**Technology**:
- Framework: Node.js (ES Modules)
- Queue: Redis Streams (consumer)
- Search: Elasticsearch (logger)

**Processing Flow**:
1. Poll `email_stream` for new messages
2. Index task receipt to Elasticsearch
3. Process email (currently placeholder - TODO: Email API integration)
4. Write log entry to `log_stream`

**Status Tracking**:
- `received`: Task received from stream
- `sent`: Email successfully sent (future)
- `failed`: Email sending failed (future)

---

### 3.3 SMS Service

**Purpose**: Process SMS communication tasks via Twilio

**Responsibilities**:
- Consume messages from `sms_stream` Redis Stream
- Send SMS messages via Twilio API
- Handle success/failure scenarios
- Index operational logs to Elasticsearch

**Technology**:
- Framework: Node.js (ES Modules)
- Queue: Redis Streams (consumer)
- External API: Twilio SMS API
- Search: Elasticsearch (logger)

**Processing Flow**:
1. Poll `sms_stream` for new messages
2. Extract recipient and message body
3. Send SMS via Twilio `client.messages.create()`
4. Index success/failure status to Elasticsearch

**Status Tracking**:
- `sent`: SMS successfully sent
- `failed`: SMS sending failed with error details

**Configuration**:
- Requires Twilio Account SID
- Requires Twilio Auth Token
- Requires Messaging Service SID

---

### 3.4 WhatsApp Service

**Purpose**: Process WhatsApp communication tasks

**Responsibilities**:
- Consume messages from `whatsapp_stream` Redis Stream
- Process WhatsApp tasks (currently placeholder)
- Log processing status to Elasticsearch
- Write logs to `log_stream`

**Technology**:
- Framework: Node.js (ES Modules)
- Queue: Redis Streams (consumer)
- Search: Elasticsearch (logger)

**Processing Flow**:
1. Poll `whatsapp_stream` for new messages
2. Index task receipt to Elasticsearch
3. Process WhatsApp (TODO: Meta WhatsApp Cloud API integration)
4. Write log entry to `log_stream`

**Status Tracking**:
- `received`: Task received from stream
- `sent`: WhatsApp message sent (future)
- `failed`: Sending failed (future)

---

### 3.5 Logging Service

**Purpose**: Centralized log aggregation and indexing

**Responsibilities**:
- Consume logs from `log_stream` Redis Stream
- Aggregate logs from all services
- Index all logs to Elasticsearch for analytics
- Provide centralized logging view

**Technology**:
- Framework: Node.js (ES Modules)
- Queue: Redis Streams (consumer)
- Search: Elasticsearch (indexer)

**Processing Flow**:
1. Poll `log_stream` for new log entries
2. Parse log entry metadata (service, status, etc.)
3. Index log entry to Elasticsearch `communication-logs` index
4. Continue polling for new logs

**Log Sources**:
- Email Service
- SMS Service
- WhatsApp Service
- (Any future services)

---

## 4. Data Flow

### 4.1 Communication Request Flow

```
1. Client Request
   └─> POST /api/v1/communication
       {
         "type": "sms|email|whatsapp",
         "data": {
           "from": "...",
           "to": "...",
           "msg": "..."
         }
       }

2. Task Router Service
   ├─> Validate request (type, data fields)
   ├─> Create MongoDB document
   │   └─> Status: "pending"
   ├─> Index to Elasticsearch (communications index)
   └─> Publish to Redis Stream
       └─> {email|sms|whatsapp}_stream

3. Channel Service (e.g., SMS Service)
   ├─> Consume from Redis Stream
   ├─> Process message (send SMS via Twilio)
   ├─> Index status to Elasticsearch (communication-logs)
   └─> Write to log_stream (optional)

4. Logging Service
   ├─> Consume from log_stream
   └─> Index to Elasticsearch (communication-logs)
```

### 4.2 Data Storage Flow

```
Request → MongoDB (Source of Truth)
       → Elasticsearch (Search/Analytics)
       → Redis Streams (Processing Queue)
```

### 4.3 Error Handling Flow

```
Service Error
  └─> Catch exception
      ├─> Log error to Elasticsearch (with error details)
      ├─> Continue processing (service doesn't crash)
      └─> Update status: "failed" (in logs)
```

---

## 5. Technology Stack

### 5.1 Runtime & Framework
- **Node.js**: v18+ (ES Modules support)
- **Express.js**: v5.1.0 (Task Router Service only)

### 5.2 Databases & Storage

#### MongoDB
- **Purpose**: Primary persistent storage
- **Schema**: Communication records
- **Driver**: Mongoose v9.0.0
- **Connection**: Environment variable `MONGODB_URL`

#### Elasticsearch
- **Purpose**: Search, analytics, and log indexing
- **Version**: 8.x
- **Client**: @elastic/elasticsearch v8.15.0
- **Indices**:
  - `communications`: All communication requests
  - `communication-logs`: Operational logs from all services

#### Redis
- **Purpose**: Message queue (Redis Streams)
- **Version**: Latest
- **Client**: redis v5.10.0
- **Streams**:
  - `email_stream`
  - `sms_stream`
  - `whatsapp_stream`
  - `log_stream`

### 5.3 External Services
- **Twilio**: SMS messaging service
- **Kibana**: Elasticsearch visualization and analytics

### 5.4 Development Tools
- **dotenv**: Environment variable management
- **ES Modules**: Native JavaScript modules

---

## 6. Data Models

### 6.1 MongoDB Schema (Communication)

**Collection**: `communications`

```javascript
{
  _id: ObjectId,
  from: String (required),
  to: String (required, unique, lowercase),
  msg: String (required),
  status: String (required) // "pending" | "sent" | "failed"
}
```

### 6.2 Elasticsearch Index: `communications`

**Purpose**: Searchable index of all communication requests

```javascript
{
  communicationId: String (keyword),
  from: String (keyword),
  to: String (keyword),
  msg: String (text),
  status: String (keyword),
  type: String (keyword), // "email" | "sms" | "whatsapp"
  stream: String (keyword),
  timestamp: Date,
  createdAt: Date
}
```

### 6.3 Elasticsearch Index: `communication-logs`

**Purpose**: Operational logs from all services

```javascript
{
  service: String (keyword), // "email" | "sms" | "whatsapp"
  status: String (keyword), // "received" | "sent" | "failed"
  from: String (keyword),
  to: String (keyword),
  msg: String (text),
  error: String (text), // Optional, present on failures
  timestamp: Date,
  communicationId: String (keyword)
}
```

### 6.4 Redis Stream Message Format

**Stream**: `{type}_stream` (e.g., `sms_stream`)

```javascript
{
  from: String,
  to: String,
  msg: String,
  _id: String (MongoDB ObjectId),
  status: String
}
```

---

## 7. API Specifications

### 7.1 Create Communication Request

**Endpoint**: `POST /api/v1/communication`

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "type": "sms" | "email" | "whatsapp",
  "data": {
    "from": "string (required)",
    "to": "string (required)",
    "msg": "string (required)"
  }
}
```

**Response**: `200 OK`
```json
{
  "status": "queued",
  "stream": "sms_stream",
  "data": {
    "from": "...",
    "to": "...",
    "msg": "..."
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid type or missing required fields
- `500 Internal Server Error`: Server-side processing error

**Validation Rules**:
- `type` must be one of: "email", "sms", "whatsapp"
- `data.from` is required
- `data.to` is required
- `data.msg` is required

---

## 8. Integration Points

### 8.1 External API Integrations

#### Twilio SMS API
- **Service**: SMS Service
- **Endpoint**: Twilio REST API
- **Method**: `client.messages.create()`
- **Authentication**: Account SID + Auth Token
- **Configuration**: Messaging Service SID

#### Meta WhatsApp Cloud API (Future)
- **Service**: WhatsApp Service
- **Status**: TODO - Not yet implemented
- **Purpose**: Send WhatsApp messages

#### Email Service Provider (Future)
- **Service**: Email Service
- **Status**: TODO - Not yet implemented
- **Purpose**: Send emails via SMTP/Email API

### 8.2 Internal Integrations

#### MongoDB Connection
- **Used By**: Task Router Service
- **Connection**: Mongoose ODM
- **Database**: `communication-aggregator`

#### Redis Streams
- **Producer**: Task Router Service
- **Consumers**: Email, SMS, WhatsApp, Logging Services
- **Pattern**: Consumer groups (future enhancement)

#### Elasticsearch
- **Clients**: All services
- **Indices**: Auto-created on service startup
- **Operations**: Index documents, search queries

---

## 9. Deployment Architecture

### 9.1 Current Deployment (Development)

```
┌─────────────────────────────────────────┐
│         Local Development               │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ Node.js │  │ MongoDB │  │ Redis  │ │
│  │Services │  │(Local)  │  │(Local) │ │
│  └─────────┘  └─────────┘  └────────┘ │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │Elastic-  │  │  Kibana  │            │
│  │search    │  │          │            │
│  │(Local)   │  │ (Local)  │            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
```

### 9.2 Recommended Production Deployment

#### Option 1: Containerized Deployment (Docker)

```
┌────────────────────────────────────────────┐
│              Load Balancer                 │
└────────────────────┬───────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼────┐            ┌─────▼────┐
    │  Task   │            │  Task    │
    │ Router  │            │ Router   │
    │ (Pod 1) │            │ (Pod 2)  │
    └────┬────┘            └────┬─────┘
         │                      │
         └──────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │    Redis Cluster      │
        └───────────┬───────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼────┐    ┌────▼────┐    ┌────▼────┐
│ Email  │    │  SMS    │    │WhatsApp │
│Service │    │ Service │    │ Service │
│(Pods)  │    │ (Pods)  │    │ (Pods)  │
└────────┘    └─────────┘    └─────────┘
    │               │               │
    └───────────────┼───────────────┘
                    │
        ┌───────────┴───────────┐
        │  MongoDB Replica Set  │
        │  Elasticsearch Cluster│
        └───────────────────────┘
```

#### Option 2: Serverless Deployment

- **Task Router**: AWS Lambda / Google Cloud Functions
- **Worker Services**: AWS ECS / Google Cloud Run
- **Queues**: AWS SQS / Google Cloud Pub/Sub
- **Storage**: Managed MongoDB (Atlas) / Managed Elasticsearch

### 9.3 Environment Configuration

**Required Environment Variables**:

```env
# Task Router Service
PORT=3001
MONGODB_URL=mongodb://host:port/database
REDIS_URL=redis://host:port

# Elasticsearch (All Services)
ELASTICSEARCH_NODE=http://host:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=password

# SMS Service
ACCOUNTSID=twilio_account_sid
AUTHTOKEN=twilio_auth_token
MSG_ID=twilio_messaging_service_sid
```

---

## 10. Scalability Considerations

### 10.1 Horizontal Scaling

**Task Router Service**:
- Stateless design allows multiple instances
- Load balancer required for distribution
- Session affinity not required

**Worker Services**:
- Multiple instances can consume from same stream
- Redis Streams supports consumer groups (future enhancement)
- Independent scaling based on load

### 10.2 Vertical Scaling

- Increase Node.js heap size for high message volume
- Tune MongoDB connection pool sizes
- Configure Elasticsearch sharding and replicas

### 10.3 Performance Optimizations

**Current**:
- Asynchronous processing via Redis Streams
- Non-blocking I/O operations
- Connection pooling for databases

**Future Enhancements**:
- Redis Streams Consumer Groups for parallel processing
- Batch processing for Elasticsearch indexing
- Connection pooling optimization
- Caching layer for frequently accessed data

### 10.4 Scalability Bottlenecks

**Potential Issues**:
1. Single Redis instance (solution: Redis Cluster)
2. Single MongoDB instance (solution: Replica Set)
3. Elasticsearch single node (solution: Cluster setup)
4. No rate limiting on API (solution: Add rate limiting)

---

## 11. Security Considerations

### 11.1 Current Security Measures

- **Environment Variables**: Sensitive data stored in `.env` files
- **Input Validation**: Request validation in Task Router Service
- **Error Handling**: Error messages don't expose internal details

### 11.2 Security Gaps & Recommendations

#### High Priority
1. **API Authentication**: No authentication/authorization on API endpoints
   - **Recommendation**: Implement API keys or JWT tokens
   
2. **HTTPS**: No TLS/SSL enforcement
   - **Recommendation**: Use HTTPS in production

3. **Password Storage**: Hardcoded credentials in code (found in config files)
   - **Recommendation**: Always use environment variables

#### Medium Priority
4. **Rate Limiting**: No rate limiting on API
   - **Recommendation**: Implement rate limiting middleware

5. **Input Sanitization**: Basic validation only
   - **Recommendation**: Add input sanitization for XSS prevention

6. **Database Security**: No connection encryption
   - **Recommendation**: Enable TLS for MongoDB and Redis connections

#### Low Priority
7. **Audit Logging**: Limited audit trail
   - **Recommendation**: Enhanced audit logging for security events

8. **Secrets Management**: Environment variables not encrypted
   - **Recommendation**: Use secrets management service (AWS Secrets Manager, HashiCorp Vault)

---

## 12. Monitoring and Observability

### 12.1 Logging

**Current Implementation**:
- Service-level console logging
- Elasticsearch indexing for all logs
- Kibana for log visualization

**Log Levels**:
- **Info**: Service startup, connection status
- **Error**: Processing failures, connection errors
- **Debug**: Detailed processing information (future)

**Log Destinations**:
1. **Console**: Immediate visibility
2. **Elasticsearch**: Long-term storage and search
3. **Kibana**: Visualization and analysis

### 12.2 Monitoring Metrics

**Available in Elasticsearch/Kibana**:
- Communication volume by service
- Success/failure rates
- Processing latency (via timestamps)
- Error patterns and frequencies

**Future Metrics to Add**:
- Request rate (requests per second)
- Queue depth (Redis Stream length)
- Service health checks
- Database connection pool status
- External API response times

### 12.3 Alerting

**Current**: No automated alerting

**Recommended Alerts**:
1. High failure rate (> 5% failures)
2. Queue backlog (stream length > threshold)
3. Service downtime
4. Elasticsearch/MongoDB connection failures
5. High error rate in logs

**Implementation**: Kibana Alerting or external tool (PagerDuty, Slack)

### 12.4 Dashboards (Kibana)

**Recommended Dashboards**:

1. **Communication Overview**
   - Total communications by type
   - Success vs failure rates
   - Communications over time

2. **Service Health**
   - Service activity by service name
   - Error rates by service
   - Processing latency

3. **Operational Metrics**
   - Queue depths
   - Processing throughput
   - Error trends

---

## 13. Future Enhancements

### 13.1 Planned Features
1. **WhatsApp Integration**: Meta WhatsApp Cloud API integration
2. **Email Integration**: Email service provider integration (SMTP/API)
3. **Consumer Groups**: Redis Streams consumer groups for parallel processing
4. **Retry Mechanism**: Automatic retry for failed communications
5. **Status Updates**: Real-time status updates via WebSockets

### 13.2 Technical Improvements
1. **API Authentication**: JWT or API key authentication
2. **Rate Limiting**: Request rate limiting middleware
3. **Circuit Breaker**: External API failure handling
4. **Health Checks**: Health check endpoints for all services
5. **Metrics Export**: Prometheus metrics export
6. **Distributed Tracing**: OpenTelemetry integration

### 13.3 Architecture Improvements
1. **Service Mesh**: Implement service mesh for inter-service communication
2. **API Gateway**: Dedicated API gateway (Kong, AWS API Gateway)
3. **Event Sourcing**: Consider event sourcing for audit trail
4. **CQRS**: Enhanced CQRS pattern implementation

---

## 14. Dependencies and Prerequisites

### 14.1 Infrastructure Requirements
- **Node.js**: v18 or higher
- **MongoDB**: v5.0 or higher
- **Redis**: v6.0 or higher (with Streams support)
- **Elasticsearch**: v8.x
- **Kibana**: v8.x (matching Elasticsearch version)

### 14.2 External Service Accounts
- **Twilio Account**: Required for SMS Service
  - Account SID
  - Auth Token
  - Messaging Service SID

### 14.3 Network Requirements
- **Ports**:
  - 3001: Task Router Service
  - 27017: MongoDB (default)
  - 6379: Redis (default)
  - 9200: Elasticsearch (default)
  - 5601: Kibana (default)

---

## 15. Glossary

- **Stream**: Redis Stream - a data structure for message queues
- **Index**: Elasticsearch index - a collection of documents
- **Consumer**: Service that reads from Redis Streams
- **Producer**: Service that writes to Redis Streams
- **HLD**: High-Level Design
- **CQRS**: Command Query Responsibility Segregation
- **ODM**: Object Document Mapper (Mongoose for MongoDB)

---

## 16. Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | System Architecture Team | Initial HLD document |

---

## 17. Appendix

### 17.1 System Architecture Diagram (ASCII)

See Section 2.2 for detailed architecture diagram.

### 17.2 Configuration Files Structure

```
Communication-Aggregator-System/
├── task-router-service/
│   ├── config/
│   │   ├── dbConfig.js          # MongoDB configuration
│   │   └── elasticsearch.js     # Elasticsearch client
│   ├── model/
│   │   └── communication.js     # MongoDB schema
│   └── index.js                 # Main service file
├── email-service/
│   ├── config/
│   │   └── elasticsearch.js
│   └── index.js
├── sms-service/
│   ├── config/
│   │   └── elasticsearch.js
│   └── index.js
├── whatsapp-service/
│   ├── config/
│   │   └── elasticsearch.js
│   └── index.js
└── logging-service/
    ├── config/
    │   └── elasticsearch.js
    └── index.js
```

### 17.3 API Request/Response Examples

See Section 7 for detailed API specifications.

---

**End of HLD Document**

