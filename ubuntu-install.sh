#!/bin/bash
# Quick fix script for Ubuntu - Run this on your Ubuntu server

echo "🔧 Setting up Remote Admin Server on Ubuntu..."
echo ""

# Go to server directory
cd /home/harshaweb/dws-parth/server || { echo "Directory not found!"; exit 1; }

echo "📦 Installing dependencies..."
go mod tidy

echo ""
echo "🔨 Building server hub (Linux)..."
echo "Building ONLY: main_hub.go database.go"
echo ""

# Build only the platform-independent files
go build -o ../bin/server_hub main_hub.go database.go

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ BUILD SUCCESSFUL!"
    echo ""
    echo "Starting server..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd ../bin || exit 1
    
    # Run the server
    ./server_hub
else
    echo ""
    echo "❌ BUILD FAILED!"
    echo ""
    echo "If you see Windows package errors, make sure you're in the correct directory:"
    echo "  cd /home/harshaweb/dws-parth/server"
    echo ""
    echo "Then run:"
    echo "  go build -o ../bin/server_hub main_hub.go database.go"
    exit 1
fi
