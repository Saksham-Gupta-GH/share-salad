#!/bin/bash

# Oracle Cloud VM Setup Script for Fileshare App
# Run this script on your Oracle Cloud Compute Instance (Ubuntu)

echo ">>> Updating system..."
sudo apt update && sudo apt upgrade -y

echo ">>> Installing Node.js (v18)..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

echo ">>> Installing Git and PM2..."
sudo apt install -y git
sudo npm install -g pm2

echo ">>> Configuring Firewall (allowing port 5001)..."
# Oracle Cloud Ubuntu images use iptables via netfilter-persistent usually, or ufw
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5001 -j ACCEPT
sudo netfilter-persistent save

echo ">>> Setup Complete!"
echo "Now, follow these steps:"
echo "1. git clone https://github.com/Saksham-Gupta-GH/YOUR-REPO-NAME.git"
echo "2. cd YOUR-REPO-NAME/server"
echo "3. npm install"
echo "4. Create .env file with your MONGODB_URI"
echo "5. pm2 start ecosystem.config.js"
echo "6. pm2 save"
echo "7. pm2 startup"
