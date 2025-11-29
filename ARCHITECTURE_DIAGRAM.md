# System Architecture Diagrams
## Communication Aggregator System

---

## 1. System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMMUNICATION AGGREGATOR SYSTEM                    │
└─────────────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────────┐
                        │   External Clients   │
                        │  (Web, Mobile, API)  │
                        └──────────┬───────────┘
                                   │
                                   │ HTTP/REST
                                   │ POST /api/v1/communication
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │         TASK ROUTER SERVICE (Port: 3001)            │
        │  ┌──────────────────────────────────────────────┐  │
        │  │  • Request Validation                        │  │
        │  │  • Data Validation                           │  │
        │  │  • MongoDB Write                             │  │
        │  │  • Elasticsearch Indexing                    │  │
        │  │  • Redis Stream Publishing                   │  │
        │  └──────────────────────────────────────────────┘  │
        └───────────────────┬────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Redis Stream │  │ Redis Stream │  │ Redis Stream │
│ email_stream │  │  sms_stream  │  │whatsapp_stream│
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       │                 │                  │
       ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ EMAIL        │  │ SMS SERVICE  │  │ WHATSAPP     │
│ SERVICE      │  │              │  │ SERVICE      │
│              │  │ • Twilio API │  │              │
│ • Process    │  │ • Send SMS   │  │ • Process    │
│ • Index Logs │  │ • Index Logs │  │ • Index Logs │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       └─────────────────┼──────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Redis Stream        │
              │  log_stream          │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  LOGGING SERVICE     │
              │                      │
              │  • Aggregate Logs    │
              │  • Index to ES       │
              └──────────┬───────────┘
                         │
                         ▼
        ┌─────────────────────────────────────┐
        │      ELASTICSEARCH                  │
        │  ┌─────────────────────────────┐   │
        │  │ Index: communications       │   │
        │  │ Index: communication-logs   │   │
        │  └─────────────────────────────┘   │
        └──────────────────┬──────────────────┘
                           │
                           ▼
              ┌──────────────────────┐
              │   KIBANA             │
              │                      │
              │  • Discover          │
              │  • Dashboards        │
              │  • Analytics         │
              └──────────────────────┘
```

---

## 2. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          COMMUNICATION REQUEST FLOW                      │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: CLIENT REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Client Application
           │
           │ POST /api/v1/communication
           │ {
           │   "type": "sms",
           │   "data": {
           │     "from": "+1234567890",
           │     "to": "+0987654321",
           │     "msg": "Hello"
           │   }
           │ }
           ▼
    Task Router Service


Step 2: VALIDATION & PERSISTENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Task Router Service
           │
           ├─► Validate Request (type, data fields)
           │
           ├─► Create MongoDB Document
           │   └─► Status: "pending"
           │
           ├─► Index to Elasticsearch
           │   └─► Index: "communications"
           │
           └─► Publish to Redis Stream
               └─► Stream: "sms_stream"


Step 3: MESSAGE QUEUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Redis Stream (sms_stream)
           │
           │ Message: {
           │   from: "+1234567890",
           │   to: "+0987654321",
           │   msg: "Hello",
           │   _id: "mongodb_id",
           │   status: "pending"
           │ }
           ▼
    SMS Service (Consumer)


Step 4: PROCESSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    SMS Service
           │
           ├─► Extract message data
           │
           ├─► Send SMS via Twilio API
           │   └─► Twilio REST API
           │       └─► SMS Delivered
           │
           ├─► Index Status to Elasticsearch
           │   └─► Index: "communication-logs"
           │       └─► Status: "sent" | "failed"
           │
           └─► (Optional) Write to log_stream


Step 5: LOG AGGREGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Redis Stream (log_stream)
           │
           │ Log Entry: {
           │   service: "sms",
           │   status: "sent",
           │   from: "...",
           │   to: "...",
           │   ...
           │ }
           ▼
    Logging Service
           │
           └─► Index to Elasticsearch
               └─► Index: "communication-logs"


Step 6: VISUALIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Elasticsearch
           │
           ├─► communications index
           │   └─► All communication requests
           │
           └─► communication-logs index
               └─► All operational logs
           │
           ▼
    Kibana
           │
           ├─► Discover: Search & view data
           ├─► Dashboards: Visualize metrics
           └─► Analytics: Analyze patterns
```

---

## 3. Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMPONENT INTERACTION SEQUENCE                        │
└─────────────────────────────────────────────────────────────────────────┘

