#!/bin/bash
# Test telemetry output from /api/parse-v2
#
# This script demonstrates the telemetry logging format
# Usage: ./scripts/test-telemetry.sh

echo "==================================================================="
echo "Testing /api/parse-v2 Telemetry"
echo "==================================================================="
echo ""
echo "Prerequisites:"
echo "  1. Set PDF_PARSE_V2=true in .env.local"
echo "  2. Set DEV_USE_FIXTURE_STORAGE=true in .env.local"
echo "  3. Run 'pnpm dev' in another terminal"
echo ""
echo "Expected telemetry format:"
echo ""
echo '{"prefix":"[pdf-parse-v2]","event":"parse_success","engineUsed":"pdfjs-dist","pages":1,"encrypted":false,"totalMs":123,"textLength":456,"filePathPattern":"user-xxx","timestamp":"2024-01-01T00:00:00.000Z"}'
echo ""
echo "==================================================================="
echo "Making request to http://localhost:3000/api/parse-v2"
echo "==================================================================="
echo ""

curl -X POST http://localhost:3000/api/parse-v2 \
  -H "Content-Type: application/json" \
  -d '{"filePath":"user-test123/simple.pdf"}' \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "==================================================================="
echo "Check your dev server logs for telemetry output"
echo "Look for JSON lines starting with: {\"prefix\":\"[pdf-parse-v2]\""
echo "==================================================================="
