# DWS Agent - Complete Deployment Guide

## 📦 What You Have Built

### Agents (for target systems)
- ✅ `dws-agent-amd64.exe` - 9.94 MB (64-bit Intel/AMD)
- ✅ `dws-agent-386.exe` - 9.44 MB (32-bit Intel/AMD)
- ✅ `dws-agent-arm64.exe` - 9.23 MB (ARM64 Windows)

### Installers (for distribution)
- ✅ `dws-installer-amd64.exe` - 5.53 MB
- ✅ `dws-installer-386.exe` - 5.30 MB
- ✅ `dws-installer-arm64.exe` - 5.18 MB

### Uninstallers
- ✅ `dws-uninstaller-amd64.exe` - 2.10 MB
- ✅ `dws-uninstaller-386.exe` - 1.97 MB
- ✅ `dws-uninstaller-arm64.exe` - 2.05 MB

## 🚀 Deployment Steps

### Step 1: Upload Agents to Your Server

You need to upload the agent files to: `https://dws.daucu.com/agents/`

#### Option A: Using SCP (from Windows)
```powershell
# Navigate to agents directory
cd "C:\Users\Harsh singh\Documents\go\dws-parth\bin\agents"

# Upload to server (replace 'ubuntu' and 'dws-parth.daucu.com' with your details)
scp dws-agent-*.exe ubuntu@dws-parth.daucu.com:/tmp/

# On the server, move files to web directory
# SSH to your server and run:
sudo mkdir -p /var/www/dws-agents
sudo mv /tmp/dws-agent-*.exe /var/www/dws-agents/
sudo chmod 644 /var/www/dws-agents/*.exe
sudo chown www-data:www-data /var/www/dws-agents/*.exe
```

