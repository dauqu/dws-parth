#!/bin/bash
# Run the central server hub on Linux/Ubuntu

echo "🚀 Starting Remote Admin Central Server Hub..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Build only the hub (not the Windows-specific files)
go build -o server_hub main_hub.go database.go

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful"
echo ""
echo "Starting server..."
echo ""

# Run the server
./server_hub
