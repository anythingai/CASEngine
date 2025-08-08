#!/bin/bash

# Cultural Arbitrage - Deployment Verification Script
# Tests all API endpoints and frontend functionality

set -e

# Default URL (can be overridden by command line argument)
BASE_URL=${1:-"http://localhost:8000"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local timeout="${4:-10}"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    echo -n "Testing $name... "
    
    if response=$(curl -s -w "%{http_code}" -m $timeout "$url" 2>/dev/null); then
        status_code="${response: -3}"
        response_body="${response%???}"
        
        if [ "$status_code" = "$expected_status" ]; then
            log_success "$name ($status_code)"
            return 0
        else
            log_fail "$name (expected $expected_status, got $status_code)"
            return 1
        fi
    else
        log_fail "$name (connection failed)"
        return 1
    fi
}

# Test JSON endpoint with content validation
test_json_endpoint() {
    local name="$1"
    local url="$2"
    local expected_field="$3"
    local timeout="${4:-10}"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    echo -n "Testing $name... "
    
    if response=$(curl -s -m $timeout "$url" 2>/dev/null); then
        if echo "$response" | grep -q "$expected_field"; then
            log_success "$name (contains $expected_field)"
            return 0
        else
            log_fail "$name (missing $expected_field)"
            echo "Response: $response" | head -c 200
            return 1
        fi
    else
        log_fail "$name (connection failed)"
        return 1
    fi
}

# Helper: POST JSON endpoint with content validation
test_post_json_endpoint() {
    local name="$1"
    local url="$2"
    local json="$3"
    local expected_field="$4"
    local timeout="${5:-30}"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -n "Testing $name... "
    if response=$(curl -s -m $timeout -H "Content-Type: application/json" -d "$json" "$url" 2>/dev/null); then
        if echo "$response" | grep -q "$expected_field"; then
            log_success "$name (contains $expected_field)"
            return 0
        else
            log_fail "$name (missing $expected_field)"
            echo "Response: $response" | head -c 200
            return 1
        fi
    else
        log_fail "$name (connection failed)"
        return 1
    fi
}

echo "🚀 Cultural Arbitrage Deployment Verification"
echo "🌐 Testing URL: $BASE_URL"
echo "⏰ Timestamp: $(date)"
echo ""

# Wait for service to be ready
log_info "⏳ Waiting for service to be ready..."
sleep 5

# Basic connectivity test
log_info "🔌 Testing Basic Connectivity"
test_endpoint "Basic Connectivity" "$BASE_URL" "200" 30

# Health check endpoint
log_info "🏥 Testing Health Check"
test_json_endpoint "Health Check" "$BASE_URL/health" "status" 15

# API endpoints
log_info "🔌 Testing API Endpoints"
test_json_endpoint "API Base" "$BASE_URL/api" "Cultural Arbitrage" 15

# Test search endpoint (main functionality)
log_info "🔍 Testing Search Functionality"
search_url="$BASE_URL/api/search"
# CORS preflight (OPTIONS) for POST /api/search
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo -n "Testing Search Endpoint (CORS Preflight)... "
preflight_status=$(curl -s -o /dev/null -w "%{http_code}" -m 20 -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  "$search_url" 2>/dev/null)
if [ "$preflight_status" = "204" ] || [ "$preflight_status" = "200" ]; then
  log_success "Search Endpoint (CORS Preflight) ($preflight_status)"
else
  log_fail "Search Endpoint (CORS Preflight) (expected 204/200, got $preflight_status)"
fi
test_post_json_endpoint "Search Endpoint (POST)" "$search_url" '{"vibe":"solarpunk"}' "recommendations" 45

# Test monitoring endpoints
log_info "📊 Testing Monitoring Endpoints"
test_json_endpoint "Monitoring Endpoints Summary" "$BASE_URL/status/endpoints" "totalEndpoints" 15
test_json_endpoint "Readiness Probe" "$BASE_URL/ready" "ready" 15
test_json_endpoint "Liveness Probe" "$BASE_URL/live" "alive" 15

