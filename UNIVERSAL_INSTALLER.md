# Universal DWS Agent Installer

## 🎯 Overview

**ONE installer for ALL Windows systems!**

The universal installer automatically:
- ✅ Detects CPU architecture (AMD64, 386, ARM64)
- ✅ Downloads the correct agent version
- ✅ Installs as Windows Service
- ✅ Configures auto-start
- ✅ Starts the service

## 📦 What You Get

**Single File Distribution:**
- `dws-installer.exe` (5.29 MB) - Works on ALL Windows systems
- `dws-uninstaller.exe` (2.00 MB) - Universal uninstaller

## 🔧 How It Works

### Architecture Detection

The installer uses Windows API to detect the actual CPU architecture:

```
User System          Installer Detects       Downloads
─────────────────    ───────────────────     ──────────────────────
Windows 10 64-bit  → AMD64 (64-bit)      →  dws-agent-amd64.exe
Windows 7 32-bit   → 386 (32-bit)        →  dws-agent-386.exe
Surface Pro X      → ARM64               →  dws-agent-arm64.exe
```

### Installation Flow

```
1. User runs dws-installer.exe
   ↓
2. Check Administrator privileges
   ↓
3. Detect system architecture via Windows API
   ↓
4. Display detected architecture to user
   ↓
5. Download agent from:
   https://dws.daucu.com/agents/dws-agent-{arch}.exe
   ↓
6. Install to: C:\Program Files\RemoteAdmin\
   ↓
7. Register Windows Service: "RemoteAdminAgent"
   ↓
8. Configure auto-start + recovery
   ↓
9. Start service
   ↓
10. Success! Device connects to dashboard
```

## 🚀 Distribution

### Simple Distribution
Just share **ONE file**: `dws-installer.exe`

**Works on:**
- ✅ Windows 7 SP1 (32-bit & 64-bit)
- ✅ Windows 8/8.1 (32-bit & 64-bit)
- ✅ Windows 10 (32-bit, 64-bit, ARM64)
- ✅ Windows 11 (64-bit, ARM64)
- ✅ Windows Server 2008 R2 and later

### Distribution Methods

#### Method 1: Direct Download
Host on your website:
```html
<a href="https://dws.daucu.com/download/dws-installer.exe">
  Download Agent Installer
</a>
```

#### Method 2: Email
Attach `dws-installer.exe` to email with instructions

#### Method 3: USB Drive
Copy installer to USB, distribute physically

#### Method 4: Network Share
```batch
\\server\share\dws-installer.exe
```

#### Method 5: Silent Deployment
```batch
REM Deploy via Group Policy, SCCM, Intune, etc.
dws-installer.exe /S
```

## 📋 User Instructions

### Simple Instructions

**"Install Remote Management Agent"**

1. Download `dws-installer.exe`
2. Right-click → "Run as Administrator"
3. Follow the prompts
4. Done!

### Detailed Instructions

**Step 1: Download**
- Download the installer from [your link]
- Save to Downloads folder
- File size: ~5 MB

**Step 2: Run as Administrator**
- Right-click on `dws-installer.exe`
- Select "Run as Administrator"
- Click "Yes" when Windows asks for permission

**Step 3: Installation**
The installer will:
- Show your system type (64-bit, 32-bit, or ARM64)
- Download the matching agent (~10 MB)
- Install it automatically
- Takes about 30-60 seconds

**Step 4: Verify**
- Press `Win + R`
- Type `services.msc` and press Enter
- Look for "Remote Admin Agent"
- Status should show "Running"

## 🔍 Technical Details

### Architecture Detection Code

The installer uses Windows native API:

```go
// Get system architecture (not installer architecture)
var si systemInfo
GetNativeSystemInfo(&si)

switch si.wProcessorArchitecture {
    case PROCESSOR_ARCHITECTURE_AMD64:  // 9
        return "amd64"
    case PROCESSOR_ARCHITECTURE_ARM64:  // 12
        return "arm64"
    case PROCESSOR_ARCHITECTURE_INTEL:  // 0
        return "386"
}
```

This ensures correct detection even when:
- 32-bit installer runs on 64-bit Windows (WOW64)
- 64-bit installer runs via emulation
- Running on ARM64 with x86/x64 emulation

### Download URLs

Based on detected architecture:
- AMD64: `https://dws.daucu.com/agents/dws-agent-amd64.exe`
- 386: `https://dws.daucu.com/agents/dws-agent-386.exe`
- ARM64: `https://dws.daucu.com/agents/dws-agent-arm64.exe`

### Service Configuration

- **Service Name**: RemoteAdminAgent
- **Display Name**: Remote Admin Agent
- **Start Type**: Automatic
- **Recovery**: Restart on failure (3 attempts)
- **Account**: Local System

### Installation Paths

- **Install Dir**: `C:\Program Files\RemoteAdmin\`
- **Executable**: `C:\Program Files\RemoteAdmin\dws-agent.exe`
- **Service**: `RemoteAdminAgent`

## 🧪 Testing

### Test on Different Systems

**Test Matrix:**

| System | Architecture | Expected Download |
|--------|--------------|-------------------|
| Windows 10 x64 | AMD64 | dws-agent-amd64.exe |
| Windows 7 x86 | 386 | dws-agent-386.exe |
| Surface Pro X | ARM64 | dws-agent-arm64.exe |
| Windows 11 x64 | AMD64 | dws-agent-amd64.exe |

### Verification Steps

1. Run installer as Administrator
2. Check console output shows correct architecture
3. Verify correct agent is downloaded
4. Check service is installed: `sc query RemoteAdminAgent`
5. Verify service is running
6. Check device appears on dashboard

### Manual Testing

```powershell
# Check what architecture Windows reports
wmic os get osarchitecture
# Output: 64-bit or 32-bit

