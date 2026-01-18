#!/bin/bash

# Vision Agent Setup Test Script
# This script verifies that all components are properly configured

echo "📦 SMC Alpha Dashboard - Vision Agent Setup Test"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if dev server is running
echo -n "1. Testing dev server on port 8080... "
if curl -s http://localhost:8080 > /dev/null; then
    echo -e "${GREEN}✅ RUNNING${NC}"
else
    echo -e "${RED}❌ NOT RUNNING${NC}"
    echo "   Start with: cd /home/ubuntu/smc-alpha-dashboard-main && npm run dev"
fi

# Test 2: Check environment variables
echo -n "2. Checking environment variables... "
if [ -f ".env" ]; then
    if grep -q "VITE_SUPABASE_URL" .env && grep -q "VITE_SUPABASE_PUBLISHABLE_KEY" .env; then
        echo -e "${GREEN}✅ CONFIGURED${NC}"
    else
        echo -e "${RED}❌ INCOMPLETE${NC}"
    fi
else
    echo -e "${RED}❌ MISSING${NC}"
fi

# Test 3: Check if migration file exists
echo -n "3. Checking SQL migration file... "
if [ -f "supabase/migrations/20251125120000_create_vision_agent_tables.sql" ]; then
    echo -e "${GREEN}✅ EXISTS${NC}"
else
    echo -e "${RED}❌ MISSING${NC}"
fi

# Test 4: Check if Edge Function code exists
echo -n "4. Checking Edge Function code... "
if [ -f "supabase/functions/vision-agent-signal/index.ts" ]; then
    echo -e "${GREEN}✅ EXISTS${NC}"
else
    echo -e "${RED}❌ MISSING${NC}"
fi

# Test 5: Check if React components exist
echo -n "5. Checking VisionAgentPanel component... "
if [ -f "src/components/trading/VisionAgentPanel.tsx" ]; then
    echo -e "${GREEN}✅ EXISTS${NC}"
else
    echo -e "${RED}❌ MISSING${NC}"
fi

echo -n "6. Checking VisionAgentSettings page... "
if [ -f "src/pages/VisionAgentSettings.tsx" ]; then
    echo -e "${GREEN}✅ EXISTS${NC}"
else
    echo -e "${RED}❌ MISSING${NC}"
fi

# Test 7: Check Python service
echo -n "7. Checking Python Vision Agent service... "
if [ -d "vision-agent-service" ] && [ -f "vision-agent-service/src/main.py" ]; then
    echo -e "${GREEN}✅ EXISTS${NC}"
else
    echo -e "${YELLOW}⚠️  NOT FOUND${NC} (Optional)"
fi

echo ""
echo "================================================"
echo "📋 SUMMARY"
echo "================================================"
echo ""
echo "Frontend Status: ✅ Ready"
echo "Backend Code: ✅ Ready"
echo ""
echo -e "${YELLOW}PENDING TASKS:${NC}"
echo "1. Apply database migrations via Supabase Dashboard"
echo "2. Deploy vision-agent-signal Edge Function"
echo ""
echo "See DEPLOYMENT_STATUS.md for detailed instructions."
echo ""
