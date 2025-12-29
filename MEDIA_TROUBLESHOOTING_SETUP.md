# NWM Creative Works - Media Troubleshooting System
## Complete Setup & Deployment Guide

This guide will walk you through setting up the complete AI-powered media troubleshooting system for Hospital Church.

---

## 🎯 System Overview

The **NWM Virtual Media Support Assistant** is an AI-powered troubleshooting bot that helps users diagnose and fix common AV/Media equipment issues.

### Supported Equipment
- **Video**: vMix, Capture Cards, Cameras
- **Audio**: Behringer WING, X-AIR, Zoom Mixers, Microphones
- **Presentation**: Proclaim slides and video playback

### Key Features
1. **Smart Search**: AI searches knowledge base for relevant troubleshooting guides
2. **Step-by-Step Fixes**: Proven quick-fix procedures with success rates
3. **Scope Limiting**: ONLY responds to media/AV questions
4. **Escalation Flow**: Auto-creates support tickets when fixes fail
5. **Photo Upload**: Users can attach photos/videos of the issue
6. **Analytics**: Tracks which guides work best

---

## 📦 What Was Created

### Backend Files

#### 1. Database Migration
```
migrations/0016_add_media_troubleshooting.sql
```
- Creates `media_troubleshooting` table with 12 pre-loaded guides
- Creates `troubleshooting_escalations` table for support tickets
- Adds indexes for fast searching

#### 2. API Endpoints
```
src/endpoints/troubleshooting/
├── search.ts       # Search guides, get devices, record usage
├── escalate.ts     # Create and view support tickets
└── router.ts       # Route configuration
```

#### 3. AI Integration
```
src/endpoints/chat/mediaTroubleshooting.ts
```
- MediaTroubleshootingWorkflow class
- AI prompt generation
- Scope checking (media-only)
- Response formatting

#### 4. Main Integration
```
src/index.ts
```
- Registered `/troubleshooting` router
- Integrated with existing chat system

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

```bash
# From your project root
npx wrangler d1 migrations apply DB --remote
```

This will:
- Create the `media_troubleshooting` table
- Insert 12 troubleshooting guides
- Create escalation tracking table

### Step 2: Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

### Step 3: Verify Deployment

Test the troubleshooting search endpoint:

```bash
curl "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/troubleshooting/search?query=vmix%20capture%20card"
```

**Expected Response:**
```json
{
  "success": true,
  "count": 1,
  "guides": [
    {
      "id": 1,
      "category": "Video",
      "device": "vMix",
      "issue": "My capture card doesn't show video",
      "quick_fix": [
        "Check USB or PCIe connection",
        "Confirm camera is powered on",
        "Verify input is added in VMix using 'Add Input > Camera'",
        "Check selected resolution matches camera output",
        "Restart vMix and reconnect device"
      ],
      "advanced_redirect": "Escalate to Advanced Media Support",
      "success_rate": 0.0,
      "times_used": 0
    }
  ]
}
```

---

## 💬 How Users Interact With The Bot

### From the Chat Interface

1. **User asks media question:**
   ```
   "My vMix capture card isn't showing video"
   ```

2. **Bot searches database** and finds relevant guide

3. **Bot presents solution:**
   ```
   I found a solution for this!

   For vMix capture card issues, try these steps:

   1. Check USB or PCIe connection
   2. Confirm camera is powered on
   3. Verify input is added in VMix using 'Add Input > Camera'
   4. Check selected resolution matches camera output
   5. Restart vMix and reconnect device

   Try these steps and let me know if it works! If not, I can escalate
   this to our Advanced Media Support team.
   ```

4. **If user says it didn't work:**
   ```
   "That didn't fix it"
   ```

5. **Bot offers escalation:**
   ```
   I understand the quick fixes didn't resolve your issue.
   Would you like me to escalate this to NWM Creative Works
   Advanced Media Support? They'll contact you within 24 hours.

   Please provide:
   - Your name
   - Email address
   - Any photos/videos of the issue
   ```

6. **Support ticket created** in `troubleshooting_escalations` table

---

## 🎨 API Endpoints Reference

### 1. Search Troubleshooting Guides

**GET** `/troubleshooting/search`

Query Parameters:
- `query` (required): Search keywords
- `category` (optional): Video, Audio, Presentation, Connectivity
- `device` (optional): Filter by device name

Example:
```bash
curl "https://your-worker.workers.dev/troubleshooting/search?query=microphone%20low&category=Audio"
```

### 2. Get All Supported Devices

