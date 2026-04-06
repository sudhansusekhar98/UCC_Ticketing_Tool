# AWS Elastic Beanstalk Deployment Guide — TicketOps Backend

## Summary of Changes

### Modified Files

| File | Changes |
|------|---------|
| [server.js](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/server.js) | Removed all Vercel conditionals, static Socket.IO import, trust proxy for ALB, port 8080, graceful shutdown (SIGTERM), root health endpoint for ELB |
| [config/database.js](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/config/database.js) | Removed Vercel checks, increased connection pool (20/5), added reconnected handler, removed process.exit |
| [utils/upload.js](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/utils/upload.js) | Removed Vercel detection, always uses disk storage |
| [package.json](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/package.json) | Added engines field (Node ≥18), updated description |
| [.gitignore](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/.gitignore) | Added `.elasticbeanstalk/` and zip bundle patterns |

### New Files Created

| File | Purpose |
|------|---------|
| [.ebignore](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/.ebignore) | Controls what EB CLI deploys (excludes Vercel files, tests, debug scripts) |
| [.ebextensions/01_node.config](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/.ebextensions/01_node.config) | EB settings: node command, nginx proxy, sticky sessions, health check |
| [.ebextensions/02_uploads.config](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/.ebextensions/02_uploads.config) | Creates `uploads/` directory on EB instances |
| [.platform/nginx/conf.d/websocket.conf](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/.platform/nginx/conf.d/websocket.conf) | Nginx: upload size limit (50MB), WebSocket upgrade map |
| [.platform/nginx/conf.d/elasticbeanstalk/websocket.conf](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/.platform/nginx/conf.d/elasticbeanstalk/websocket.conf) | Nginx: Socket.IO proxy with WebSocket upgrade headers |
| [.env.aws.example](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/.env.aws.example) | AWS-specific environment variable template |
| [create-aws-bundle.ps1](file:///d:/VL%20Access/CODES/UCC_Ticketing_Tool%20-%20AWS/backend-express/create-aws-bundle.ps1) | PowerShell script to create deployment zip |

---

## Architecture on AWS EB

```mermaid
graph TD
    A["Internet / Users"] --> B["AWS ALB<br/>(Application Load Balancer)"]
    B -->|"HTTP/HTTPS"| C["Nginx Proxy<br/>(on EB instance)"]
    B -->|"WebSocket"| C
    C -->|"port 8080"| D["Node.js Express<br/>(server.js)"]
    D --> E["Socket.IO<br/>(WebSocket)"]
    D --> F["MongoDB Atlas<br/>(Cloud Database)"]
    D --> G["Cloudinary<br/>(Image Storage)"]
    D --> H["SMTP<br/>(Email)"]
    D --> I["Cron Jobs<br/>(SLA, Logs)"]
```

---

## Deployment Steps

### Option A: Deploy via AWS Console (Upload Zip)

**1. Create the zip bundle:**
```powershell
cd "d:\VL Access\CODES\UCC_Ticketing_Tool - AWS\backend-express"
.\create-aws-bundle.ps1
```

**2. Create EB Environment (first time):**
1. Go to **AWS Elastic Beanstalk Console**
2. Click **Create Application**
3. Application name: `ticketops-backend`
4. Platform: **Node.js** (AL2023)
5. Upload your code: select the generated `ticketops-backend-aws-*.zip`
6. Click **Create Environment**

**3. Configure Environment Variables:**

Go to **Configuration → Software → Environment properties** and add:

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | ✅ |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/ucc_ticketing?retryWrites=true&w=majority` | ✅ |
| `JWT_SECRET` | *(your secret)* | ✅ |
| `JWT_EXPIRE` | `6h` | ✅ |
| `JWT_REFRESH_SECRET` | *(your secret)* | ✅ |
| `JWT_REFRESH_EXPIRE` | `6h` | ✅ |
| `ENCRYPTION_KEY` | *(64 hex chars)* | ✅ |
| `CORS_ORIGIN` | `https://your-frontend-url.com` | ✅ |
| `SMTP_HOST` | `smtp.gmail.com` | ✅ |
| `SMTP_PORT` | `587` | ✅ |
| `SMTP_USER` | *(email)* | ✅ |
| `SMTP_PASS` | *(app password)* | ✅ |
| `FRONTEND_URL` | `https://your-frontend-url.com` | ✅ |
| `CLOUDINARY_CLOUD_NAME` | *(name)* | ✅ |
| `CLOUDINARY_API_KEY` | *(key)* | ✅ |
| `CLOUDINARY_API_SECRET` | *(secret)* | ✅ |

> [!IMPORTANT]
> The `PORT` variable is auto-set by EB to `8080`. Do NOT override it.

**4. Configure Load Balancer for WebSocket:**
1. Go to **Configuration → Load Balancer**
2. Change to **Application Load Balancer** (ALB)
3. Enable **Sticky Sessions** (AWSALB cookie, 86400s)
4. Add listener: HTTPS 443 → Target Group (port 80)

### Option B: Deploy via EB CLI

```bash
# Install EB CLI
pip install awsebcli

# Initialize (first time only)
cd backend-express
eb init ticketops-backend --platform "Node.js 18" --region ap-south-1

# Create environment (first time)
eb create ticketops-prod --instance-type t3.small --envvars NODE_ENV=production

# Deploy updates
eb deploy

# Set environment variables
eb setenv MONGODB_URI="mongodb+srv://..." JWT_SECRET="..." CORS_ORIGIN="..."
```

---

## MongoDB Atlas: Whitelist EB IP

> [!WARNING]
> You MUST whitelist your EB instance's IP in MongoDB Atlas **Network Access**.

**Option 1 (Quick):** Allow from anywhere: `0.0.0.0/0`  
**Option 2 (Secure):** Use Elastic IP or NAT Gateway and whitelist that specific IP.

---

## Verifying the Deployment

After deployment, test these endpoints:

```bash
# Root health check (ELB uses this)
curl https://your-eb-url.elasticbeanstalk.com/

# API health check
curl https://your-eb-url.elasticbeanstalk.com/api/health

# Auth endpoint
curl -X POST https://your-eb-url.elasticbeanstalk.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}'
```

Expected health response:
```json
{
  "status": "OK",
  "timestamp": "2026-04-02T...",
  "uptime": 42,
  "environment": "production",
  "database": "connected"
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **502 Bad Gateway** | Check EB logs (`eb logs`). Usually means app failed to start on port 8080 |
| **Database timeout** | Whitelist EB IP in MongoDB Atlas → Network Access |
| **Socket.IO not connecting** | Ensure ALB sticky sessions are enabled + HTTPS listener exists |
| **File upload too large** | The nginx config sets `client_max_body_size 50M`. Adjust in `.platform/nginx/conf.d/websocket.conf` |
| **CORS errors** | Add your frontend URL to the `CORS_ORIGIN` env var |
| **App crashes on deploy** | EB sends SIGTERM. Graceful shutdown is handled in server.js |

### View Logs
```bash
# EB CLI
eb logs

# Or in Console: Logs → Request Logs → Last 100 Lines
```

---

## Zip Bundle Contents

The `create-aws-bundle.ps1` script creates a clean zip with **112 files (~0.22 MB)** containing:

```
ticketops-backend-aws-*.zip
├── .ebextensions/          # EB configuration
│   ├── 01_node.config
│   └── 02_uploads.config
├── .platform/              # Nginx customization
│   └── nginx/conf.d/
│       ├── websocket.conf
│       └── elasticbeanstalk/websocket.conf
├── config/                 # App configuration
│   └── database.js
├── controllers/            # Route handlers
├── middleware/              # Auth, validation, rate limiting
├── models/                 # MongoDB models
├── routes/                 # Express routes
├── scripts/                # Seed, migration scripts
├── utils/                  # Email, upload, encryption
├── server.js               # Main entry point
├── package.json            # Dependencies
├── package-lock.json       # Lock file (reproducible installs)
├── Procfile                # EB process definition
├── .ebignore               # EB deployment excludes
├── .env.aws.example        # Env var template
└── nodemon.json            # Dev config
```

**Excluded from zip:** `node_modules/`, `.env`, `api/` (Vercel), `__tests__/`, `backups/`, `uploads/`, debug scripts
