#!/bin/bash
set -e

echo "=== TicketOps VPS CI/CD Setup ==="

REPO_URL="git@github.com:sudhansusekhar98/UCC_Ticketing_Tool.git"
APP_DIR="$HOME/ticketops-app"

# Step 1: Install dependencies if missing
echo "[1/8] Checking dependencies..."
if ! command -v git &>/dev/null; then
    echo "Installing git..."
    sudo apt-get update && sudo apt-get install -y git
fi

if ! command -v docker &>/dev/null; then
    echo "ERROR: Docker is not installed. Install Docker first."
    exit 1
fi

if ! docker compose version &>/dev/null; then
    echo "ERROR: Docker Compose v2 is not installed."
    exit 1
fi

echo "  git: $(git --version)"
echo "  docker: $(docker --version)"
echo "  docker compose: $(docker compose version)"

# Step 2: Generate GitHub deploy key
echo "[2/8] Setting up GitHub deploy key..."
if [ ! -f ~/.ssh/github_deploy ]; then
    ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "ticketops-vps-deploy"
    echo ""
    echo "========================================"
    echo "ADD THIS AS A DEPLOY KEY IN GITHUB REPO:"
    echo "(Settings > Deploy keys > Add deploy key)"
    echo "========================================"
    cat ~/.ssh/github_deploy.pub
    echo "========================================"
    echo ""
    read -p "Press Enter after adding the deploy key to GitHub..."
else
    echo "  Deploy key already exists, skipping."
fi

# Step 3: Configure SSH for GitHub
echo "[3/8] Configuring SSH for GitHub..."
if ! grep -q "github_deploy" ~/.ssh/config 2>/dev/null; then
    cat >> ~/.ssh/config <<'SSHEOF'

Host github.com
  IdentityFile ~/.ssh/github_deploy
  StrictHostKeyChecking no
SSHEOF
    chmod 600 ~/.ssh/config
    echo "  SSH config updated."
else
    echo "  SSH config already has github_deploy entry, skipping."
fi

# Step 4: Clone the repo
echo "[4/8] Cloning repository..."
if [ -d "$APP_DIR" ]; then
    echo "  $APP_DIR already exists. Pulling latest..."
    cd "$APP_DIR"
    git pull origin main
else
    cd ~
    git clone "$REPO_URL" ticketops-app
    cd "$APP_DIR"
fi

# Step 5: Copy .env from old deployment
echo "[5/8] Setting up backend .env..."
if [ ! -f "$APP_DIR/backend-express/.env" ]; then
    if [ -f ~/ticketops/.env ]; then
        cp ~/ticketops/.env "$APP_DIR/backend-express/.env"
        echo "  Copied .env from ~/ticketops/"
    else
        echo "  WARNING: No existing .env found at ~/ticketops/.env"
        echo "  You'll need to create $APP_DIR/backend-express/.env manually."
    fi
else
    echo "  .env already exists, skipping."
fi

# Step 6: Fix MongoDB URI for Docker networking
echo "[6/8] Fixing MongoDB URI for Docker..."
if [ -f "$APP_DIR/backend-express/.env" ]; then
    if grep -q "mongodb://localhost" "$APP_DIR/backend-express/.env"; then
        sed -i 's|mongodb://localhost|mongodb://host.docker.internal|g' "$APP_DIR/backend-express/.env"
        echo "  Updated MongoDB URI to use host.docker.internal"
    else
        echo "  MongoDB URI already configured for Docker, skipping."
    fi
fi

# Step 7: Configure MongoDB to accept Docker connections
echo "[7/8] Configuring MongoDB for Docker access..."
if [ -f /etc/mongod.conf ]; then
    if grep -q "172.17.0.1" /etc/mongod.conf; then
        echo "  MongoDB already configured for Docker subnet."
    else
        echo "  Adding Docker bridge IP (172.17.0.1) to MongoDB bindIp..."
        sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 127.0.0.1,172.17.0.1/' /etc/mongod.conf
        sudo systemctl restart mongod
        echo "  MongoDB restarted with updated bindIp."
    fi
else
    echo "  WARNING: /etc/mongod.conf not found. MongoDB may need manual configuration."
fi

# Step 8: Stop old deployment and start new one
echo "[8/8] Starting Docker deployment..."
echo ""
echo "Checking for existing services..."
if command -v pm2 &>/dev/null; then
    echo "  PM2 processes:"
    pm2 list 2>/dev/null || true
fi
echo "  Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
echo ""

read -p "Stop old services and start Docker deployment? (y/n): " CONFIRM
if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
    # Stop old PM2 processes if any
    if command -v pm2 &>/dev/null; then
        pm2 stop all 2>/dev/null || true
    fi

    # Stop old docker containers if any
    cd ~/ticketops 2>/dev/null && docker compose down 2>/dev/null || true
    cd ~/ticketops-frontend 2>/dev/null && docker compose down 2>/dev/null || true

    # Start new deployment
    cd "$APP_DIR"
    docker compose up -d --build

    echo ""
    echo "=== Deployment Status ==="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    # Health check
    sleep 5
    echo "Health check..."
    curl -s -o /dev/null -w "Backend: HTTP %{http_code}\n" http://localhost:3000/api/health 2>/dev/null || echo "Backend: not responding yet (may still be starting)"
    curl -s -o /dev/null -w "Frontend: HTTP %{http_code}\n" http://localhost:80 2>/dev/null || echo "Frontend: not responding yet"
    echo ""
    echo "=== Setup Complete ==="
else
    echo "Skipped. Run 'cd $APP_DIR && docker compose up -d --build' when ready."
fi

echo ""
echo "REMINDER: Rotate these secrets (they were exposed):"
echo "  - JWT_SECRET and JWT_REFRESH_SECRET"
echo "  - ENCRYPTION_KEY (run 'npm run migrate:encrypt' after changing)"
echo "  - SMTP_PASS"
echo "  - CLOUDINARY_API_SECRET"
echo "  - SURVEY_API_KEY"
