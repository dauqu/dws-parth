#!/bin/bash
# Build and run the server hub for Linux/Ubuntu
# This script only builds the hub components, not Windows-specific handlers

echo "🔨 Building Central Server Hub for Linux..."

cd /home/harshaweb/dws-parth/server

# Build only hub and database (platform-independent)
go build -o ../bin/server_hub main_hub.go database.go

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "Starting server hub..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    cd ../bin
    ./server_hub
else
    echo "❌ Build failed!"
    exit 1
fi
