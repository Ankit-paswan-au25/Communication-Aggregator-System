#!/bin/bash

# Test script to generate communication data
# Usage: ./test-communication.sh

echo "Sending test SMS communication..."
curl -X POST http://localhost:3001/api/v1/communication \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sms",
    "data": {
      "from": "+1234567890",
      "to": "+0987654321",
      "msg": "Hello, this is a test SMS message"
    }
  }'

echo -e "\n\nSending test Email communication..."
curl -X POST http://localhost:3001/api/v1/communication \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "data": {
      "from": "sender@example.com",
      "to": "recipient@example.com",
      "msg": "Hello, this is a test email message"
    }
  }'

echo -e "\n\nSending test WhatsApp communication..."
curl -X POST http://localhost:3001/api/v1/communication \
  -H "Content-Type: application/json" \
  -d '{
    "type": "whatsapp",
    "data": {
      "from": "+1234567890",
      "to": "+0987654321",
      "msg": "Hello, this is a test WhatsApp message"
    }
  }'

echo -e "\n\n✅ Test requests sent! Check Kibana Discover to see the data."

