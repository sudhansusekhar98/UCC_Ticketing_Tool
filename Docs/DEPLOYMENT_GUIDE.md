# Deployment Guide - TicketOps

## Overview

This guide covers deploying the frontend and backend as **separate projects** on Vercel. This is the recommended approach for better scalability and independent deployments.

## Architecture

- **Frontend**: React + Vite SPA hosted on Vercel
- **Backend**: Express.js API with Socket.io on Vercel Serverless Functions
- **Database**: MongoDB Atlas (cloud)
- **File Storage**: Cloudinary (for attachments)

---

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **MongoDB Atlas**: Set up a cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
3. **Cloudinary Account**: Get credentials at [cloudinary.com](https://cloudinary.com)
4. **GitHub/GitLab**: Push your code to a repository

---

## Part 1: Backend Deployment

### Step 1: Create New Vercel Project for Backend

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Import your repository
4. **Configure Project:**
   - **Root Directory**: `backend-express`
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`

### Step 2: Set Backend Environment Variables

In Vercel project settings → Environment Variables, add:

```env
NODE_ENV=production
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secret-key-min-32-chars>
JWT_REFRESH_SECRET=<your-refresh-secret-key-min-32-chars>
CORS_ORIGIN=<your-frontend-url>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
```

**Important Notes:**

- `MONGODB_URI`: Get from MongoDB Atlas → Connect → Connect your application
- `JWT_SECRET`: Generate with: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET`: Generate with: `openssl rand -base64 32`
- `CORS_ORIGIN`: Will be your frontend URL (e.g., `https://your-app.vercel.app`)
- Cloudinary credentials: From Cloudinary Dashboard

### Step 3: Deploy Backend

1. Click **Deploy**
2. Wait for deployment to complete
3. Note your backend URL (e.g., `https://your-backend.vercel.app`)
4. Test the backend: `https://your-backend.vercel.app/api/health`

---

## Part 2: Frontend Deployment

### Step 1: Create New Vercel Project for Frontend

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Import the **same repository** (or a different one if separated)
4. **Configure Project:**
   - **Root Directory**: `frontend/ucc-ticketing`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 2: Set Frontend Environment Variables

In Vercel project settings → Environment Variables, add:

```env
VITE_API_URL=<your-backend-url>/api
```

**Example:**

```env
VITE_API_URL=https://your-backend.vercel.app/api
```

⚠️ **Important:**

- Include `/api` at the end
- Do NOT include a trailing slash
- Use the backend URL from Part 1, Step 3

### Step 3: Deploy Frontend

1. Click **Deploy**
2. Wait for deployment to complete
3. Note your frontend URL (e.g., `https://your-app.vercel.app`)

### Step 4: Update Backend CORS

1. Go back to **Backend** Vercel project
2. Update `CORS_ORIGIN` environment variable with your frontend URL
3. Redeploy the backend

---

## Part 3: Verification

### Test Backend

```bash
curl https://your-backend.vercel.app/api/health
```

Expected response:

```json
{
  "status": "OK",
  "timestamp": "2026-01-10T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### Test Frontend

1. Open `https://your-app.vercel.app`
2. Press F12 to open DevTools → Network tab
3. Try to login
4. Verify API requests go to your backend (not localhost)
5. Check for successful responses (200 status codes)

### Testing Checklist

- [ ] Backend health endpoint responds
- [ ] Frontend loads without errors
- [ ] Login works correctly
- [ ] Dashboard displays data
- [ ] Tickets can be created
- [ ] Real-time updates work (Socket.io)
- [ ] File uploads work (Cloudinary)
- [ ] No CORS errors in console

---

## Environment Variables Reference

### Frontend (`frontend/ucc-ticketing`)

| Variable       | Description     | Example                       |
| -------------- | --------------- | ----------------------------- |
| `VITE_API_URL` | Backend API URL | `https://api.example.com/api` |

### Backend (`backend-express`)

| Variable                | Required | Description               | Example                                              |
| ----------------------- | -------- | ------------------------- | ---------------------------------------------------- |
| `NODE_ENV`              | Yes      | Environment               | `production`                                         |
| `MONGODB_URI`           | Yes      | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET`            | Yes      | JWT signing secret        | Generated 32+ char string                            |
| `JWT_REFRESH_SECRET`    | Yes      | Refresh token secret      | Generated 32+ char string                            |
| `CORS_ORIGIN`           | Yes      | Allowed frontend origin   | `https://your-app.vercel.app`                        |
| `CLOUDINARY_CLOUD_NAME` | Yes      | Cloudinary cloud name     | `your-cloud-name`                                    |
| `CLOUDINARY_API_KEY`    | Yes      | Cloudinary API key        | `123456789012345`                                    |
| `CLOUDINARY_API_SECRET` | Yes      | Cloudinary API secret     | `abcdefghijklmnop`                                   |

---

## Troubleshooting

### Frontend Issues

#### "Login Failed" Error

**Symptoms:** Cannot login, API calls to localhost

**Solution:**

1. Verify `VITE_API_URL` is set in Vercel
2. Check it points to deployed backend
3. Redeploy frontend after setting variables

#### CORS Error

**Symptoms:** "Access-Control-Allow-Origin" error in console

**Solution:**

1. Update `CORS_ORIGIN` in backend to match frontend URL
2. Ensure no trailing slash in CORS_ORIGIN
3. Redeploy backend

### Backend Issues

#### MongoDB Connection Failed

**Symptoms:** 500 errors, "Cannot connect to database"

**Solution:**

1. Verify `MONGODB_URI` is correct
2. Check IP whitelist in MongoDB Atlas (allow all: `0.0.0.0/0`)
3. Ensure database user has correct permissions

#### Socket.io Not Working

**Symptoms:** Real-time updates not working

**Solution:**

1. Socket.io works on Vercel with limitations
2. Consider upgrading to Vercel Pro for better WebSocket support
3. Or use a dedicated server (Railway, Render, etc.) for backend

#### "Route not found" for API calls

**Symptoms:** 404 errors for API endpoints

**Solution:**

1. Check `vercel.json` routes configuration
2. Ensure `/api/*` routes to `server.js`
3. Verify API endpoints start with `/api/`

---

## Alternative: Monorepo Deployment (Not Recommended)

If you prefer deploying both from a single project:

1. Use root `vercel.json` (already exists)
2. Set environment variables for both frontend and backend
3. This is more complex and harder to manage

**We recommend separate projects for:**

- Independent deployments
- Better scalability
- Easier debugging
- Separate logs and analytics

---

## Local Development

### Backend

```bash
cd backend-express
npm install
# Create .env file with local settings
npm run dev
```

### Frontend

```bash
cd frontend/ucc-ticketing
npm install
# Create .env file or run setup-local.bat
npm run dev
```

---

## Production Best Practices

1. **Environment Variables**: Never commit secrets to Git
2. **HTTPS Only**: Ensure both frontend and backend use HTTPS
3. **CORS**: Only allow your frontend domain
4. **Rate Limiting**: Consider adding rate limiting to APIs
5. **Error Monitoring**: Use tools like Sentry for error tracking
6. **Logging**: Configure proper logging in production
7. **Backups**: Regular MongoDB backups
8. **Security**: Keep dependencies updated

---

## Quick Reference Commands

### Generate JWT Secret

```bash
openssl rand -base64 32
```

### Vercel CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy Backend
cd backend-express
vercel --prod

# Deploy Frontend
cd frontend/ucc-ticketing
vercel --prod
```

### Set Environment Variables via CLI

```bash
# Backend
cd backend-express
vercel env add MONGODB_URI production

# Frontend
cd frontend/ucc-ticketing
vercel env add VITE_API_URL production
```

---

## Support

For issues:

1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Test backend health endpoint
5. Check MongoDB Atlas connection

---

## Summary

✅ **Separate deployments**: Frontend and Backend are independent
✅ **Environment variables**: All secrets are in Vercel, not in code
✅ **Production ready**: CORS, security headers, and compression enabled
✅ **Scalable**: Each part can scale independently

**Deployment URLs:**

- Frontend: `https://your-app.vercel.app`
- Backend API: `https://your-backend.vercel.app/api`
