# 🏢 Tenant Support Chatbot - FREE AI-Powered Property Management

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/)

![Tenant Support Chatbot](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/91076b39-1f5b-46f6-7f14-536a6f183000/public)

## 🚀 Overview

A **completely FREE** AI-powered tenant support chatbot system built with Cloudflare Workers, Workers AI, and D1 Database. Perfect for residential buildings, apartments, and rental properties!

### ✨ Features

- 🤖 **AI-Powered Chat** - Intelligent responses using Cloudflare Workers AI (Llama 3.1)
- 🌡️ **Thermostat Control** - Tenants can adjust their temperature via chat (65°F - 78°F)
- 🔧 **Maintenance Requests** - Automated creation and tracking of maintenance tickets
- 🎥 **vMix Troubleshooting** - Step-by-step tech support for media equipment
- 💬 **Knowledge Base** - Pre-loaded with common building FAQs and solutions
- 📱 **Beautiful Web UI** - Responsive chat interface with conversation history
- 📊 **OpenAPI Documentation** - Automatically generated API docs
- 💯 **100% Free** - Uses Cloudflare's generous free tiers

### 💰 Free Tier Limits (More Than Enough!)

- ✅ **Cloudflare Workers**: 100,000 requests/day
- ✅ **Cloudflare D1**: 5GB storage, 5M reads/day, 100K writes/day
- ✅ **Cloudflare Workers AI**: 10,000 neurons/day (~1,000 AI messages)

---

## 🎯 What Can Tenants Do?

### 1. Control Thermostat
```
Tenant: "Set temperature to 72"
Bot: "✓ I've set your thermostat to 72°F. It should reach the target temperature in about 10-15 minutes."
```

### 2. Submit Maintenance Requests
```
Tenant: "My sink is leaking"
Bot: "✓ Maintenance request #42 created successfully!
Category: plumbing
Priority: MEDIUM
We'll take care of this within 2-3 business days."
```

### 3. Get vMix Help
```
Tenant: "vMix is not starting"
Bot: "Try these steps:
1) Right-click vMix icon and select 'Run as Administrator'
2) Check Windows Event Viewer for errors
3) Update your graphics drivers..."
```

### 4. Ask Building Questions
```
Tenant: "What are the quiet hours?"
Bot: "Quiet hours are 10:00 PM to 8:00 AM on weekdays, and 11:00 PM to 9:00 AM on weekends."
```

---

## 🛠️ Setup Guide

### Prerequisites

- Node.js 16+ installed
- A Cloudflare account (free tier works!)
- Basic command line knowledge

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Create D1 Database

```bash
npx wrangler d1 create openapi-template-db
```

**Important:** Copy the `database_id` from the output and update it in `wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "openapi-template-db",
      "database_id": "YOUR-DATABASE-ID-HERE"
    }
  ]
}
```

### Step 3: Run Database Migrations

Apply the migrations to create all the tables:

```bash
# For remote (production) database
npx wrangler d1 migrations apply DB --remote

# For local development
npx wrangler d1 migrations apply DB --local
```

This will create:
- `conversations` - Chat sessions
- `messages` - Chat message history
- `maintenance_requests` - Support tickets
- `thermostat_settings` - Temperature controls per unit
- `knowledge_base` - FAQs and troubleshooting guides

### Step 4: Test Locally

```bash
npm run dev
```

The chatbot will be available at:
- 🤖 **Chat UI**: http://localhost:8787/chatbot
- 📚 **API Docs**: http://localhost:8787/

### Step 5: Deploy to Production

```bash
npx wrangler deploy
```

Your chatbot will be live at `https://tenant-support-chatbot.YOUR-SUBDOMAIN.workers.dev`

---

## 📖 Usage

### For Tenants

1. Visit `/chatbot` on your deployed URL
2. (Optional) Enter your name and unit number
3. Start chatting!

**Example conversations:**
- "Make it cooler"
- "Set temperature to 70"
- "The AC isn't working"
- "How do I fix vMix black screen?"
- "What's the WiFi password?"

### For Building Management

Access the maintenance dashboard via the API:

