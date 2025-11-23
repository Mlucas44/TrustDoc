# How to Create Encrypted PDF Fixture

This document explains how to create `encrypted.pdf` for testing password-protected PDF handling.

## Quick Start (Recommended Methods)

### Method 1: Using qpdf (Recommended)

```bash
# Install qpdf
# Ubuntu/Debian:
sudo apt-get install qpdf

# macOS:
brew install qpdf

# Windows:
choco install qpdf
# or download from: http://qpdf.sourceforge.net/

# Create encrypted PDF
cd fixtures/pdf
qpdf --encrypt test123 "" 40 -- simple.pdf encrypted.pdf

# Verify it works
qpdf --password=test123 --decrypt encrypted.pdf temp.pdf
```

### Method 2: Using Python + PyPDF2

```bash
# Install PyPDF2
pip install PyPDF2

# Run Python script
cd fixtures/pdf
python3 << 'PYTHON'
from PyPDF2 import PdfWriter, PdfReader

reader = PdfReader("simple.pdf")
writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

writer.encrypt(user_password="test123", owner_password="", algorithm="RC4-40")

with open("encrypted.pdf", "wb") as f:
    writer.write(f)

print("✓ Created encrypted.pdf with password: test123")
PYTHON
```

### Method 3: Using pdftk

```bash
# Install pdftk
sudo apt-get install pdftk

# Encrypt PDF
cd fixtures/pdf
pdftk simple.pdf output encrypted.pdf user_pw test123
```

## Testing the Encrypted PDF

Once `encrypted.pdf` is created, test it:

```bash
# Test with correct password (should succeed)
pnpm run pdf:run:encrypted
# or
pnpm tsx scripts/pdf-runner.ts encrypted --password=test123

# Test without password (should fail with PASSWORD_REQUIRED)
pnpm run pdf:run:encrypted:nopass
# or
pnpm tsx scripts/pdf-runner.ts encrypted

# Test with wrong password (should fail with PASSWORD_INVALID)
pnpm run pdf:run:encrypted:wrong
# or
pnpm tsx scripts/pdf-runner.ts encrypted --password=wrongpass
```

## Expected Results

### Success Case (Correct Password)

```
🔍 PDF Extractor Test Runner
📂 Fixture: encrypted.pdf
🔑 Password: ******* (7 chars)
📖 Reading file... ✓ Loaded: ~1 KB
⚙️  Extracting text... ✓ Success

📊 Extraction Results:
🔹 Basic Info:
   Pages: 1
   Text Length: ~100 chars
   Engine: pdfjs
✅ Test completed successfully!
```

### Error Case 1: No Password

```
❌ Extraction Failed:
🔒 Password Required
   Ce PDF est protégé par mot de passe
   Code: PASSWORD_REQUIRED

🗨️  User-Facing Message:
   "Ce PDF est protégé par mot de passe"
```

### Error Case 2: Wrong Password

```
❌ Extraction Failed:
🔑 Invalid Password
   Le mot de passe fourni est incorrect
   Code: PASSWORD_INVALID

🗨️  User-Facing Message:
   "Le mot de passe fourni est incorrect"
```

## Encryption Details

### Configuration Used

- **User Password**: `test123`
- **Owner Password**: (empty/none)
- **Algorithm**: RC4-40 (PDF 1.4)
- **Permissions**: All allowed once opened

### Why RC4-40?

- Simple and widely supported
- Fast to create/decrypt
- Sufficient for testing purposes
- **NOT secure** - only for testing!

### Production Use

For production, use:

- **AES-256** encryption
- Strong passwords (16+ chars)
- Both user and owner passwords
- Restricted permissions

## Troubleshooting

### "Cannot find encrypted.pdf"

The fixture doesn't exist yet. Create it using one of the methods above.

### "qpdf: command not found"

Install qpdf (see Method 1 above).

### "ModuleNotFoundError: No module named 'PyPDF2'"

Install PyPDF2: `pip install PyPDF2`

### "Permission denied"

Make sure you have write permissions in `fixtures/pdf/` directory.

### pdfjs-dist throws "invalid PDF" error

The PDF might be corrupted. Try regenerating with a different method.

## Alternative: Download Pre-Made Test PDF

If you can't generate the PDF locally, you can download a test encrypted PDF:

```bash
# From Mozilla PDF.js test suite
cd fixtures/pdf
curl -o encrypted.pdf "https://raw.githubusercontent.com/mozilla/pdf.js/master/test/pdfs/encrypted-password.pdf"

# Note: Check the password in the PDF.js test suite docs
```

## CI/CD Setup

For automated testing in CI/CD, add encrypted.pdf generation to your pipeline:

```yaml
# GitHub Actions example
- name: Generate encrypted PDF fixtures
  run: |
    sudo apt-get install -y qpdf
    cd fixtures/pdf
    qpdf --encrypt test123 "" 40 -- simple.pdf encrypted.pdf
```

## Summary

- **Password**: `test123`
- **Command**: `qpdf --encrypt test123 "" 40 -- simple.pdf encrypted.pdf`
- **Test**: `pnpm run pdf:run:encrypted`
- **Expected**: Success with correct password, specific errors otherwise
