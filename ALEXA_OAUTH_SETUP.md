# Alexa Account Linking Setup Guide

This guide will walk you through setting up OAuth 2.0 Account Linking for your Alexa Smart Home skill with the Hospital Church Tenant Portal.

## Overview

The OAuth implementation provides secure, permission-based thermostat control where:
- **Tenants** authenticate with their portal credentials
- **Alexa** receives a token containing only their authorized thermostats
- **Access control** is enforced at every request - tenants can only control their assigned devices

## Prerequisites

- Cloudflare Workers deployment at: `https://tenant-support-chatbot.nwmcreativeworks.workers.dev`
- Amazon Developer Account with access to Alexa Skills Kit
- Database migrations 0001-0015 applied
- `JWT_SECRET` environment variable set in Cloudflare Workers

## Step 1: Run Database Migrations

Apply the OAuth tables migration:

```bash
npx wrangler d1 execute tenant-support-db --local --file=./migrations/0015_add_oauth_tables.sql
npx wrangler d1 execute tenant-support-db --remote --file=./migrations/0015_add_oauth_tables.sql
```

This creates:
- `oauth_codes` - Short-lived authorization codes (5 min expiry)
- `oauth_tokens` - Access tokens and refresh tokens

## Step 2: Set JWT Secret (Required)

Set a secure JWT secret for signing tokens:

```bash
# For production
npx wrangler secret put JWT_SECRET
# Enter a long random string (32+ characters)

# For local development, add to .dev.vars:
echo "JWT_SECRET=your-secure-random-secret-here" >> .dev.vars
```

Generate a secure secret:
```bash
# On macOS/Linux:
openssl rand -base64 32

# Or use this Node.js command:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 3: Configure Alexa Skill Account Linking

1. **Go to Alexa Developer Console:**
   - Navigate to: https://developer.amazon.com/alexa/console/ask
   - Select your Smart Home skill

2. **Enable Account Linking:**
   - Go to "Account Linking" tab
   - Click "Set up account linking now"

3. **Configure OAuth Settings:**

   **Authorization URI:**
   ```
   https://tenant-support-chatbot.nwmcreativeworks.workers.dev/oauth/authorize
   ```

   **Access Token URI:**
   ```
   https://tenant-support-chatbot.nwmcreativeworks.workers.dev/oauth/token
   ```

   **Client ID:**
   ```
   alexa-smarthome-skill
   ```
   (You can choose any client ID - it's for identification)

   **Your Secret:**
   - Click "Generate" or enter your own secret
   - Save this somewhere secure

   **Your Authentication Scheme:**
   - Select: `HTTP Basic (Recommended)`

   **Scope:**
   ```
   control
   ```

   **Domain List (Optional):**
   ```
   tenant-support-chatbot.nwmcreativeworks.workers.dev
   ```

   **Default Access Token Expiration Time:**
   ```
   3600
   ```
   (1 hour)

4. **Authorization Grant Type:**
   - Select: `Auth Code Grant`

5. **Save Configuration**

## Step 4: Test Account Linking Flow

### Via Alexa App:

1. Open Alexa app on mobile
2. Go to: **Devices** → **Your Skills** → **Your Smart Home Skill**
3. Tap **Enable to Use**
4. You'll be redirected to your OAuth login page
5. Enter tenant credentials:
   - Email: (tenant email from users table)
   - Password: (tenant password)
6. Click **Authorize & Link**
7. You'll be redirected back to Alexa with success message

### Via Test Request:

```bash
# Step 1: Get authorization code
curl "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/oauth/authorize?client_id=alexa-smarthome-skill&redirect_uri=https://pitangui.amazon.com/api/skill/link/YOURSKILLID&state=test123"

# Step 2: Exchange code for token
curl -X POST "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=YOUR_CODE_HERE&client_id=alexa-smarthome-skill"
```

## Step 5: Assign Thermostat Permissions

Before users can link their accounts, they need thermostat permissions assigned by an admin.

### Via Admin Dashboard:

1. Go to: `https://tenant-support-chatbot.nwmcreativeworks.workers.dev/admin/dashboard`
2. Click **Thermostats** tab
3. For each thermostat:
   - Click **👥 Users** button
   - Check the tenants who should have access
   - Click **Save Permissions**

