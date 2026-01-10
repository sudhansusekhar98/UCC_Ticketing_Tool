# Vercel Deployment Strategy - Step by Step

## Current Situation

The main `server.js` keeps crashing on Vercel with `FUNCTION_INVOCATION_FAILED`.

## Testing Strategy

### Step 1: Test Minimal Function (Current)

**File**: `api/standalone.js`
**Purpose**: Verify Vercel can run Express at all

**Deploy and test**:

```bash
git add .
git commit -m "Test standalone Express app"
git push
```

**Test URL**: `https://your-backend.vercel.app/api/health`

**Expected**: Should return `{"status":"OK"}`

---

### Step 2: If Step 1 Works

This means Vercel CAN run Express, so the issue is in `server.js`.

**Likely causes**:

1. ❌ Socket.io import failing
2. ❌ MongoDB connection blocking
3. ❌ Missing environment variable causing crash
4. ❌ Route import failing

**Next action**: Check Vercel logs for exact error

---

### Step 3: If Step 1 Fails

This means there's a fundamental Vercel configuration issue.

**Possible issues**:

1. ❌ Node.js version incompatibility
2. ❌ Package.json issue
3. ❌ Vercel region/settings issue

**Next action**: Try different Vercel configuration

---

## How to Check Vercel Logs

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your backend project
3. Click **"Deployments"** tab
4. Click the latest deployment
5. Click **"Runtime Logs"** or **"Function Logs"**
6. Look for the RED error lines
7. **Copy the exact error message**

---

## Environment Variables Checklist

Make sure ALL these are set in Vercel Dashboard:

- [ ] `MONGODB_URI`
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `CORS_ORIGIN`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `NODE_ENV` = `production`

---

## Alternative: Deploy to Railway

If Vercel continues to fail, Railway is easier for Express apps:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
cd backend-express
railway up
```

Railway supports:

- ✅ Socket.io
- ✅ Long-running processes
- ✅ WebSockets
- ✅ Better for traditional Node.js apps

---

## Next Steps

1. **Deploy the standalone test** (current vercel.json)
2. **Check if it works** at `/api/health`
3. **If it works**: The issue is in server.js - check logs
4. **If it fails**: Try Railway or check Vercel settings
5. **Share the exact error** from Vercel logs

---

## Quick Commands

```bash
# Deploy to Vercel
git add .
git commit -m "Test standalone app"
git push

# Check logs (after deployment)
vercel logs <deployment-url>

# Or use Railway
railway up
```