**GET** `/troubleshooting/devices`

Returns list of all equipment in the database.

Example:
```bash
curl "https://your-worker.workers.dev/troubleshooting/devices"
```

Response:
```json
{
  "success": true,
  "devices": [
    { "device": "vMix", "category": "Video" },
    { "device": "Behringer WING", "category": "Audio" },
    { "device": "X-AIR", "category": "Audio" },
    ...
  ]
}
```

### 3. Record Guide Usage

**POST** `/troubleshooting/usage`

Body:
```json
{
  "guide_id": 1,
  "worked": true
}
```

This tracks success rates for each guide.

### 4. Escalate to Support

**POST** `/troubleshooting/escalate`

Body:
```json
{
  "troubleshooting_id": 1,
  "session_id": "abc-123",
  "user_name": "John Doe",
  "user_email": "john@example.com",
  "escalation_reason": "Quick fixes didn't resolve the issue",
  "device": "vMix",
  "issue_description": "Capture card still not detecting camera",
  "photos": [
    {
      "name": "error-screenshot.png",
      "data": "base64-encoded-image-data",
      "type": "image/png"
    }
  ]
}
```

### 5. Get User's Escalations

**GET** `/troubleshooting/escalations`

Query Parameters:
- `session_id`: Get tickets for a session
- `email`: Get tickets for an email
- `status`: Filter by pending, in_progress, resolved, cancelled

---

## 🧠 How the AI Works

### 1. Media Detection

The workflow first checks if the message is media-related using keywords:
```typescript
const mediaKeywords = [
  'vmix', 'capture card', 'camera', 'video', 'audio',
  'microphone', 'mixer', 'behringer', 'wing', 'x-air',
  'proclaim', 'slides', 'feedback', 'echo', ...
];
```

### 2. Scope Limiting

If user asks non-media questions:
```
User: "Can you help me plan a church event?"

Bot: "I'm the NWM Media Troubleshooting Assistant, specialized in
      video, audio, and presentation equipment support. For event
      planning and other services, please contact NWM Creative Works
      directly at [contact info]."
```

### 3. Database Search

The AI searches the `media_troubleshooting` table using:
- Issue description matching
- Device name matching
- Keyword matching
- Success rate ranking

### 4. AI Prompt Generation

The system generates a specialized prompt for Claude AI:
```typescript
`You are the NWM Creative Works Virtual Media Support Assistant.

**Relevant Troubleshooting Guides:**
Guide 1: vMix - My capture card doesn't show video
Quick Fix Steps:
1. Check USB or PCIe connection
2. Confirm camera is powered on
...

