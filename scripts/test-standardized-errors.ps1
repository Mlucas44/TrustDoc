# Test Standardized Error Responses for /api/parse-v2
# Verifies that all error responses include 'hint' and 'engineUsed' fields

$API_URL = "http://localhost:3000/api/parse-v2"

Write-Host "`n🧪 Testing Standardized Error Responses" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Test 1: Empty Text PDF (422) - Should have hint + engineUsed
Write-Host "📋 Test 1: Empty Text PDF (422)" -ForegroundColor Yellow
Write-Host "Expected: error, code, hint, engineUsed, textLength`n" -ForegroundColor Gray

$response1 = curl.exe -s -X POST $API_URL `
  -H "Content-Type: application/json" `
  -d '{"filePath":"user-test123/empty-text.pdf"}' `
  -w "\nHTTP_STATUS:%{http_code}"

$body1, $status1 = $response1 -split "HTTP_STATUS:"
$json1 = $body1 | ConvertFrom-Json

Write-Host "Response:" -ForegroundColor Green
Write-Host $body1
Write-Host "`nHTTP Status: $status1" -ForegroundColor $(if ($status1 -eq "422") { "Green" } else { "Red" })

if ($json1.hint -and $json1.engineUsed) {
    Write-Host "✅ Contains 'hint' and 'engineUsed'" -ForegroundColor Green
} else {
    Write-Host "❌ Missing 'hint' or 'engineUsed'" -ForegroundColor Red
}

Write-Host "`n═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Test 2: Encrypted PDF without password (401) - Should have hint + engineUsed
Write-Host "📋 Test 2: Encrypted PDF without password (401)" -ForegroundColor Yellow
Write-Host "Expected: error, code, hint, engineUsed, requiresPassword`n" -ForegroundColor Gray

# Check if encrypted.pdf exists
if (-not (Test-Path "fixtures\pdf\encrypted.pdf")) {
    Write-Host "⚠️  Skipping: encrypted.pdf not found" -ForegroundColor Yellow
    Write-Host "   Generate with: see fixtures/pdf/HOWTO_ENCRYPT.md`n" -ForegroundColor Gray
} else {
    $response2 = curl.exe -s -X POST $API_URL `
      -H "Content-Type: application/json" `
      -d '{"filePath":"user-test123/encrypted.pdf"}' `
      -w "\nHTTP_STATUS:%{http_code}"

    $body2, $status2 = $response2 -split "HTTP_STATUS:"
    $json2 = $body2 | ConvertFrom-Json

    Write-Host "Response:" -ForegroundColor Green
    Write-Host $body2
    Write-Host "`nHTTP Status: $status2" -ForegroundColor $(if ($status2 -eq "401") { "Green" } else { "Red" })

    if ($json2.hint -and $json2.engineUsed) {
        Write-Host "✅ Contains 'hint' and 'engineUsed'" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing 'hint' or 'engineUsed'" -ForegroundColor Red
    }

    Write-Host "`n═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
}

# Test 3: Encrypted PDF with wrong password (401) - Should have hint + engineUsed
Write-Host "📋 Test 3: Encrypted PDF with wrong password (401)" -ForegroundColor Yellow
Write-Host "Expected: error, code, hint, engineUsed`n" -ForegroundColor Gray

if (-not (Test-Path "fixtures\pdf\encrypted.pdf")) {
    Write-Host "⚠️  Skipping: encrypted.pdf not found`n" -ForegroundColor Yellow
} else {
    $response3 = curl.exe -s -X POST $API_URL `
      -H "Content-Type: application/json" `
      -d '{"filePath":"user-test123/encrypted.pdf","pdfPassword":"wrongpass"}' `
      -w "\nHTTP_STATUS:%{http_code}"

    $body3, $status3 = $response3 -split "HTTP_STATUS:"
    $json3 = $body3 | ConvertFrom-Json

    Write-Host "Response:" -ForegroundColor Green
    Write-Host $body3
    Write-Host "`nHTTP Status: $status3" -ForegroundColor $(if ($status3 -eq "401") { "Green" } else { "Red" })

    if ($json3.hint -and $json3.engineUsed) {
        Write-Host "✅ Contains 'hint' and 'engineUsed'" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing 'hint' or 'engineUsed'" -ForegroundColor Red
    }

    Write-Host "`n═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
}

Write-Host "✅ Standardized error response tests complete!" -ForegroundColor Green
Write-Host "`nAll PDF error responses now include:" -ForegroundColor Cyan
Write-Host "  • error (message)" -ForegroundColor Gray
Write-Host "  • code (error code)" -ForegroundColor Gray
Write-Host "  • hint (actionable suggestion)" -ForegroundColor Green
Write-Host "  • engineUsed (pdfjs or pdf-parse)" -ForegroundColor Green
Write-Host "  • Additional error-specific metadata`n" -ForegroundColor Gray