```bash
# List all open maintenance requests
curl https://your-worker.workers.dev/maintenance?status=open

# Get specific request
curl https://your-worker.workers.dev/maintenance/42

# Update request status
curl -X PUT https://your-worker.workers.dev/maintenance/42 \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

---

## 🏗️ Architecture

### Tech Stack
- **Framework**: [Hono](https://hono.dev/) - Fast web framework
- **OpenAPI**: [Chanfana](https://chanfana.com/) - Auto-generated API docs
- **Database**: Cloudflare D1 (SQLite)
- **AI**: Cloudflare Workers AI (Llama 3.1 8B)
- **Hosting**: Cloudflare Workers (Edge compute)

### Project Structure

```
src/
├── index.ts                      # Main router + web UI
├── types.ts                      # TypeScript types
└── endpoints/
    ├── chat/
    │   ├── router.ts            # Chat routes
    │   ├── base.ts              # Chat schemas
    │   ├── chatMessage.ts       # Main chat endpoint (AI logic)
    │   └── chatHistory.ts       # Get conversation history
    ├── maintenance/
    │   ├── router.ts            # Maintenance routes
    │   ├── base.ts              # Maintenance schemas
    │   ├── maintenanceList.ts   # List requests
    │   ├── maintenanceRead.ts   # Get request
    │   └── maintenanceUpdate.ts # Update request
    ├── thermostat/
    │   ├── router.ts            # Thermostat routes
    │   ├── base.ts              # Thermostat schemas
    │   ├── thermostatRead.ts    # Get settings
    │   └── thermostatUpdate.ts  # Update settings
    └── tasks/                    # Example CRUD (from template)

migrations/
├── 0001_add_tasks_table.sql     # Example migration
└── 0002_add_tenant_chatbot_tables.sql  # Chatbot tables
```

---

## 🔌 API Endpoints

### Chat
- `POST /chat` - Send a message to the chatbot
- `GET /chat/history?session_id={uuid}` - Get conversation history

### Maintenance
- `GET /maintenance?unit_number=101&status=open` - List requests
- `GET /maintenance/{id}` - Get specific request
- `PUT /maintenance/{id}` - Update request status

### Thermostat
- `GET /thermostat?unit_number=101` - Get thermostat settings
- `PUT /thermostat?unit_number=101` - Update thermostat

### Web Interface
- `GET /chatbot` - Beautiful chat UI
- `GET /` - OpenAPI documentation

---

## 🎨 Customization

### Add More Knowledge Base Entries

Edit the migration file `migrations/0002_add_tenant_chatbot_tables.sql` or insert directly:

```sql
INSERT INTO knowledge_base (category, question, answer, keywords) VALUES
('building_info', 'Where is the gym?', 'The gym is on the 2nd floor, open 24/7.', 'gym fitness exercise');
```

Then re-apply migrations:
```bash
npx wrangler d1 migrations apply DB --remote
```

### Customize Temperature Limits

Edit `src/endpoints/thermostat/base.ts`:

```typescript
target_temp: z.number().min(60).max(85).default(72),  // Change limits here
```

### Change AI Model

Edit `src/endpoints/chat/chatMessage.ts`:

```typescript
const response = await c.env.AI.run("@cf/meta/llama-3.1-70b-instruct", {  // Use larger model
  messages: messages,
  max_tokens: 500,
});
```

Available models: https://developers.cloudflare.com/workers-ai/models/

---

## 🧪 Testing

Run integration tests:

```bash
npm run test
```

Test files are in the `tests/` directory.

---

## 📊 Monitoring

Monitor your chatbot in real-time:

```bash
npx wrangler tail
```

View analytics in the [Cloudflare Dashboard](https://dash.cloudflare.com/).

---

## 🐛 Troubleshooting

### "AI binding not found"
Make sure you've added the AI binding to `wrangler.jsonc`:
```jsonc
"ai": {
  "binding": "AI"
}
```

### "Database not found"
Run migrations:
```bash
npx wrangler d1 migrations apply DB --remote
```

### "Module not found" errors
Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 🚀 Production Tips

1. **Add Authentication**: Protect management endpoints with API keys
2. **Rate Limiting**: Use Cloudflare's rate limiting for abuse prevention
3. **Custom Domain**: Add your own domain in Cloudflare dashboard
4. **Webhooks**: Send notifications when maintenance requests are created
5. **Analytics**: Track popular questions to improve knowledge base

---

## 📝 License

This project is open source and available under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Add more AI capabilities
- Improve the UI
- Add more integrations (email, SMS, etc.)
- Enhance the knowledge base

---

## 💡 Use Cases

Perfect for:
- 🏢 Apartment buildings
- 🏨 Hotels and resorts
- 🏫 Student housing
- 🏭 Commercial properties
- 🏘️ HOAs and condos
- 🎥 Media production studios (vMix support!)

---

## 📞 Support

For questions or issues:
1. Check the [API documentation](http://localhost:8787/) when running locally
2. Review Cloudflare's [Workers AI docs](https://developers.cloudflare.com/workers-ai/)
3. Check [Chanfana documentation](https://chanfana.com/)

---

## ⭐ Features Coming Soon

- [ ] Email notifications for maintenance requests
- [ ] Multi-language support
- [ ] Voice integration (Alexa, Google Home)
- [ ] Mobile app
- [ ] Admin dashboard
- [ ] Analytics & reporting

---

**Built with ❤️ using Cloudflare Workers, Hono, and Workers AI**

*This chatbot is 100% FREE to run with Cloudflare's generous free tiers. Perfect for small to medium-sized properties!*
