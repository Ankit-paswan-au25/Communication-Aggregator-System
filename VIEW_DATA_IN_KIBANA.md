# How to View Your Data in Kibana

## 🎯 Quick Answer
**No need to restart Elasticsearch or Kibana!** Data appears automatically once your services start indexing.

---

## Step-by-Step Guide to View Data

### Step 1: Start Your Services

Make sure your services are running:
1. ✅ Elasticsearch is running
2. ✅ Kibana is running (at `http://localhost:5601`)
3. ✅ Your Node.js services are running (task-router-service, logging-service, etc.)

### Step 2: Create Index Patterns in Kibana

1. **Open Kibana** in your browser:
   ```
   http://localhost:5601
   ```

2. **Login** with your credentials (likely `kibana_admin` / `MyStrongPass123`)

3. **Create Index Pattern for Communications:**
   - Click on the hamburger menu (☰) in the top left
   - Go to **Stack Management** (or click **Management** → **Stack Management**)
   - Click **Index Patterns** in the left sidebar
   - Click **Create index pattern** button
   - Enter: `communications*` (with asterisk)
   - Click **Next step**
   - Select **@timestamp** or **timestamp** as the Time field
   - Click **Create index pattern**

4. **Create Index Pattern for Logs:**
   - Click **Create index pattern** again
   - Enter: `communication-logs*` (with asterisk)
   - Click **Next step**
   - Select **@timestamp** or **timestamp** as the Time field
   - Click **Create index pattern**

### Step 3: View Data in Discover

1. Click the hamburger menu (☰)
2. Go to **Analytics** → **Discover** (or just click **Discover**)

3. **Select an Index Pattern:**
   - At the top, you'll see a dropdown to select index patterns
   - Choose either:
     - `communications*` - to see all communication requests
     - `communication-logs*` - to see all service logs

4. **View Your Data:**
   - You'll see a table with your indexed documents
   - Each row is a document
   - Use the sidebar to filter and search

### Step 4: Search and Filter

**Search in Kibana:**
- Use the search bar at the top (KQL syntax)
- Example searches:
  - `service: "sms"` - find all SMS logs
  - `status: "sent"` - find all successful sends
  - `type: "email"` - find all email communications
  - `to: "example@email.com"` - find messages to specific recipient

**Filter Fields:**
- Click any field in the left sidebar to filter
- Click the + icon to add filters

---

## Alternative: View Data Directly in Elasticsearch

You can also check data directly via Elasticsearch API:

### Check if indices exist:
```bash
curl -u kibana_admin:MyStrongPass123 http://localhost:9200/_cat/indices?v
```

You should see:
- `communications`
- `communication-logs`

### View documents in an index:
```bash
# View communications
curl -u kibana_admin:MyStrongPass123 http://localhost:9200/communications/_search?pretty

# View logs
curl -u kibana_admin:MyStrongPass123 http://localhost:9200/communication-logs/_search?pretty
```

### Count documents:
```bash
# Count communications
curl -u kibana_admin:MyStrongPass123 http://localhost:9200/communications/_count

# Count logs
curl -u kibana_admin:MyStrongPass123 http://localhost:9200/communication-logs/_count
```

---

## Generating Test Data

To see data appear in real-time:

### 1. Send a Test Communication Request:
```bash
curl -X POST http://localhost:3001/api/v1/communication \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sms",
    "data": {
      "from": "+1234567890",
      "to": "+0987654321",
      "msg": "Hello, this is a test message"
    }
  }'
```

### 2. Watch Data Appear:
- **In Kibana Discover**: Refresh the page or it will auto-update
- **In Terminal**: Check your service logs - you should see indexing messages

---

## Creating Dashboards (Optional)

1. In Kibana, go to **Analytics** → **Dashboard**
2. Click **Create dashboard**
3. Click **Create visualization**
4. Choose your index pattern
5. Select visualization type (bar chart, pie chart, etc.)
6. Configure metrics:
   - **X-axis**: Field like `service`, `status`, or `type`
   - **Y-axis**: Count of documents
7. Save and add to dashboard

**Example Visualizations:**
- **Communications by Type**: Pie chart showing email vs sms vs whatsapp
- **Status Distribution**: Bar chart showing pending vs sent vs failed
- **Service Activity**: Time series showing activity over time

---

## Troubleshooting

### No Data Appearing?

1. **Check Services are Running:**
   - Look at your service terminal outputs
   - Should see: `✅ Connected to Elasticsearch`
   - Should see: `✅ Communications index created`

2. **Check Elasticsearch Connection:**
   ```bash
   curl -u kibana_admin:MyStrongPass123 http://localhost:9200
   ```

3. **Verify Indices Exist:**
   ```bash
   curl -u kibana_admin:MyStrongPass123 http://localhost:9200/_cat/indices
   ```

4. **Check Service Logs:**
   - Look for any `❌ Error indexing` messages
   - Verify credentials match in `.env` files

5. **Refresh Kibana:**
   - Sometimes Kibana needs a refresh to see new data
   - Click the refresh button (🔄) in Discover
   - Or wait a few seconds - it auto-refreshes

### Can't See Index Patterns?

- Make sure you created them in **Stack Management** → **Index Patterns**
- Index patterns need at least one document to show up
- Try generating test data first (see above)

---

## Quick Reference

| What | Where in Kibana |
|------|----------------|
| View data | Analytics → Discover |
| Create index pattern | Stack Management → Index Patterns |
| Create dashboard | Analytics → Dashboard |
| View logs | Analytics → Discover → Select `communication-logs*` |
| View communications | Analytics → Discover → Select `communications*` |

---

**Remember:** Data appears automatically - no restart needed! Just start your services and send some test requests.