# Check CPU architecture
echo %PROCESSOR_ARCHITECTURE%
# Output: AMD64, x86, or ARM64

# After installation, verify service
sc query RemoteAdminAgent
Get-Service RemoteAdminAgent
```

## 🔧 Troubleshooting

### Installer Shows Wrong Architecture

**Rare Issue**: If detection fails
- Installer falls back to environment variables
- Finally defaults to AMD64 (safest)

**Manual Check:**
```batch
echo %PROCESSOR_ARCHITECTURE%
echo %PROCESSOR_ARCHITEW6432%
```

### Download Fails

**Error**: "Download failed"

**Causes:**
1. Agent files not uploaded to server
2. Incorrect URL in installer
3. Network/firewall blocking download

**Fix:**
```bash
# Verify agent files are accessible
curl -I https://dws.daucu.com/agents/dws-agent-amd64.exe
# Should return: HTTP/2 200

# Upload if missing
cd bin/agents
scp dws-agent-*.exe user@server:/var/www/dws-agents/
```

### Windows SmartScreen Warning

**Warning**: "Windows protected your PC"

**Cause**: Unsigned executable

**Fix for Users:**
- Click "More info"
- Click "Run anyway"

**Better Fix**:
- Code-sign the installer with a certificate
- Builds trust, removes warnings

### Service Won't Start

**Check Event Viewer:**
```
Event Viewer → Windows Logs → Application
Filter by: "RemoteAdminAgent"
```

**Common Causes:**
- Server not accessible
- Firewall blocking WSS (port 443)
- Antivirus quarantined agent

**Test Connection:**
```powershell
Test-NetConnection dws-parth.daucu.com -Port 443
```

## 📊 Monitoring

### Installation Success Rate

Track via:
- Server logs (new device connections)
- Dashboard device count
- Installation tickets/support requests

### Common Installation Patterns

**Successful Installation:**
```
1. Installer runs as Admin ✓
2. Architecture detected: AMD64 ✓
3. Download complete ✓
4. Service installed ✓
5. Service started ✓
6. Device connects within 10 seconds ✓
```

**Failed Installation:**
```
1. Installer runs without Admin ✗
   → Show error, request elevation
   
2. Download fails ✗
   → Check server, verify URL
   
3. Service won't start ✗
   → Check firewall, antivirus
```

## 🔐 Security

### Code Signing (Recommended)

Sign your installer to prevent warnings:

```powershell
# Get a code signing certificate
# Then sign the installer
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com /td sha256 /fd sha256 dws-installer.exe
```

### Antivirus Considerations

**False Positives**: Remote management tools often trigger antivirus

**Mitigation:**
- Code sign your executable
- Submit to antivirus vendors for whitelisting
- Provide hash/signature for verification
- Use established distributor (Windows Store, etc.)

### User Trust

Build trust by:
- Using HTTPS for downloads
- Code signing executables
- Clear privacy policy
- Transparent about what the agent does
- Easy uninstallation

## 📈 Advanced Features

### Silent Installation

For enterprise deployment:

```batch
REM Silent install (no user interaction)
dws-installer.exe /S

REM Silent uninstall
dws-uninstaller.exe /S
```

### Custom Configuration

Modify installer source to customize:

```go
const (
    DOWNLOAD_BASE_URL = "https://your-server.com/agents"
    SERVICE_NAME      = "YourServiceName"
    INSTALL_DIR       = "C:\\Program Files\\YourApp"
    EXE_NAME          = "your-agent.exe"
)
```

Then rebuild:
```batch
build-universal.bat
```

### MSI Packaging

Create MSI installer using WiX Toolset:

```xml
<?xml version="1.0"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*" Name="DWS Agent" Version="1.0.0" 
           Manufacturer="Your Company" Language="1033">
    <Package InstallerVersion="200" Compressed="yes"/>
    <Media Id="1" Cabinet="agent.cab" EmbedCab="yes"/>
    
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFilesFolder">
        <Directory Id="INSTALLDIR" Name="RemoteAdmin">
          <Component Id="Installer" Guid="*">
            <File Source="dws-installer.exe" KeyPath="yes"/>
          </Component>
        </Directory>
      </Directory>
    </Directory>
    
    <Feature Id="Complete" Level="1">
      <ComponentRef Id="Installer"/>
    </Feature>
    
    <CustomAction Id="RunInstaller" 
                  FileKey="dws-installer.exe" 
                  Execute="deferred"
                  Impersonate="no"/>
  </Product>
</Wix>
```

## 📚 Summary

**You now have:**
- ✅ ONE universal installer (5.29 MB)
- ✅ Works on ALL Windows systems
- ✅ Auto-detects architecture
- ✅ Downloads correct agent
- ✅ Fully automated installation

**Distribution is simple:**
- Share `dws-installer.exe`
- Users run as Administrator
- Everything else is automatic

**No need to:**
- Ask users their system type
- Provide different downloads
- Create separate installers
- Give complex instructions

**It just works! 🎉**
