# Elasticsearch Integration - Troubleshooting Guide

## Common Issues and Fixes

### Issue 1: Connection Errors

If you see connection errors, check:

1. **Elasticsearch is running**
   ```bash
   # Test if Elasticsearch is accessible
   curl http://localhost:9200
   # Or with auth:
   curl -u elastic:your_password http://localhost:9200
   ```

2. **Environment Variables are set**
   Create `.env` files in each service directory with:
   ```env
   ELASTICSEARCH_NODE=http://localhost:9200
   ELASTICSEARCH_USER=elastic
   ELASTICSEARCH_PASSWORD=your_actual_password
   ```

3. **Check your Elasticsearch password**
   - If you installed Elasticsearch locally, you should have received a password during setup
   - Check the Elasticsearch logs or terminal output when you started it
   - The default user is `elastic`

### Issue 2: Authentication Errors

If you see "authentication failed" or "unauthorized" errors:

1. Verify your password is correct
2. Try resetting the password:
   ```bash
   # Find your Elasticsearch bin directory and run:
   elasticsearch-reset-password -u elastic
   ```

### Issue 3: Index Creation Errors

The services automatically create indices on startup. If you see index creation errors:

1. Check Elasticsearch logs
2. Verify you have permissions to create indices
3. The service will continue running even if index creation fails initially

### Issue 4: Module Import Errors

If you see "Cannot find module" errors:

1. Install dependencies in each service:
   ```bash
   cd task-router-service && npm install
   cd ../logging-service && npm install
   ```

2. Verify `@elastic/elasticsearch` is installed:
   ```bash
   npm list @elastic/elasticsearch
   ```

### Testing Your Setup

1. **Test Elasticsearch connection:**
   ```bash
   curl http://localhost:9200
   ```

2. **Check if indices exist:**
   ```bash
   curl -u elastic:your_password http://localhost:9200/_cat/indices
   ```

3. **Start services in order:**
   - Start Elasticsearch first
   - Start task-router-service
   - Start logging-service
   - Start other services

### Error Messages Explained

- **"ECONNREFUSED"**: Elasticsearch is not running or wrong port
- **"authentication failed"**: Wrong username/password
- **"resource_already_exists_exception"**: Index already exists (this is OK, ignored)
- **"Cannot find module '@elastic/elasticsearch'"**: Run `npm install` in the service directory

## Service-Specific Notes

### task-router-service
- Creates two indices: `communications` and `communication-logs`
- Indexes new communications when they're created
- Continues running even if ES is unavailable (with warning)

### logging-service
- Creates `communication-logs` index
- Indexes all logs from Redis streams
- Continues running even if ES is unavailable (with warning)

## Quick Fix Checklist

- [ ] Elasticsearch is running (`curl http://localhost:9200`)
- [ ] Environment variables are set correctly
- [ ] Password is correct
- [ ] Dependencies are installed (`npm install` in each service)
- [ ] Services are started after Elasticsearch

## Getting Help

If issues persist, check:
1. Elasticsearch logs (usually in `logs/` directory)
2. Service terminal output for specific error messages
3. Node.js version compatibility (Node v18+ recommended)

