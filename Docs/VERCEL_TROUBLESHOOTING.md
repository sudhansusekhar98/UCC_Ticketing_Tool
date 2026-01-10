# Vercel Deployment Troubleshooting Guide

## Current Error: FUNCTION_INVOCATION_FAILED

This error means the serverless function is crashing during execution. Here's how to fix it:

## Step 1: Test with Simple Endpoint

1. Deploy your backend to Vercel
2. Visit: `https://your-backend.vercel.app/api/test`
3. If this works, the issue is with the main Express app
4. If this fails, there's a build/deployment issue

## Step 2: Check Vercel Logs

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your backend project
3. Go to **Deployments** tab
4. Click on the latest deployment
5. Click **View Function Logs** or **Runtime Logs**
6. Look for the actual error message (it will show what's failing)

## Step 3: Verify Environment Variables

Make sure ALL these are set in Vercel Dashboard → Settings → Environment Variables:

### Required Variables:

- ✅ `MONGODB_URI` - MongoDB Atlas connection string
- ✅ `JWT_SECRET` - JWT signing secret (64 chars)
- ✅ `JWT_REFRESH_SECRET` - Refresh token secret (64 chars)
- ✅ `CORS_ORIGIN` - Frontend URL (e.g., `https://your-app.vercel.app`)
- ✅ `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- ✅ `CLOUDINARY_API_KEY` - Cloudinary API key
- ✅ `CLOUDINARY_API_SECRET` - Cloudinary API secret

### How to Add:

```bash
# Via Vercel CLI
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
vercel env add JWT_REFRESH_SECRET production
vercel env add CORS_ORIGIN production
vercel env add CLOUDINARY_CLOUD_NAME production
vercel env add CLOUDINARY_API_KEY production
vercel env add CLOUDINARY_API_SECRET production
```

## Step 4: Common Issues & Solutions

### Issue 1: Missing MONGODB_URI

**Error in logs**: "MONGODB_URI is not defined"
**Solution**: Add MONGODB_URI in Vercel environment variables

### Issue 2: MongoDB Connection Timeout

**Error in logs**: "MongoServerSelectionError"
**Solution**:

1. Go to MongoDB Atlas → Network Access
2. Add `0.0.0.0/0` to IP whitelist (allows all IPs)
3. Redeploy

### Issue 3: Module Import Error

**Error in logs**: "Cannot find module" or "SyntaxError"
**Solution**:

- Check that all imports use `.js` extension
- Verify `package.json` has `"type": "module"`
- Run `npm install` locally to verify dependencies

### Issue 4: Cloudinary Configuration Error

**Error in logs**: "Cloudinary config error"
**Solution**: Verify all 3 Cloudinary env vars are set correctly

## Step 5: Alternative Deployment Strategy

If Vercel continues to fail, consider these alternatives:

### Option A: Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
cd backend-express
railway up
```

### Option B: Deploy to Render

1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect your GitHub repo
4. Set root directory to `backend-express`
5. Add environment variables
6. Deploy

### Option C: Use Vercel with Simplified Setup

Remove Socket.io completely and use polling instead of WebSockets.

## Step 6: Debugging Commands

### Check if MongoDB URI is valid:

```bash
# Test MongoDB connection
node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_MONGODB_URI').then(() => console.log('✅ Connected')).catch(err => console.error('❌ Failed:', err.message));"
```

### Generate new JWT secrets:

```bash
# Windows PowerShell
[Convert]::ToBase64String((1..64|ForEach-Object{Get-Random -Maximum 256}))

# Linux/Mac
openssl rand -base64 64
```

### Test local build:

```bash
cd backend-express
npm install
npm start
```

## Step 7: Vercel-Specific Configuration

Your current `vercel.json`:

```json
{
  "version": 2,
  "name": "ucc-ticketing-backend",
  "installCommand": "npm install --legacy-peer-deps",
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

## Step 8: What to Check in Logs

Look for these specific errors:

1. **"Cannot find module"** → Missing dependency or wrong import path
2. **"MONGODB_URI is not defined"** → Environment variable not set
3. **"MongoServerSelectionError"** → Can't connect to MongoDB (check IP whitelist)
4. **"SyntaxError"** → Code syntax error or ES module issue
5. **"ECONNREFUSED"** → Network/firewall issue

## Step 9: Quick Test Checklist

- [ ] Test endpoint works: `/api/test`
- [ ] Health endpoint works: `/api/health`
- [ ] All environment variables are set in Vercel
- [ ] MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- [ ] Vercel logs show the actual error
- [ ] Local build works (`npm start`)

## Step 10: Get Help

If still failing:

1. Copy the **exact error** from Vercel logs
2. Check which line number is failing
3. Share the error message for specific help

## Important Notes

- Vercel serverless functions have a **10-second timeout** on free tier
- MongoDB connection should be fast (< 2 seconds)
- Socket.io **does not work** on Vercel free tier (use polling or upgrade)
- Environment variables must be set **before** deployment
- After adding env vars, you must **redeploy**

## Success Indicators

✅ `/api/test` returns JSON
✅ `/api/health` shows "OK" status
✅ `/api/auth/login` accepts requests
✅ No errors in Vercel logs
✅ MongoDB connection successful

---

**Next Step**: Check Vercel logs and share the exact error message!
