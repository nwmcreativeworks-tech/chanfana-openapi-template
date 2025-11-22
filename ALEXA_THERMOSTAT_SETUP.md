# 🌡️ Alexa Thermostat Setup Guide

This guide will help you connect your **Alexa-controlled thermostats** to the tenant support system so tenants can control them through the app, chatbot, and Alexa voice commands.

## 📋 Prerequisites

- Thermostats already set up and working with your Alexa app
- Admin access to your deployed worker
- Amazon Developer account (free)

---

## 🔐 Step 1: Get Alexa API Access

### 1.1 Create Login with Amazon (LWA) Security Profile

1. Go to [Amazon Developer Console](https://developer.amazon.com/)
2. Sign in with your Amazon account
3. Navigate to **Login with Amazon** > **Create a New Security Profile**
4. Fill in:
   - **Security Profile Name**: "Tenant Support System"
   - **Security Profile Description**: "Control building thermostats"
   - **Consent Privacy Notice URL**: Your privacy policy URL (can be placeholder for testing)
5. Click **Save**

###1.2 Get Your Credentials

1. Click **Show Client ID and Client Secret**
2. Copy these values - you'll need them!
3. Under **Allowed Return URLs**, add:
   ```
   https://your-worker.workers.dev/admin/alexa/callback
   ```
4. Save

---

## 🔗 Step 2: Link Your Alexa Account to the System

### 2.1 Add Credentials to Worker

You have two options:

**Option A: Environment Variables (Recommended)**

Add to your `wrangler.jsonc`:
```jsonc
{
  "vars": {
    "ALEXA_CLIENT_ID": "your-client-id-here",
    "ALEXA_CLIENT_SECRET": "your-client-secret-here"
  }
}
```

**Option B: Direct Database** (for testing)

Run this SQL command in your D1 database:
```sql
INSERT INTO alexa_credentials (access_token, refresh_token, expires_at)
VALUES ('YOUR_ACCESS_TOKEN', 'YOUR_REFRESH_TOKEN', datetime('now', '+1 year'));
```

### 2.2 Authorize the App

1. Deploy your worker: `npx wrangler deploy`
2. Visit: `https://your-worker.workers.dev/admin/alexa/authorize`
3. Sign in with your Amazon account
4. Grant permissions to access your Alexa devices
5. You'll be redirected back - credentials are now stored!

---

## 🏠 Step 3: Discover Your Thermostats

### 3.1 Auto-Discovery

1. Log into admin dashboard: `https://your-worker.workers.dev/admin/dashboard`
2. Go to **"Devices"** tab
3. Click **"Discover Thermostats"**
4. The system will find all thermostats on your Alexa account!

You should see something like:
```
✓ Found 5 thermostats:
  - Unit 101 Thermostat (Ecobee)
  - Unit 102 Thermostat (Ecobee)
  - Living Room Thermostat (Honeywell)
  ...
```

### 3.2 Manual Discovery (if auto-discovery fails)

Call the API directly:
```bash
curl https://your-worker.workers.dev/admin/devices/discover
```

---

## 👤 Step 4: Assign Thermostats to Units/Users

### Option A: Through Admin Dashboard

1. In the **Devices** tab, click on a thermostat
2. Click **"Assign to Unit"**
3. Enter:
   - **Unit Number**: e.g., "101"
   - **User** (optional): Select existing user
4. Click **Save**

### Option B: When Creating Users

1. Go to **Users** tab
2. Click **"Add User"**
3. Fill in user details
4. In **"Assigned Thermostat"** dropdown, select their thermostat
5. The system auto-fills the unit number!

### Option C: Via API

```bash
curl -X PUT https://your-worker.workers.dev/admin/devices/1 \
  -H "Content-Type: application/json" \
  -d '{
    "unit_number": "101",
    "user_id": 5
  }'
```

---

## ✅ Step 5: Test It Out!

### Test via Chatbot

1. Go to `/chatbot`
2. Enter unit number: `101`
3. Type: "Set temperature to 72"
4. ✓ Your physical thermostat should change!

### Test via API

```bash
curl -X PUT "https://your-worker.workers.dev/thermostat?unit_number=101" \
  -H "Content-Type: application/json" \
  -d '{"target_temp": 72}'
```

### Test via Alexa Voice

1. Enable your Alexa skill
2. Link account with unit number
3. Say: "Alexa, ask my apartment to set temperature to 72"
4. ✓ It works through the chatbot AND controls the real thermostat!

---

## 🔄 How It Works

```
User says "Set temp to 72" (via chat/Alexa/app)
           ↓
System checks: Is there a physical thermostat for this unit?
           ↓
   YES                           NO
    ↓                             ↓
Use Alexa API              Use virtual thermostat
to control real           (database only)
thermostat
    ↓
Log activity: "John from Unit 101 set temp to 72°F at 3:45 PM"
```

---

## 📊 Viewing Activity Logs

Every thermostat change is logged! View in admin dashboard under **"Activity Log"**:

```
2025-11-22 3:45 PM | John Smith (Unit 101) | Set temperature to 72°F
2025-11-22 2:30 PM | Alexa (Unit 102)     | Increased temperature by 2°F
2025-11-22 1:15 PM | Admin                | Added new thermostat device
```

---

## 🛠️ Troubleshooting

### "No Alexa credentials found"
- Make sure you completed Step 2.2 (Authorization)
- Check if token expired - re-authorize if needed

### "Failed to discover thermostats"
- Verify thermostats are working in your Alexa app
- Check if LWA credentials are correct
- Ensure you granted **Smart Home** permissions

### "Thermostat not responding"
- Check if device is online in Alexa app
- Try clicking **"Sync Status"** in admin dashboard
- Verify the device_id is correct

### Users can't control thermostat
- Make sure thermostat is assigned to their unit number
- Check if user has correct unit number in their profile
- Verify API credentials haven't expired

---

## 🔒 Security Notes

1. **API Credentials**: Store CLIENT_ID and CLIENT_SECRET as environment variables, never commit to git
2. **Access Tokens**: Automatically refreshed, but monitor expiration
3. **User Permissions**: Only users assigned to a unit can control that thermostat
4. **Activity Logging**: All changes are logged with user attribution

---

## 📚 Supported Thermostats

Any thermostat that works with Alexa will work with this system:

✅ Ecobee SmartThermostat
✅ Honeywell Home T9/T10
✅ Nest Thermostat (via Alexa integration)
✅ Sensi Touch
✅ Emerson Sensi
✅ Amazon Smart Thermostat
✅ And many more!

If it shows up in your Alexa app, it will work! 🎉

---

## 🎯 Next Steps

1. Set up Alexa credentials (Steps 1-2)
2. Discover your thermostats (Step 3)
3. Assign thermostats to units (Step 4)
4. Create user accounts for your tenants
5. Let tenants control their thermostats!

**Questions?** Check the main README or open an issue on GitHub.
