# TicketOps — VPS Deployment Guide

## Infrastructure Overview

| Component | Details |
|-----------|---------|
| VPS | Ubuntu, 3.8GB RAM, 2 vCPU, 63GB disk |
| Backend | Node.js 22 (Express) — Docker container |
| Frontend | React (Vite build) served via Nginx — Docker container |
| Database | MongoDB (WiredTiger) — installed directly on VPS (systemd) |
| CI/CD | GitHub Actions → SSH deploy → `docker compose up --build` |
| Domain | `ticketops.vluccc.com` (frontend), `ticketopsapi.vluccc.com` (backend API) |

## Prerequisites

- Ubuntu VPS with Docker and Docker Compose installed
- MongoDB installed on VPS (not in Docker)
- GitHub repo: `sudhansusekhar98/UCC_Ticketing_Tool`
- GitHub Secrets configured (see CI/CD section)

---

## First-Time VPS Setup

### 1. Install MongoDB

```bash
# Import MongoDB GPG key and add repo (check docs.mongodb.com for latest version)
sudo apt-get install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Configure MongoDB for Performance

Edit `/etc/mongod.conf`:

```yaml
storage:
  dbPath: /var/lib/mongodb
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.25

net:
  port: 27017
  bindIp: 127.0.0.1
```

Key: `cacheSizeGB: 0.25` limits WiredTiger cache to 256MB. The default (50% of RAM) causes swap thrashing on a 4GB VPS.

```bash
sudo systemctl restart mongod
```

### 3. Tune Linux Kernel

```bash
# Reduce swap aggressiveness (default is 60, use 10)
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

### 4. Clone the Repository

```bash
cd ~
git clone https://github.com/sudhansusekhar98/UCC_Ticketing_Tool.git ticketops-app
cd ticketops-app
```

### 5. Create Backend Environment File

```bash
cp backend-express/.env.example backend-express/.env
nano backend-express/.env
```

Required variables:

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://127.0.0.1:27017/ticketops
JWT_SECRET=<generate-a-strong-secret>
JWT_REFRESH_SECRET=<generate-another-strong-secret>
ENCRYPTION_KEY=<64-hex-chars-for-aes-256>
CORS_ORIGIN=https://ticketops.vluccc.com
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud>
CLOUDINARY_API_KEY=<your-key>
CLOUDINARY_API_SECRET=<your-secret>
SMTP_HOST=<your-smtp-host>
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASS=<your-password>
```

### 6. Build and Start Containers

```bash
docker compose up -d --build
```

### 7. Seed the Database (first time only)

```bash
docker exec -it ticketops-backend node seed.js
```

---

## CI/CD Pipeline

### How It Works

The file `.github/workflows/deploy.yml` triggers on every push to `main`:

1. GitHub Actions SSHs into the VPS
2. Runs `git pull origin main`
3. Runs `docker compose up -d --build --force-recreate`
4. Cleans up dangling Docker images

### Required GitHub Secrets

Set these in GitHub → Repo → Settings → Secrets and variables → Actions:

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_USER` | SSH username (e.g., `administrator`) |
| `VPS_SSH_KEY` | Private SSH key (full PEM content) |
| `VPS_PORT` | SSH port (usually `22`) |
| `APP_DIR` | App directory on VPS (e.g., `/home/administrator/ticketops-app`) |

### Deploying

Just push to `main`:

```bash
git push origin main
```

Monitor the deploy at: `https://github.com/sudhansusekhar98/UCC_Ticketing_Tool/actions`

---

## Docker Architecture

### Container Resource Limits

| Container | Memory Limit | Memory Reserved |
|-----------|-------------|-----------------|
| `ticketops-backend` | 512MB | 256MB |
| `ticketops-frontend` | 128MB | 64MB |

### Backend Container

- Base image: `node:22-alpine`
- Node memory limit: `--max-old-space-size=384`
- Health check: `wget --spider http://localhost:3000/api/health` every 30s
- Auto-restarts on failure (`restart: unless-stopped`)

### Frontend Container

- Multi-stage build: Node (build) → Nginx (serve)
- Nginx handles gzip compression, static asset caching, API proxying
- Waits for backend health check before starting

---

## Nginx Configuration

The frontend container runs Nginx with:

- **Gzip compression** on JS, CSS, JSON, SVG, fonts (compression level 6)
- **Proxy buffering** for API requests (prevents slow clients blocking backend)
- **Static asset caching**: 30 days with `immutable` header
- **WebSocket proxying** for Socket.IO (`/socket.io/`)
- **API proxying** to backend container (`/api/` → `http://backend:3000`)

Config file: `frontend/nginx.conf`

---

## Performance Tuning Reference

### MongoDB (on VPS)

| Setting | Value | Why |
|---------|-------|-----|
| `cacheSizeGB` | 0.25 | Prevents WiredTiger from hogging RAM on a shared VPS |
| `bindIp` | 127.0.0.1 | Security: only local connections |

### Linux Kernel

| Setting | Value | Why |
|---------|-------|-----|
| `vm.swappiness` | 10 | Keeps data in RAM instead of swapping to slow disk |

### Memory Budget (3.8GB VPS)

| Component | Allocation |
|-----------|-----------|
| OS + buffers/cache | ~1.0GB |
| MongoDB | ~250MB |
| Backend container | up to 512MB |
| Frontend (Nginx) | ~128MB |
| Other containers | ~500MB |
| Free headroom | ~1.4GB |

---

## Monitoring

### Check container status

```bash
docker stats --no-stream
```

### Check MongoDB

```bash
mongosh --eval "db.serverStatus().mem"
mongosh --eval "db.serverStatus().wiredTiger.cache['bytes currently in the cache']"
```

### Check memory and swap

```bash
free -h
```

### Check backend logs

```bash
docker logs ticketops-backend --tail 100 -f
```

### Check if swap is being used (should be ~0)

```bash
free -h | grep Swap
```

If swap usage creeps above 200MB, investigate with `docker stats` and consider limiting other containers.

---

## Troubleshooting

### Site is slow

1. Check swap: `free -h` — swap used should be near 0
2. Check container memory: `docker stats --no-stream`
3. Check MongoDB cache: `mongosh --eval "db.serverStatus().wiredTiger.cache['maximum bytes configured']"` — should be ~268MB
4. If swap is high: `sudo swapoff -a && sudo swapon -a` (clears swap)

### Backend container keeps restarting

```bash
docker logs ticketops-backend --tail 50
```

Common causes:
- `.env` file missing or incorrect `MONGODB_URI`
- MongoDB not running: `sudo systemctl status mongod`
- Port 3000 already in use

### MongoDB won't start after config change

```bash
sudo journalctl -u mongod --since "5 minutes ago"
```

Usually a YAML indentation error in `/etc/mongod.conf`. Use 2 spaces per level, no tabs.

### Deploy fails in GitHub Actions

Check Actions logs at: `https://github.com/sudhansusekhar98/UCC_Ticketing_Tool/actions`

Common causes:
- SSH key mismatch — regenerate and update `VPS_SSH_KEY` secret
- VPS disk full — `df -h` to check
- Docker build fails — SSH in and run `docker compose up -d --build` manually to see errors

### Clear swap after heavy load

```bash
sudo swapoff -a && sudo swapon -a
free -h
```