Your task:
1. Present the quick fix steps in a friendly, clear format
2. Explain each step briefly if needed
3. Ask if it worked after presenting the steps
4. Offer escalation if steps don't resolve the issue`
```

### 5. Response Formatting

The bot formats the response with:
- Clear numbered steps
- Encouraging language
- Reference to success rate
- Escalation options

---

## 📊 Adding New Troubleshooting Guides

### Via SQL

```sql
INSERT INTO media_troubleshooting
(category, device, issue, quick_fix, advanced_redirect, keywords)
VALUES (
  'Audio',
  'Shure SM7B',
  'Microphone sounds muffled',
  '["Remove foam windscreen", "Check for presence boost switch", "Increase gain on interface", "Position mic closer to source", "Enable high-pass filter"]',
  'Escalate to Advanced Media Support',
  'shure sm7b microphone muffled audio gain quiet'
);
```

### Via API (Future Enhancement)

You can create an admin endpoint to add guides:

```typescript
// src/endpoints/admin/addTroubleshootingGuide.ts
export class AddTroubleshootingGuide extends OpenAPIRoute {
  async handle(c: Context) {
    const { category, device, issue, quick_fix, keywords } = data.body;

    await c.env.DB.prepare(`
      INSERT INTO media_troubleshooting
      (category, device, issue, quick_fix, advanced_redirect, keywords)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      category,
      device,
      issue,
      JSON.stringify(quick_fix),
      'Escalate to Advanced Media Support',
      keywords
    ).run();

    return c.json({ success: true });
  }
}
```

---

## 🎯 Testing the System

### Test 1: Basic Search

```bash
curl -X POST https://your-worker.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My vMix capture card is not showing video",
    "tenant_name": "Test User"
  }'
```

**Expected:** Bot returns troubleshooting steps for vMix capture card

### Test 2: Non-Media Question

```bash
curl -X POST https://your-worker.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you help me schedule a meeting?",
    "tenant_name": "Test User"
  }'
```

**Expected:** Bot explains it only handles media/AV support

### Test 3: Escalation

```bash
curl -X POST https://your-worker.workers.dev/troubleshooting/escalate \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-123",
    "user_name": "John Doe",
    "user_email": "john@test.com",
    "escalation_reason": "Quick fixes did not work",
    "device": "vMix",
    "issue_description": "Capture card still not detecting"
  }'
```

**Expected:** Creates ticket in database and admin_request_logs

---

## 📈 Monitoring & Analytics

### View Success Rates

```sql
SELECT
  device,
  issue,
  times_used,
  ROUND(success_rate * 100, 1) as success_percentage
FROM media_troubleshooting
WHERE times_used > 0
ORDER BY success_rate DESC;
```

### View Active Escalations

```sql
SELECT
  e.id,
  e.user_name,
  e.user_email,
  m.device,
  m.issue,
  e.status,
  e.created_at
FROM troubleshooting_escalations e
LEFT JOIN media_troubleshooting m ON m.id = e.troubleshooting_id
WHERE e.status = 'pending'
ORDER BY e.created_at DESC;
```

### Most Common Issues

```sql
SELECT
  device,
  issue,
  times_used
FROM media_troubleshooting
ORDER BY times_used DESC
LIMIT 10;
```

---

## 🔧 Customization Options

### 1. Change Escalation Contact

Edit the AI prompt in `mediaTroubleshooting.ts`:

```typescript
const systemPrompt = `
...
If you need hands-on help, contact NWM Creative Works at:
- Phone: 904-555-1234
- Email: support@nwmcreativeworks.com
- Website: nwmcreativeworks.com/support
`;
```

### 2. Add More Categories

Update the migration file to add new categories:

```sql
CREATE TABLE IF NOT EXISTS media_troubleshooting (
  category TEXT NOT NULL CHECK(category IN (
    'Video',
    'Audio',
    'Presentation',
    'Connectivity',
    'Lighting',  -- NEW
    'Streaming'  -- NEW
  )),
  ...
);
```

### 3. Adjust AI Behavior

In `mediaTroubleshooting.ts`, modify the system prompt:

```typescript
generateTroubleshootingPrompt(userMessage: string, guides: any[]): string {
  return `
You are the NWM Creative Works Virtual Media Support Assistant.

PERSONALITY:
- Professional but friendly
- Patient and encouraging
- Technical but not condescending
- Proactive about escalation

RESPONSE STYLE:
- Start with acknowledgment: "I see you're having trouble with..."
- Present steps clearly with numbering
- Use bullet points for sub-steps
- Include WHY a step helps (brief explanation)
- End with encouragement and escalation offer

...
  `;
}
```

---

## 🚨 Troubleshooting Common Issues

### Issue: "No guides found" even though they exist

**Solution:** Check keywords in the database:

```sql
SELECT id, device, issue, keywords
FROM media_troubleshooting
WHERE device = 'vMix';
```

Add missing keywords:

```sql
UPDATE media_troubleshooting
SET keywords = keywords || ' new keyword another keyword'
WHERE id = 1;
```

### Issue: AI responses are too verbose

**Solution:** Adjust max_tokens in `mediaTroubleshooting.ts`:

```typescript
const aiResponse = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
  messages: aiMessages,
  max_tokens: 300,  // Reduced from 500
});
```

### Issue: Users getting stuck in loops

**Solution:** Add conversation state tracking to prevent repeated suggestions.

---

## 📞 Support & Contact

For questions about this system:

- **NWM Creative Works**: support@nwmcreativeworks.com
- **Documentation**: /troubleshooting/docs (API reference)
- **GitHub Issues**: [Your repo]/issues

---

## 📝 License & Credits

Built by **NWM Creative Works** for Hospital Church of Jacksonville.

- Framework: Cloudflare Workers + Hono
- AI: Cloudflare Workers AI (Llama 3.1 8B)
- Database: Cloudflare D1 (SQLite)
- Frontend: HTML5 + Vanilla JavaScript

---

## ✅ Quick Checklist

- [ ] Run migration: `npx wrangler d1 migrations apply DB --remote`
- [ ] Deploy worker: `npx wrangler deploy`
- [ ] Test search endpoint
- [ ] Test chat integration
- [ ] Test escalation flow
- [ ] Add NWM contact info to prompts
- [ ] Review success rates weekly
- [ ] Update guides based on feedback

---

**System Status:** ✅ Ready for Production

**Last Updated:** December 29, 2025