Client    Task Router    MongoDB    Redis    SMS Service   Twilio   Elasticsearch
  │            │            │         │           │          │            │
  │──POST──────>│            │         │           │          │            │
  │            │            │         │           │          │            │
  │            │──Validate──│         │           │          │            │
  │            │            │         │           │          │            │
  │            │──Create───>│         │           │          │            │
  │            │<──ID───────│         │           │          │            │
  │            │            │         │           │          │            │
  │            │──Index────────────────────────────────────────>│
  │            │            │         │           │          │            │
  │            │──Publish──>│         │           │          │            │
  │            │            │         │           │          │            │
  │<──200 OK───│            │         │           │          │            │
  │            │            │         │           │          │            │
  │            │            │         │──Read─────>│          │            │
  │            │            │         │           │          │            │
  │            │            │         │           │──Send SMS──>│        │
  │            │            │         │           │<──Success───│        │
  │            │            │         │           │          │            │
  │            │            │         │           │──Index──────────────>│
  │            │            │         │           │          │            │
  │            │            │         │<──Write───│          │            │
  │            │            │         │ (log_stream)         │            │
  │            │            │         │           │          │            │
  │            │            │         │──Read───────Logging Service      │
  │            │            │         │           │          │            │
  │            │            │         │           │──Index──────────────>│
```

---

## 4. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │   Load Balancer      │
                    │   (NGINX/HAProxy)    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
        │  Task     │   │  Task     │   │  Task     │
        │  Router   │   │  Router   │   │  Router   │
        │  (Pod 1)  │   │  (Pod 2)  │   │  (Pod 3)  │
        └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
  ┌─────▼─────┐         ┌─────▼─────┐         ┌─────▼─────┐
  │  Redis    │         │  Redis    │         │  Redis    │
  │  Master   │         │  Replica  │         │  Replica  │
  │           │◄────────┤           │◄────────┤           │
  └─────┬─────┘         └───────────┘         └───────────┘
        │
        │ Streams: email_stream, sms_stream, whatsapp_stream, log_stream
        │
  ┌─────┼─────────────────────────────────────────────────────┐
  │     │                                                     │
  │ ┌───▼─────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
  │ │ Email   │  │   SMS    │  │ WhatsApp │  │ Logging  │  │
  │ │ Service │  │ Service  │  │ Service  │  │ Service  │  │
  │ │(3 Pods) │  │(3 Pods)  │  │(3 Pods)  │  │(2 Pods)  │  │
  │ └─────────┘  └──────────┘  └──────────┘  └──────────┘  │
  │                                                          │
  └──────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
  ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
  │ MongoDB   │  │ MongoDB   │  │ MongoDB   │
  │ Primary   │  │ Secondary │  │ Secondary │
  │           │◄─┤           │◄─┤           │
  └───────────┘  └───────────┘  └───────────┘
        │
        │
  ┌─────▼─────────────────────────────────────┐
  │      Elasticsearch Cluster                │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐│
  │  │   ES     │  │   ES     │  │   ES     ││
  │  │  Node 1  │  │  Node 2  │  │  Node 3  ││
  │  │(Master)  │  │(Data)    │  │(Data)    ││
  │  └──────────┘  └──────────┘  └──────────┘│
  └───────────────┬───────────────────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │      Kibana      │
        │  (Visualization) │
        └──────────────────┘
```

---