# Test static assets
log_info "🎨 Testing Static Assets"
# Accept 200 or 302 for favicon (some platforms redirect when no .ico exists)
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo -n "Testing Favicon... "
favicon_status=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$BASE_URL/favicon.ico")
if [ "$favicon_status" = "200" ] || [ "$favicon_status" = "302" ]; then
    log_success "Favicon ($favicon_status)"
else
    log_fail "Favicon (expected 200/302, got $favicon_status)"
fi
test_endpoint "Logo" "$BASE_URL/logo.png" "200" 10

# Frontend accessibility test
log_info "🌐 Testing Frontend"
if response=$(curl -s -m 15 "$BASE_URL" 2>/dev/null); then
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    if echo "$response" | grep -q "Cultural Arbitrage"; then
        log_success "Frontend loads (contains 'Cultural Arbitrage')"
    else
        log_fail "Frontend missing expected content"
    fi
else
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_fail "Frontend (connection failed)"
fi

# Advanced API tests
log_info "🧪 Testing Advanced API Features"

# Test CORS headers (use actual site origin for accurate allow-list check)
ORIGIN="$BASE_URL"
if curl -s -I -H "Origin: $ORIGIN" "$BASE_URL/api" 2>/dev/null | grep -qi "Access-Control-Allow-Origin"; then
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_success "CORS Headers Present"
else
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_fail "CORS Headers Missing"
fi

# Test compression
if curl -s -H "Accept-Encoding: gzip" -I "$BASE_URL" 2>/dev/null | grep -q "Content-Encoding"; then
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_success "Compression Enabled"
else
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_warning "Compression Not Detected (may be normal)"
fi

# Test security headers (case-insensitive match)
log_info "🔒 Testing Security Headers"
if curl -s -I "$BASE_URL" 2>/dev/null | grep -qi "X-Frame-Options\|X-Content-Type-Options"; then
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_success "Security Headers Present"
else
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_fail "Security Headers Missing"
fi

# Performance test
log_info "⚡ Testing Performance"
start_time=$(date +%s%N)
if curl -s -m 5 "$BASE_URL/health" > /dev/null 2>&1; then
    end_time=$(date +%s%N)
    duration=$(((end_time - start_time) / 1000000))  # Convert to milliseconds
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if [ $duration -lt 2000 ]; then
        log_success "Response Time ($duration ms)"
    else
        log_warning "Slow Response Time ($duration ms)"
    fi
else
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_fail "Performance Test (timeout)"
fi

# Web3/API Integration tests
log_info "🌐 Testing Web3 Integrations"

# Test if API keys are configured (indirectly through health status)
if health_response=$(curl -s "$BASE_URL/health" 2>/dev/null); then
    if echo "$health_response" | grep -q '"status":"ok"'; then
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        log_success "API Integration Health"
    else
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        log_fail "API Integration Health"
    fi
fi

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo "Total Tests: $TESTS_TOTAL"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo "Success Rate: $(( (TESTS_PASSED * 100) / TESTS_TOTAL ))%"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    log_success "🎉 All tests passed! Deployment is healthy."
    echo ""
    log_info "🔗 Application URLs:"
    log_info "   - Frontend: $BASE_URL"
    log_info "   - Health Check: $BASE_URL/health"
    log_info "   - API: $BASE_URL/api"
    log_info "   - Search: $BASE_URL/api/search"
    
    echo ""
    log_info "📱 Next Steps:"
    log_info "   1. Test the frontend interface manually"
    log_info "   2. Try searching for cultural trends"
    log_info "   3. Monitor logs for any issues"
    log_info "   4. Set up monitoring/alerting if needed"
    
    exit 0
else
    echo ""
    log_fail "❌ Some tests failed. Please check the deployment."
    
    echo ""
    log_info "🔧 Troubleshooting:"
    log_info "   1. Check application logs"
    log_info "   2. Verify environment variables are set"
    log_info "   3. Ensure all API keys are configured"
    log_info "   4. Check Azure App Service status"
    
    if [ "$BASE_URL" != "http://localhost:8000" ]; then
        log_info "   5. For Azure: az webapp log tail --name <app-name> --resource-group <resource-group>"
    else
        log_info "   5. For local: docker-compose -f docker-compose.prod.yml logs"
    fi
    
    exit 1
fi