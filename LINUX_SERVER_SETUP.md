# DWS Parth - Linux Server Setup Guide

## Step 1: Clone or Upload the Repository on Ubuntu Server

```bash
cd /home/ubuntu
git clone <your-repo-url> dws-parth
cd dws-parth
```

Or upload your files:
```bash
scp -r /path/to/dws-parth ubuntu@dws-parth.daucu.com:/home/ubuntu/
```

## Step 2: Install Go (if not already installed)

```bash
# Download Go
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz

# Extract and install
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz

# Add to PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verify installation
go version
```

## Step 3: Build the Server on Ubuntu

```bash
cd /home/ubuntu/dws-parth/server

# Build the server
go build -o dws-server .

# Verify the binary was created
ls -lah dws-server
```

## Step 4: Set Up Systemd Service

```bash
# Copy the service file to systemd
sudo cp /home/ubuntu/dws-parth/dws-parth.service /etc/systemd/system/

# Set proper permissions
sudo chown root:root /etc/systemd/system/dws-parth.service
sudo chmod 644 /etc/systemd/system/dws-parth.service

# Reload systemd
sudo systemctl daemon-reload

# Enable and start the service
sudo systemctl enable dws-parth.service
sudo systemctl start dws-parth.service

# Check status
sudo systemctl status dws-parth.service
```

## Step 5: Verify Server is Running

```bash
# Check if server is listening on port 8080
sudo lsof -i :8080
# or
sudo ss -tlnp | grep 8080

# Check service logs
sudo journalctl -u dws-parth.service -n 50 -f
```

## Step 6: Setup Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/dws-parth.daucu.com
```

Paste this content:

```nginx
server {
    listen 80;
    server_name dws-parth.daucu.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

Then:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/dws-parth.daucu.com /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 7: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d dws-parth.daucu.com

# Auto-renewal is set up automatically
sudo systemctl enable certbot.timer
```

## Step 8: Verify Everything is Working

```bash
# Test the server
curl https://dws-parth.daucu.com/api/devices

# Monitor logs
sudo journalctl -u dws-parth.service -f
```

## Useful Systemd Commands

```bash
# Start service
sudo systemctl start dws-parth.service

# Stop service
sudo systemctl stop dws-parth.service

# Restart service
sudo systemctl restart dws-parth.service

# Check status
sudo systemctl status dws-parth.service

# View logs
sudo journalctl -u dws-parth.service -n 100 -f

# Enable auto-start on reboot
sudo systemctl enable dws-parth.service

# Disable auto-start
sudo systemctl disable dws-parth.service
```

## Troubleshooting

**Port already in use:**
```bash
sudo lsof -i :8080
sudo kill -9 <PID>
```

**Permission denied:**
```bash
sudo chown -R ubuntu:ubuntu /home/ubuntu/dws-parth
```

**Service won't start:**
```bash
# Check for errors
sudo systemctl status dws-parth.service
sudo journalctl -u dws-parth.service -n 50
```

## MongoDB Setup (if needed)

If using MongoDB for persistence, ensure it's running:
```bash
sudo systemctl status mongod
sudo systemctl enable mongod
```