#### Option B: Using WinSCP or FileZilla
1. Connect to your server using SFTP
2. Upload files from `bin\agents\` to `/var/www/dws-agents/`
3. Set permissions: 644
4. Set owner: www-data

### Step 2: Configure Nginx

SSH to your server and edit nginx config:

```bash
sudo nano /etc/nginx/sites-available/dws-parth.daucu.com
```

Add this location block:

```nginx
server {
    listen 443 ssl;
    server_name dws-parth.daucu.com;

    # Existing location for main app
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # NEW: Agent download location
    location /agents/ {
        alias /var/www/dws-agents/;
        autoindex off;
        
        # Force download
        add_header Content-Disposition 'attachment';
        
        # CORS for downloads
        add_header Access-Control-Allow-Origin *;
        
        # Cache for 1 hour
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    ssl_certificate /etc/letsencrypt/live/dws-parth.daucu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dws-parth.daucu.com/privkey.pem;
}
```

Test and reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Verify Agent Download URLs

Test that agents are accessible:

```bash
# From your Windows PC or server
curl -I https://dws.daucu.com/agents/dws-agent-amd64.exe
curl -I https://dws.daucu.com/agents/dws-agent-386.exe
curl -I https://dws.daucu.com/agents/dws-agent-arm64.exe
```

You should get `HTTP/2 200` responses.

### Step 4: Test the Installer

1. Copy `dws-installer-amd64.exe` to a test Windows machine
2. Right-click → "Run as Administrator"
3. Watch it:
   - Detect architecture
   - Download agent from your server
   - Install as service
   - Start the service
4. Check your dashboard - the device should appear

### Step 5: Distribute to Users

#### For Most Users (recommended)
Distribute: `dws-installer-amd64.exe`
- Works on 95%+ of Windows 10/11 systems

#### For All Systems (complete coverage)
Provide all three installers:
- **dws-installer-amd64.exe** - 64-bit systems
- **dws-installer-386.exe** - 32-bit/older systems
- **dws-installer-arm64.exe** - ARM Windows

#### Distribution Methods

1. **Direct Download**
   - Host on your website
   - Share download link

2. **Email Distribution**
   - Attach installer to email
   - Include instructions

3. **USB Drive**
   - Copy installer to USB
   - Distribute physically

4. **Network Share**
   - Place on shared network drive
   - Users run from network

5. **Software Deployment**
   - Use SCCM, Intune, or Group Policy
   - Deploy silently: `dws-installer.exe /S`

## 📋 Installation Instructions for Users

### Simple Instructions

1. Download `dws-installer.exe`
2. Right-click → "Run as Administrator"
3. Follow the prompts
4. Done! The agent is now installed and running

### Detailed Instructions

**Step 1: Download**
- Get the installer from [your download link]
- Save it to your Downloads folder

**Step 2: Run as Administrator**
- Right-click on `dws-installer.exe`
- Select "Run as Administrator"
- Click "Yes" when Windows asks for permission

**Step 3: Installation**
- The installer will:
  - Detect your system type
  - Download the agent (9-10 MB)
  - Install it as a Windows Service
  - Start the service automatically
- This takes about 30 seconds

**Step 4: Verify**
- Check Services (press Win+R, type `services.msc`)
- Look for "Remote Admin Agent"
- Status should be "Running"

## 🔧 Troubleshooting

### Installer says "Download failed"
- **Cause**: Agent files not uploaded to server
- **Fix**: Complete Step 1 (upload agents to server)
- **Verify**: Visit `https://dws.daucu.com/agents/dws-agent-amd64.exe` in browser

### Windows Defender blocks the installer
- **Cause**: Unsigned executable
- **Fix**: Click "More info" → "Run anyway"
- **Better**: Code-sign your executables (requires certificate)

### Service won't start
- **Check**: Windows Event Viewer for errors
- **Verify**: Server is running and accessible
- **Test**: `Test-NetConnection dws-parth.daucu.com -Port 443`

### Can't run as Administrator
- **Fix**: Right-click → "Run as Administrator"
- **Or**: Hold Ctrl+Shift while opening

### Firewall blocking connection
- **Windows Firewall**: Should auto-allow
- **Corporate Firewall**: May need to allow outbound WSS (port 443)
- **Check**: `Test-NetConnection dws-parth.daucu.com -Port 443`

## 🔐 Security Best Practices

1. **Code Signing** (recommended)
   - Sign your executables with a code signing certificate
   - Prevents Windows SmartScreen warnings
   - Builds user trust

2. **HTTPS Only**
   - Always use `wss://` (secure WebSocket)
   - Never use `ws://` in production

3. **Access Control**
   - Implement authentication on your server
   - Use API keys or tokens
   - Monitor connected devices

4. **Updates**
   - Plan for agent updates
   - Consider auto-update mechanism
   - Version your agents

## 📊 Monitoring

### Check Connected Devices

On your dashboard:
- Go to Devices list
- Look for newly connected devices
- Verify device information

### Server Logs

SSH to server:
```bash
# View server logs
sudo journalctl -u dws-parth -f

# Check nginx access logs
sudo tail -f /var/log/nginx/access.log | grep agents
```

### Windows Event Logs

On client machines:
- Open Event Viewer
- Windows Logs → Application
- Filter by source: "Remote Admin Agent"

## 🎯 Quick Start Summary

```powershell
# 1. Upload agents to server (one-time)
scp bin/agents/dws-agent-*.exe user@server:/var/www/dws-agents/

# 2. Configure nginx (one-time)
# Add /agents/ location block to nginx config

# 3. Test download
curl -I https://dws.daucu.com/agents/dws-agent-amd64.exe

# 4. Distribute installer
# Give users: bin/installers/dws-installer-amd64.exe

# 5. Monitor connections
# Check your dashboard at https://dws-parth.daucu.com
```

## 📚 File Locations

### On Windows Clients (after installation)
- **Install Dir**: `C:\Program Files\RemoteAdmin\`
- **Agent**: `C:\Program Files\RemoteAdmin\dws-agent.exe`
- **Service Name**: `RemoteAdminAgent`
- **Logs**: Windows Event Viewer

### On Your Server
- **Agents**: `/var/www/dws-agents/`
- **Nginx Config**: `/etc/nginx/sites-available/dws-parth.daucu.com`
- **Server Binary**: `/home/harshaweb/dws-parth/bin/server_hub`

### Build Output (on your PC)
- **Agents**: `C:\Users\Harsh singh\Documents\go\dws-parth\bin\agents\`
- **Installers**: `C:\Users\Harsh singh\Documents\go\dws-parth\bin\installers\`

## 🆘 Support

### For Users
Create a support page with:
- Installation instructions
- System requirements
- Troubleshooting guide
- Contact information

### For You
- Monitor server logs
- Check device connections
- Review error reports
- Update agents as needed

---

**Version**: 1.0.0  
**Last Updated**: January 13, 2026  
**Server**: wss://dws-parth.daucu.com
