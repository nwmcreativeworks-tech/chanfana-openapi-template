# 🚀 Quick Start Guide - From Zero to Working Chatbot

Follow these steps **EXACTLY** to get your tenant support chatbot running in 10 minutes!

## ✅ Prerequisites

- Node.js 16+ installed
- Cloudflare account (free)
- Your terminal open

---

## 📋 Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Fresh D1 Database

```bash
# Delete old database if it exists (optional)
npx wrangler d1 delete openapi-template-db

# Create new database
npx wrangler d1 create openapi-template-db
```

**COPY THE DATABASE_ID** from the output!

### 3. Update wrangler.jsonc

Open `wrangler.jsonc` and paste your database_id:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "openapi-template-db",
      "database_id": "PASTE-YOUR-DATABASE-ID-HERE"
    }
  ]
}
```

### 4. Setup Database Tables

**Option A: Use Migrations (Recommended)**

```bash
npx wrangler d1 migrations apply DB --remote
```

**Option B: Use Complete SQL File (If migrations fail)**

```bash
npx wrangler d1 execute DB --remote --file=setup-all-tables.sql
```

### 5. Verify Database

```bash
npx wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

You should see 13 tables including: `users`, `conversations`, `messages`, `maintenance_requests`, `thermostat_devices`, etc.

### 6. Deploy

```bash
npx wrangler deploy
```

**COPY YOUR WORKER URL** from the output!

---

## 🎉 You're Done! Test It Out

### Chatbot Interface

Visit:
```
https://YOUR-WORKER-URL.workers.dev/chatbot
```

Try:
- "Set temperature to 72"
- "My sink is leaking"
- "How do I fix vMix black screen?"

### Admin Dashboard

Visit:
```
https://YOUR-WORKER-URL.workers.dev/admin/dashboard
```

**Login:**
- Email: `admin@building.com`
- Password: `admin123`

**⚠️ CHANGE THIS PASSWORD IMMEDIATELY!**

### API Documentation

Visit:
```
https://YOUR-WORKER-URL.workers.dev/
```

---

## 🗣️ Add Alexa Integration (Optional)

See `ALEXA_THERMOSTAT_SETUP.md` for complete guide.

Quick summary:
1. Get Amazon Developer account
2. Get Login with Amazon (LWA) credentials
3. Discover your thermostats via admin dashboard
4. Assign thermostats to users
5. Done!

---

## 🆘 Troubleshooting

### "Couldn't find D1 DB with binding 'DB'"

**Fix:** Check your `wrangler.jsonc` has the correct `database_id`

```bash
# List your databases
npx wrangler d1 list

# Get the database_id and update wrangler.jsonc
```

### "Migration failed"

**Fix:** Use the complete SQL file instead:

```bash
npx wrangler d1 execute DB --remote --file=setup-all-tables.sql
```

### "Tables already exist"

**Fix:** Drop and recreate:

```bash
# Delete database
npx wrangler d1 delete openapi-template-db

# Start over from Step 2
```

### "AI binding not found"

**Fix:** Make sure `wrangler.jsonc` has:

```jsonc
"ai": {
  "binding": "AI"
}
```

---

## 📊 What You Get

✅ **AI Chatbot** - Chat interface at `/chatbot`
✅ **Admin Dashboard** - Manage users, devices, activity at `/admin/dashboard`
✅ **User Management** - Role-based access (Admin, Tenant, Maintenance)
✅ **Activity Logging** - Track who changed what and when
✅ **Thermostat Control** - Both virtual and physical Alexa thermostats
✅ **Maintenance Requests** - Automated ticket creation
✅ **vMix Troubleshooting** - Pre-loaded knowledge base
✅ **Alexa Integration** - Voice control support
✅ **OpenAPI Docs** - Auto-generated API documentation

**All 100% FREE on Cloudflare!** 🎉

---

## 🎯 Next Steps

1. ✅ **Change admin password** - Create new admin user, delete default
2. ✅ **Add tenants** - Create user accounts for your tenants
3. ✅ **Link thermostats** - Follow Alexa setup guide (optional)
4. ✅ **Customize knowledge base** - Add building-specific FAQs
5. ✅ **Test everything** - Try chatbot, Alexa, API

---

## 📞 Need Help?

- Check `README.md` for detailed docs
- Check `ALEXA_THERMOSTAT_SETUP.md` for thermostat setup
- Review `setup-all-tables.sql` to see database structure
- Open an issue on GitHub

**Enjoy your FREE AI-powered tenant support system!** 🏢
