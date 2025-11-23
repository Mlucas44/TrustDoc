#!/bin/bash
#
# Test /api/parse-v2 with curl
#
# Prerequisites:
# 1. Start dev server: pnpm dev
# 2. Enable feature flag: export PDF_PARSE_V2=true (or add to .env.local)
# 3. Upload test PDF to storage (or modify downloadFile to read from fixtures in dev mode)
#
# Usage:
#   ./scripts/test-api-v2-curl.sh <scenario>
#
# Scenarios:
#   simple - Test with simple PDF (success)
#   encrypted - Test with encrypted PDF + correct password
#   encrypted-nopass - Test with encrypted PDF without password (401)
#   encrypted-wrong - Test with encrypted PDF + wrong password (401)
#   empty - Test with empty-text PDF (422)
#   feature-disabled - Test with PDF_PARSE_V2=false (404)
#

API_URL="http://localhost:3000/api/parse-v2"
SCENARIO="${1:-simple}"

echo "🧪 Testing /api/parse-v2"
echo "═══════════════════════════════════════════════════════════"
echo ""

case "$SCENARIO" in
  simple)
    echo "📋 Scenario: Simple PDF (should succeed)"
    echo "📨 Request:"
    echo '  { "filePath": "user-test123/simple.pdf" }'
    echo ""
    curl -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{"filePath":"user-test123/simple.pdf"}' \
      -w "\n\nHTTP Status: %{http_code}\n"
    ;;

  long)
    echo "📋 Scenario: Long PDF with 3 pages (should succeed)"
    echo "📨 Request:"
    echo '  { "filePath": "user-test123/long.pdf" }'
    echo ""
    curl -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{"filePath":"user-test123/long.pdf"}' \
      -w "\n\nHTTP Status: %{http_code}\n"
    ;;

  empty)
    echo "📋 Scenario: Empty text PDF (should return 422)"
    echo "📨 Request:"
    echo '  { "filePath": "user-test123/empty-text.pdf" }'
    echo ""
    curl -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{"filePath":"user-test123/empty-text.pdf"}' \
      -w "\n\nHTTP Status: %{http_code}\n"
    ;;

  encrypted)
    echo "📋 Scenario: Encrypted PDF with correct password (should succeed)"
    echo "📨 Request:"
    echo '  { "filePath": "user-test123/encrypted.pdf", "pdfPassword": "test123" }'
    echo ""
    curl -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{"filePath":"user-test123/encrypted.pdf","pdfPassword":"test123"}' \
      -w "\n\nHTTP Status: %{http_code}\n"
    ;;

  encrypted-nopass)
    echo "📋 Scenario: Encrypted PDF without password (should return 401 PASSWORD_REQUIRED)"
    echo "📨 Request:"
    echo '  { "filePath": "user-test123/encrypted.pdf" }'
    echo ""
    curl -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{"filePath":"user-test123/encrypted.pdf"}' \
      -w "\n\nHTTP Status: %{http_code}\n"
    ;;

  encrypted-wrong)
    echo "📋 Scenario: Encrypted PDF with wrong password (should return 401 PASSWORD_INVALID)"
    echo "📨 Request:"
    echo '  { "filePath": "user-test123/encrypted.pdf", "pdfPassword": "wrongpass" }'
    echo ""
    curl -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{"filePath":"user-test123/encrypted.pdf","pdfPassword":"wrongpass"}' \
      -w "\n\nHTTP Status: %{http_code}\n"
    ;;

  feature-disabled)
    echo "📋 Scenario: Feature flag disabled (should return 404)"
    echo "📨 Request:"
    echo '  { "filePath": "user-test123/simple.pdf" }'
    echo ""
    echo "⚠️  Make sure PDF_PARSE_V2=false in your environment"
    curl -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{"filePath":"user-test123/simple.pdf"}' \
      -w "\n\nHTTP Status: %{http_code}\n"
    ;;

  *)
    echo "❌ Unknown scenario: $SCENARIO"
    echo ""
    echo "Available scenarios:"
    echo "  simple          - Test with simple PDF (success)"
    echo "  long            - Test with long PDF (success)"
    echo "  empty           - Test with empty-text PDF (422)"
    echo "  encrypted       - Test with encrypted PDF + correct password (success)"
    echo "  encrypted-nopass - Test with encrypted PDF without password (401)"
    echo "  encrypted-wrong  - Test with encrypted PDF + wrong password (401)"
    echo "  feature-disabled - Test with feature flag disabled (404)"
    exit 1
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════"
