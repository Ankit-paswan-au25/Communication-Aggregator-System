@echo off
REM Test script to generate communication data for Windows
REM Usage: test-communication.bat

echo Sending test SMS communication...
curl -X POST http://localhost:3001/api/v1/communication -H "Content-Type: application/json" -d "{\"type\": \"sms\", \"data\": {\"from\": \"+1234567890\", \"to\": \"+0987654321\", \"msg\": \"Hello, this is a test SMS message\"}}"

echo.
echo Sending test Email communication...
curl -X POST http://localhost:3001/api/v1/communication -H "Content-Type: application/json" -d "{\"type\": \"email\", \"data\": {\"from\": \"sender@example.com\", \"to\": \"recipient@example.com\", \"msg\": \"Hello, this is a test email message\"}}"

echo.
echo Sending test WhatsApp communication...
curl -X POST http://localhost:3001/api/v1/communication -H "Content-Type: application/json" -d "{\"type\": \"whatsapp\", \"data\": {\"from\": \"+1234567890\", \"to\": \"+0987654321\", \"msg\": \"Hello, this is a test WhatsApp message\"}}"

echo.
echo Test requests sent! Check Kibana Discover to see the data.
pause