### Via API:

```bash
# Assign thermostat to users
curl -X PUT "https://your-worker.workers.dev/admin/api/thermostats/1/permissions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "userIds": [2, 3, 4]
  }'
```

## Step 6: Test OAuth-Protected Endpoints

### Discover Devices:

```bash
curl "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/alexa/discover-devices" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "event": {
    "header": {
      "namespace": "Alexa.Discovery",
      "name": "Discover.Response",
      "payloadVersion": "3"
    },
    "payload": {
      "endpoints": [
        {
          "endpointId": "amzn1.alexa.device.id",
          "friendlyName": "Sanctuary Thermostat",
          "description": "Thermostat in Sanctuary",
          "manufacturerName": "Hospital Church",
          "displayCategories": ["THERMOSTAT"],
          "capabilities": [...]
        }
      ]
    }
  }
}
```

### Control Thermostat:

```bash
curl -X POST "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/alexa/control-thermostat" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alexa_device_id": "amzn1.alexa.device.id",
    "mode": "cool",
    "target_temperature_f": 72
  }'
```

### Get Thermostat Status:

```bash
curl "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/alexa/thermostat-status?alexa_device_id=amzn1.alexa.device.id" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Security Features

### Token-Based Authorization
- Access tokens are HMAC-signed JWTs containing user_id and authorized thermostats
- Tokens expire after 1 hour
- Refresh tokens can be used to get new access tokens without re-authentication

### Permission Enforcement
- Every thermostat control request validates the token
- Token contains embedded list of authorized thermostats
- Users can only control devices they have explicit permission for
- Cross-tenant access is impossible

### Audit Trail
- All OAuth authorizations logged to `admin_request_logs`
- All thermostat control commands logged with user ID
- Admins can see full audit trail in dashboard

## Troubleshooting

### Error: "No thermostat access"
- Admin hasn't assigned any thermostats to this user
- Go to Admin Dashboard → Thermostats → 👥 Users and assign permissions

### Error: "Invalid or expired authorization code"
- Authorization codes expire after 5 minutes
- Complete the flow faster or start over

### Error: "Token is invalid or expired"
- Access tokens expire after 1 hour
- Use refresh token to get a new access token
- Or re-authenticate via Alexa app

### Error: "Missing JWT_SECRET"
- Set JWT_SECRET environment variable in Cloudflare Workers
- See Step 2 above

## Database Schema

### oauth_codes
```sql
CREATE TABLE oauth_codes (
    code TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    client_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    scope TEXT DEFAULT 'control',
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### oauth_tokens
```sql
CREATE TABLE oauth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    access_token TEXT NOT NULL UNIQUE,
    refresh_token TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL,
    scope TEXT DEFAULT 'control',
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Next Steps

1. **Integrate with Real Alexa Smart Home API:**
   - Update `AlexaControlThermostat` in `src/endpoints/oauth/alexaControl.ts`
   - Replace stub with actual Alexa Smart Home directive calls
   - Use Alexa device IDs from your physical thermostats

2. **Add Token Revocation:**
   - Create endpoint: `POST /oauth/revoke`
   - Allow users to disconnect Alexa from tenant portal
   - Delete tokens from database

3. **Add Admin Revocation:**
   - Allow admins to revoke OAuth access for specific users
   - Useful when revoking thermostat permissions

4. **Monitor Token Usage:**
   - Track OAuth token usage in analytics
   - Set up alerts for suspicious activity
   - Implement rate limiting on OAuth endpoints

## Support

For issues or questions:
- Check Admin Dashboard → Activity Log for OAuth events
- Review `admin_request_logs` table for detailed audit trail
- Verify user has `user_thermostat_permissions` records
- Ensure JWT_SECRET is set and consistent across deployments
