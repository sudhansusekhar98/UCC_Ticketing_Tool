# VPS CI/CD Setup Prompt for Claude CLI

Copy everything below the line and paste it into a new Claude Code CLI session.

---

## Task: Set up CI/CD deployment for TicketOps on my VPS

I have a full-stack app (Express.js backend + React/Vite frontend) that I need to deploy to my Linux VPS using Docker and GitHub Actions CI/CD.

### Current State
- The codebase is at: `d:\VL Access\CODES\UCC_Ticketing_Tool - AWS`
- It already has `docker-compose.yml`, `backend-express/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, and `.github/workflows/deploy.yml` ready
- The VPS already has the app running manually (backend at `~/ticketops`, frontend at `~/ticketops-frontend`)
- The VPS has Docker and Docker Compose installed
- MongoDB is running locally on the VPS on port 27017
- Backend runs on port 3000
- The domain is `ticket.vluccc.com`

### What I need you to do (step by step)

**Ask me for credentials before starting** — you'll need:
1. My VPS IP address and SSH port
2. My VPS SSH username and password (or key path)
3. My GitHub username/org and desired repo name

Then execute these steps:

#### Step 1: Create GitHub repo and push code
- Use `gh` CLI to create a private GitHub repo
- Add the remote and push the `main` branch
- If `main` doesn't exist, create it from the current branch (`004-activity-enhancements-fixes`) and push

#### Step 2: SSH into VPS and set up
Connect via SSH and run these commands:

```
# a) Install git on VPS if not present
# b) Generate SSH deploy key on VPS for GitHub access
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
# Add this as a Deploy Key in the GitHub repo (read-only is fine)

# c) Configure SSH to use this key for GitHub
echo -e "Host github.com\n  IdentityFile ~/.ssh/github_deploy\n  StrictHostKeyChecking no" >> ~/.ssh/config

# d) Clone the repo into a new directory
cd ~
git clone git@github.com:OWNER/REPO.git ticketops-app

# e) Copy existing .env from old deployment (DO NOT modify or print its contents)
cp ~/ticketops/.env ~/ticketops-app/backend-express/.env

# f) Fix MongoDB URI for Docker networking
# In the .env file, replace:
#   MONGODB_URI=mongodb://localhost:27017/ucc_ticketing
# With:
#   MONGODB_URI=mongodb://host.docker.internal:27017/ucc_ticketing
# Use sed — do NOT print the file contents

# g) Configure MongoDB to accept connections from Docker bridge network
# Edit /etc/mongod.conf — change bindIp to include Docker subnet:
#   bindIp: 127.0.0.1,172.17.0.1
# Then restart: sudo systemctl restart mongod

# h) Stop the old containers/processes if running
# Check what's running: docker ps, pm2 list, or systemctl
# Stop gracefully — don't delete old directories yet

# i) Start the new deployment
cd ~/ticketops-app
docker compose up -d --build

# j) Verify
docker ps  (should show ticketops-backend and ticketops-frontend)
curl -s http://localhost:3000/api/health || curl -s http://localhost:3000
curl -s http://localhost:80
```

#### Step 3: Set GitHub Secrets for CI/CD
Use `gh` CLI locally to set the required secrets:

```
gh secret set VPS_HOST --body "THE_VPS_IP"
gh secret set VPS_USER --body "THE_SSH_USER"
gh secret set VPS_SSH_KEY < PATH_TO_PRIVATE_KEY
gh secret set VPS_PORT --body "22"
gh secret set APP_DIR --body "/home/USERNAME/ticketops-app"
```

For VPS_SSH_KEY: either use the existing key I provide, or generate a new keypair and add the public key to the VPS `~/.ssh/authorized_keys`.

#### Step 4: Test the CI/CD pipeline
- Make a trivial change (add a comment to any file)
- Commit and push to main
- Watch the GitHub Action run: `gh run watch`
- Verify deployment succeeded

### Important constraints
- NEVER print, display, or log the contents of .env files — they contain secrets
- NEVER delete the old `~/ticketops` and `~/ticketops-frontend` directories until the new setup is verified working
- The .env on the VPS must NOT be in git — it stays only on the server
- Ask me before running any destructive commands (stopping services, deleting files)
- If something fails, show me the error and ask before retrying

### Security: Rotate exposed secrets
After deployment is working, remind me to rotate these secrets (they were accidentally exposed):
- JWT_SECRET and JWT_REFRESH_SECRET
- ENCRYPTION_KEY (will need `npm run migrate:encrypt` after changing)
- SMTP_PASS
- CLOUDINARY_API_SECRET  
- SURVEY_API_KEY
