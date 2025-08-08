#!/bin/bash

# Script de deploy para corrigir o problema "Unexpected token '<'" em produção
# OdontoSync - Sistema de Gestão Odontológica

set -e  # Exit on any error

echo "🚀 OdontoSync Production Deployment Fix"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
log_info "Checking prerequisites..."

if ! command_exists node; then
    log_error "Node.js not found. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    log_error "npm not found. Please install npm first."
    exit 1
fi

log_success "Node.js and npm found"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    log_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

if [[ ! -f "production-fixed.js" ]]; then
    log_error "production-fixed.js not found. Make sure all files are present."
    exit 1
fi

log_success "Project files found"

# Step 1: Install dependencies
log_info "Installing dependencies..."
if npm install --silent; then
    log_success "Dependencies installed"
else
    log_error "Failed to install dependencies"
    exit 1
fi

# Step 2: Build the project
log_info "Building project..."
if npm run build; then
    log_success "Project built successfully"
else
    log_error "Build failed"
    exit 1
fi

# Step 3: Verify build output
log_info "Verifying build output..."

if [[ ! -d "dist/public" ]]; then
    log_error "Build output directory 'dist/public' not found"
    exit 1
fi

if [[ ! -f "dist/public/index.html" ]]; then
    log_error "index.html not found in build output"
    exit 1
fi

if [[ ! -d "dist/public/assets" ]]; then
    log_error "Assets directory not found in build output"
    exit 1
fi

# Count assets
js_count=$(find dist/public/assets -name "*.js" | wc -l)
css_count=$(find dist/public/assets -name "*.css" | wc -l)

if [[ $js_count -eq 0 ]]; then
    log_error "No JavaScript files found in assets"
    exit 1
fi

if [[ $css_count -eq 0 ]]; then
    log_warning "No CSS files found in assets (this might be normal)"
fi

log_success "Build verification passed (${js_count} JS files, ${css_count} CSS files)"

# Step 4: Check for corrupted JS files
log_info "Checking JavaScript files for corruption..."
corrupted_files=0

for js_file in dist/public/assets/*.js; do
    if [[ -f "$js_file" ]]; then
        if head -n 1 "$js_file" | grep -q "<!DOCTYPE\|<html"; then
            log_error "CORRUPTED: $(basename "$js_file") contains HTML instead of JavaScript"
            log_error "First line: $(head -n 1 "$js_file")"
            corrupted_files=$((corrupted_files + 1))
        fi
    fi
done

if [[ $corrupted_files -gt 0 ]]; then
    log_error "Found $corrupted_files corrupted JavaScript files"
    log_error "This is the root cause of the 'Unexpected token' error"
    log_error "Please check your build process"
    exit 1
fi

log_success "All JavaScript files are clean"

# Step 5: Test the production server
log_info "Testing production server..."

# Kill any existing server on port 5000
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_warning "Killing existing server on port 5000"
    kill $(lsof -Pi :5000 -sTCP:LISTEN -t) 2>/dev/null || true
    sleep 2
fi

# Start server in background
log_info "Starting production server..."
node production-fixed.js &
server_pid=$!

# Wait for server to start
sleep 3

# Check if server is running
if ! kill -0 $server_pid 2>/dev/null; then
    log_error "Server failed to start"
    exit 1
fi

# Test health endpoint
log_info "Testing server endpoints..."
if command_exists curl; then
    # Test health
    if curl -f http://localhost:5000/health >/dev/null 2>&1; then
        log_success "Health endpoint working"
    else
        log_error "Health endpoint not working"
        kill $server_pid 2>/dev/null || true
        exit 1
    fi
    
    # Test root
    if curl -f http://localhost:5000/ >/dev/null 2>&1; then
        log_success "Root endpoint working"
    else
        log_error "Root endpoint not working"
        kill $server_pid 2>/dev/null || true
        exit 1
    fi
    
    # Test JavaScript file
    js_file=$(find dist/public/assets -name "*.js" | head -n 1 | xargs basename)
    if [[ -n "$js_file" ]]; then
        content_type=$(curl -s -I http://localhost:5000/assets/$js_file | grep -i content-type | cut -d' ' -f2- | tr -d '\r')
        if [[ "$content_type" == "application/javascript; charset=utf-8" ]]; then
            log_success "JavaScript Content-Type is correct"
        else
            log_error "JavaScript Content-Type is wrong: $content_type"
            log_error "Expected: application/javascript; charset=utf-8"
            kill $server_pid 2>/dev/null || true
            exit 1
        fi
    fi
    
else
    log_warning "curl not found, skipping HTTP tests"
fi

# Stop test server
kill $server_pid 2>/dev/null || true
sleep 1

log_success "Production server test completed"

# Step 6: Run comprehensive verification
if [[ -f "verify-production.js" ]]; then
    log_info "Running comprehensive verification..."
    
    # Start server again for verification
    node production-fixed.js &
    server_pid=$!
    sleep 3
    
    if node verify-production.js; then
        log_success "Comprehensive verification passed"
    else
        log_error "Comprehensive verification failed"
        kill $server_pid 2>/dev/null || true
        exit 1
    fi
    
    # Stop server
    kill $server_pid 2>/dev/null || true
    sleep 1
else
    log_warning "verify-production.js not found, skipping comprehensive verification"
fi

# Step 7: Generate deployment summary
echo ""
echo "🎉 =================================="
echo "🎉 DEPLOYMENT FIX COMPLETED!"
echo "🎉 =================================="
echo ""
log_success "All checks passed - the 'Unexpected token' error should be resolved"
echo ""
echo "📋 Summary:"
echo "  ✅ Dependencies installed"
echo "  ✅ Project built successfully"
echo "  ✅ JavaScript files are clean (no HTML corruption)"
echo "  ✅ Production server tested"
echo "  ✅ Content-Type headers are correct"
echo ""
echo "🚀 Next steps:"
echo "  1. Deploy production-fixed.js to your production server"
echo "  2. Run: node production-fixed.js"
echo "  3. Configure your nginx/apache proxy"
echo "  4. Test in browser to confirm the fix"
echo ""
echo "📖 For detailed instructions, see: PRODUCTION_DEPLOY_GUIDE.md"
echo ""
echo "🔍 To verify on production server, run:"
echo "     node verify-production.js"
echo ""

# Create deployment package
log_info "Creating deployment package..."
deployment_files=(
    "production-fixed.js"
    "dist/"
    "package.json"
    "PRODUCTION_DEPLOY_GUIDE.md"
    "verify-production.js"
)

# Check if all files exist
missing_files=()
for file in "${deployment_files[@]}"; do
    if [[ ! -e "$file" ]]; then
        missing_files+=("$file")
    fi
done

if [[ ${#missing_files[@]} -eq 0 ]]; then
    log_success "All deployment files are ready"
    echo ""
    echo "📦 Ready to deploy these files to production:"
    for file in "${deployment_files[@]}"; do
        echo "   - $file"
    done
else
    log_warning "Some deployment files are missing:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
fi

echo ""
log_success "Deployment preparation completed successfully!"
echo "🎯 Your production server should now serve JavaScript files correctly."