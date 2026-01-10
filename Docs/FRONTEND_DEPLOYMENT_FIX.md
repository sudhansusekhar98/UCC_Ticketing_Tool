# Frontend Deployment Fix Guide

## Problem

Frontend shows 404 NOT_FOUND because Vercel isn't building the React app properly.

## Root Cause

The build completed in 52ms (way too fast) - Vercel didn't run `npm run build`.

## Solution

### Step 1: Update vercel.json ✅ (Already Done)

The `vercel.json` now has proper build commands.

### Step 2: Configure Vercel Project Settings

Go to your **Frontend** Vercel project:

1. **Settings** → **General** → **Root Directory**

   - Set to: `frontend/ucc-ticketing`
   - Click **Save**

2. **Settings** → **Build & Development Settings**

   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Settings** → **Environment Variables**
   - Add: `VITE_API_URL` = `https://ticket-25pye44s8-sudhansusekhar98s-projects.vercel.app/api`
   - (Use your actual backend URL from screenshot 1)

### Step 3: Redeploy

After saving settings:

1. Go to **Deployments** tab
2. Click the **"..."** menu on latest deployment
3. Click **"Redeploy"**

OR push a new commit:

```bash
git add .
git commit -m "Fix frontend Vercel configuration"
git push
```

## Expected Result

After redeployment, you should see:

- Build time: **30-60 seconds** (not 52ms)
- Build logs showing: "Building for production..."
- Output: "dist directory created"

## Verification

1. Visit: `https://your-frontend.vercel.app`
2. Should see: Login page (not 404)
3. Try logging in
4. Should connect to backend successfully

## Backend URL

From your screenshot, your backend is:

```
https://ticket-25pye44s8-sudhansusekhar98s-projects.vercel.app
```

So your `VITE_API_URL` should be:

```
https://ticket-25pye44s8-sudhansusekhar98s-projects.vercel.app/api
```

## Quick Checklist

- [ ] Root Directory set to `frontend/ucc-ticketing`
- [ ] Framework Preset set to `Vite`
- [ ] `VITE_API_URL` environment variable added
- [ ] Redeployed after changes
- [ ] Build time is 30-60 seconds (not 52ms)
- [ ] Frontend shows login page (not 404)

---

**Next**: After fixing these settings and redeploying, the frontend should work!
