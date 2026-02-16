#!/bin/bash
# SARJ Worldwide - Hostinger VPS Deployment Script
# Run this script on your VPS after uploading the project files

set -e

APP_DIR="/var/www/sarjworldwide"
DOMAIN="sarjworldwide.ca"

echo "========================================="
echo "  SARJ Worldwide - VPS Deployment"
echo "========================================="

# Step 1: Install Node.js 20 LTS
echo ""
echo "[1/8] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Step 2: Install PM2 globally
echo ""
echo "[2/8] Installing PM2..."
sudo npm install -g pm2

# Step 3: Install Nginx
echo ""
echo "[3/8] Installing Nginx..."
sudo apt-get update
sudo apt-get install -y nginx

# Step 4: Set up project directory
echo ""
echo "[4/8] Setting up project directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Step 5: Install dependencies and build
echo ""
echo "[5/8] Installing dependencies..."
cd $APP_DIR
npm install --production=false

echo ""
echo "[6/8] Building Next.js app..."
npm run build

# Step 7: Set up Nginx
echo ""
echo "[7/8] Configuring Nginx..."
sudo cp $APP_DIR/nginx-sarjworldwide.conf /etc/nginx/sites-available/sarjworldwide
sudo ln -sf /etc/nginx/sites-available/sarjworldwide /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Step 8: Start with PM2
echo ""
echo "[8/8] Starting app with PM2..."
cd $APP_DIR
pm2 delete sarj-worldwide 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER

echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Point your domain DNS A record to this VPS IP"
echo "  2. Run: sudo certbot --nginx -d sarjworldwide.ca -d www.sarjworldwide.ca"
echo "  3. Test: https://sarjworldwide.ca"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs            - View app logs"
echo "  pm2 restart all     - Restart app"
echo "  pm2 monit           - Monitor resources"
echo ""
