#!/bin/bash
# Build Remote Admin Agent for Linux/macOS

echo "Building Remote Admin Agent..."
echo ""

# Determine the output name based on OS
OUTPUT="dws-agent"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OUTPUT="dws-agent-macos"
elif [[ "$OSTYPE" == "linux"* ]]; then
    OUTPUT="dws-agent-linux"
fi

# Build with production settings
go build -ldflags="-s -w -X main.PRODUCTION=true" -o "../bin/$OUTPUT" .

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "SUCCESS!"
    echo "========================================"
    echo "Agent built successfully: ../bin/$OUTPUT"
    echo ""
    echo "The agent will run in background mode."
    echo ""
else
    echo ""
    echo "ERROR: Build failed!"
    exit 1
fi
