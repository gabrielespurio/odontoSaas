#!/bin/bash
# Deploy configuration script for OdontoSync

echo "🚀 OdontoSync Deploy Configuration"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist/public" ]; then
    echo "❌ Build failed: dist/public directory not found"
    exit 1
fi

# Check if JavaScript file exists
JS_FILE=$(find dist/public/assets -name "*.js" | head -1)
if [ -z "$JS_FILE" ]; then
    echo "❌ No JavaScript files found in build"
    exit 1
fi

echo "✅ JavaScript file found: $(basename $JS_FILE)"

# Verify the JavaScript file is valid
if head -1 "$JS_FILE" | grep -q "<!DOCTYPE"; then
    echo "❌ JavaScript file is corrupted (contains HTML)"
    exit 1
fi

echo "✅ JavaScript file is valid"

# Set up production server
echo "⚙️  Setting up production server..."

# Copy production package.json if needed
if [ -f "package-production.json" ]; then
    echo "📋 Using production package.json"
    cp package-production.json package.json
fi

# Install production dependencies
echo "📥 Installing production dependencies..."
npm ci --only=production

echo ""
echo "✅ Deploy configuration complete!"
echo ""
echo "📋 Next steps for your server:"
echo "1. Upload all files to your server"
echo "2. Run: npm install"
echo "3. Run: npm start"
echo "4. Your app will be available on port 5000"
echo ""
echo "🔧 Server configuration:"
echo "- Main file: server.js"
echo "- Static files: dist/public/"
echo "- JavaScript assets: dist/public/assets/"
echo "- Port: 5000 (configurable with PORT env var)"
echo ""
echo "🐛 Debug commands:"
echo "- Check health: curl http://your-server:5000/health"
echo "- Check JS file: curl -I http://your-server:5000/assets/$(basename $JS_FILE)"
echo ""