## 5. Data Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA STORAGE LAYERS                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: IN-MEMORY QUEUE                              │
│                         (Redis Streams)                                  │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ email_stream │  │  sms_stream  │  │whatsapp_stream│  │ log_stream   ││
│  │              │  │              │  │              │  │              ││
│  │ Purpose:     │  │ Purpose:     │  │ Purpose:     │  │ Purpose:     ││
│  │ Queue tasks  │  │ Queue tasks  │  │ Queue tasks  │  │ Queue logs   ││
│  │ Retention:   │  │ Retention:   │  │ Retention:   │  │ Retention:   ││
│  │ Configurable │  │ Configurable │  │ Configurable │  │ Configurable ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
│                                                                           │
│  Characteristics:                                                        │
│  • Fast message delivery                                                 │
│  • Ordered message processing                                            │
│  • Consumer-based message tracking                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              LAYER 2: PERSISTENT STORAGE (Source of Truth)               │
│                            (MongoDB)                                     │
│                                                                           │
│  Database: communication-aggregator                                      │
│  Collection: communications                                              │
│                                                                           │
│  Document Structure:                                                     │
│  {                                                                        │
│    _id: ObjectId,                                                        │
│    from: String,                                                         │
│    to: String,                                                           │
│    msg: String,                                                          │
│    status: String                                                        │
│  }                                                                        │
│                                                                           │
│  Characteristics:                                                        │
│  • ACID compliance                                                       │
│  • Transaction support                                                   │
│  • Primary source of truth                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            LAYER 3: SEARCH & ANALYTICS (Read Optimized)                  │
│                          (Elasticsearch)                                 │
│                                                                           │
│  ┌─────────────────────────┐  ┌─────────────────────────┐              │
│  │ Index: communications   │  │ Index: communication-    │              │
│  │                         │  │        logs              │              │
│  │ • Full-text search      │  │                         │              │
│  │ • Fast queries          │  │ • Service logs          │              │
│  │ • Analytics             │  │ • Status tracking       │              │
│  │ • Aggregations          │  │ • Error logs            │              │
│  └─────────────────────────┘  └─────────────────────────┘              │
│                                                                           │
│  Characteristics:                                                        │
│  • Optimized for search                                                  │
│  • Real-time indexing                                                    │
│  • Rich query capabilities                                               │
│  • Scalable & distributed                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 4: VISUALIZATION                                │
│                            (Kibana)                                      │
│                                                                           │
│  • Discover: Search and explore data                                    │
│  • Dashboards: Visualize metrics                                        │
│  • Analytics: Analyze patterns and trends                               │
│  • Alerting: Configure alerts (future)                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Service Communication Patterns

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SERVICE COMMUNICATION PATTERNS                        │
└─────────────────────────────────────────────────────────────────────────┘

PATTERN 1: REQUEST-RESPONSE (Synchronous)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Client  ──────[Request]──────>  Task Router  ──────[Response]──────>  Client
                                    │
                                    ├─[Query]──>  MongoDB  ──[Result]──>  Task Router
                                    │
                                    └─[Index]──>  Elasticsearch  ──[ACK]──>  Task Router


PATTERN 2: PUBLISH-SUBSCRIBE (Asynchronous)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Task Router  ───[Publish]───>  Redis Stream
                                         │
                                         │
                     ┌───────────────────┼───────────────────┐
                     │                   │                   │
                     ▼                   ▼                   ▼
              Email Service      SMS Service      WhatsApp Service
              (Subscriber)       (Subscriber)      (Subscriber)


PATTERN 3: EVENT STREAMING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Service A  ───[Event]───>  Redis Stream  ───[Event]───>  Service B
                                (log_stream)                   (Logging Service)
```

---

## 7. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ERROR HANDLING ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────────────┘

Service Processing
        │
        ├─► Success Path
        │   └─► Continue normal flow
        │
        └─► Error Path
            │
            ├─► Catch Exception
            │
            ├─► Log Error to Elasticsearch
            │   └─► Index: communication-logs
            │       └─► status: "failed"
            │       └─► error: error_message
            │
            ├─► Service Continues Running
            │   └─► (Does not crash)
            │
            └─► Error Visible in Kibana
                └─► Searchable & Alertable

Example Error Flow (SMS Service):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    SMS Service
           │
           ├─► Try: Send SMS via Twilio
           │
           ├─► Success ──► Index: status="sent"
           │
           └─► Error ──► Catch Exception
                       │
                       ├─► Log Error Message
                       ├─► Index: status="failed"
                       ├─► Index: error="error details"
                       └─► Continue Processing Next Message
```

---

## 8. Scalability Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HORIZONTAL SCALING STRATEGY                           │
└─────────────────────────────────────────────────────────────────────────┘

SCALING TASK ROUTER SERVICE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Load Balancer
           │
    ┌──────┼──────┐
    │      │      │
    ▼      ▼      ▼
  Router Router Router
  (Pod 1)(Pod 2)(Pod 3)
    │      │      │
    └──────┼──────┘
           │
      Redis Stream (Shared Queue)


SCALING WORKER SERVICES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Redis Stream (sms_stream)
           │
    ┌──────┼──────┐
    │      │      │
    ▼      ▼      ▼
  SMS    SMS    SMS
 Service Service Service
 (Pod 1)(Pod 2)(Pod 3)
    │      │      │
    └──────┼──────┘
           │
      Twilio API


SCALING DATA LAYERS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    MongoDB Replica Set:
    Primary ──► Secondary ──► Secondary
    
    Redis Cluster:
    Master ──► Replica ──► Replica
    
    Elasticsearch Cluster:
    Master Node ──► Data Node ──► Data Node ──► Data Node
```

---

**End of Architecture Diagrams**

