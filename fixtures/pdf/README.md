# PDF Test Fixtures

Test PDFs for validating the extraction pipeline.

## Files

### Basic Test PDFs

#### `simple.pdf` (891 bytes)

- **Pages**: 1
- **Content**: "Hello World - Simple Contract"
- **Purpose**: Basic single-page extraction test
- **Expected**: Success

#### `long.pdf` (1,770 bytes)

- **Pages**: 3
- **Content**: Employment contract with 3 articles
- **Purpose**: Multi-page extraction with concurrency
- **Expected**: Success

#### `empty-text.pdf` (766 bytes)

- **Pages**: 1
- **Content**: Minimal text ("X")
- **Purpose**: Scanned PDF simulation
- **Expected**: Fail with `TEXT_EMPTY` error

### Encrypted Test PDFs

#### `encrypted.pdf` (~1 KB)

- **Pages**: 1
- **Content**: "Protected Document - Test Content"
- **Password**: `test123`
- **Encryption**: User password only (40-bit RC4)
- **Purpose**: Test password-protected PDF handling
- **Expected**:
  - With correct password (`test123`): Success
  - Without password: Fail with `PASSWORD_REQUIRED` error
  - With wrong password: Fail with `PASSWORD_INVALID` error

## Generation

### Basic PDFs

Generated using `scripts/generate-pdf-fixtures.ts`:

```bash
pnpm run pdf:fixtures
```

This creates minimal valid PDF structures with embedded text streams.

### Encrypted PDFs

Encrypted PDFs are generated using external tools due to complexity of PDF encryption.

**Method 1: Using qpdf (recommended)**

```bash
# Install qpdf
# Ubuntu/Debian: sudo apt-get install qpdf
# macOS: brew install qpdf
# Windows: choco install qpdf

# Create encrypted PDF from existing PDF
qpdf --encrypt "test123" "" 40 -- simple.pdf encrypted.pdf

# Explanation:
#   --encrypt USER_PASSWORD OWNER_PASSWORD KEY_LENGTH
#   USER_PASSWORD: Password for opening/viewing (test123)
#   OWNER_PASSWORD: Password for editing (empty = same as user)
#   KEY_LENGTH: 40 or 128 bits
```

**Method 2: Using pdftk**

```bash
# Install pdftk
sudo apt-get install pdftk

# Encrypt PDF
pdftk simple.pdf output encrypted.pdf user_pw test123
```

**Method 3: Using PyPDF2 (Python)**

```python
from PyPDF2 import PdfWriter, PdfReader

reader = PdfReader("simple.pdf")
writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

writer.encrypt(user_password="test123", owner_password="", algorithm="RC4-40")

with open("encrypted.pdf", "wb") as output_file:
    writer.write(output_file)
```

## Testing

### Run Tests

```bash
# Basic tests
pnpm run pdf:run:simple
pnpm run pdf:run:long
pnpm run pdf:run:empty

# Encrypted tests
pnpm tsx scripts/pdf-runner.ts encrypted --password=test123      # Success
pnpm tsx scripts/pdf-runner.ts encrypted                         # PASSWORD_REQUIRED
pnpm tsx scripts/pdf-runner.ts encrypted --password=wrong        # PASSWORD_INVALID
```

### Custom Fixtures

To add your own test PDF:

1. Copy PDF to `fixtures/pdf/`
2. Run test:
   ```bash
   pnpm tsx scripts/pdf-runner.ts your-filename
   ```

## Encryption Details

### PDF Encryption Levels

**40-bit RC4** (PDF 1.4):

- Legacy encryption
- Weak security (easily cracked)
- Used for testing only
- Compatible with most PDF readers

**128-bit RC4** (PDF 1.4+):

- Medium security
- Better than 40-bit but still deprecated

**128/256-bit AES** (PDF 1.6+):

- Modern encryption
- Strong security
- Recommended for production

### Password Types

**User Password** (Document Open Password):

- Required to open and view the PDF
- Used in our test fixtures

**Owner Password** (Permissions Password):

- Controls editing, printing, copying
- Not required for viewing

### Our Test Fixtures Use:

- **User password**: `test123`
- **Owner password**: (empty/none)
- **Encryption**: 40-bit RC4 (for compatibility)
- **Permissions**: All allowed once opened

## Expected Behavior

### Extraction Success Cases

| Fixture         | Password  | Result     |
| --------------- | --------- | ---------- |
| `simple.pdf`    | N/A       | ✅ Success |
| `long.pdf`      | N/A       | ✅ Success |
| `encrypted.pdf` | `test123` | ✅ Success |

### Extraction Error Cases

| Fixture          | Password | Error Code          | Message                                |
| ---------------- | -------- | ------------------- | -------------------------------------- |
| `empty-text.pdf` | N/A      | `TEXT_EMPTY`        | "PDF semble scanné..."                 |
| `encrypted.pdf`  | (none)   | `PASSWORD_REQUIRED` | "Ce PDF est protégé par mot de passe"  |
| `encrypted.pdf`  | `wrong`  | `PASSWORD_INVALID`  | "Le mot de passe fourni est incorrect" |

## Security Note

⚠️ **These are test fixtures only!**

- Passwords are intentionally weak and public
- DO NOT use these PDFs for real sensitive data
- DO NOT use 40-bit encryption in production
- Always use AES-256 for real encrypted documents

## Maintenance

### Regenerating Fixtures

If fixtures are corrupted or need updates:

```bash
# Regenerate basic PDFs
pnpm run pdf:fixtures

# Regenerate encrypted PDF
qpdf --encrypt "test123" "" 40 -- simple.pdf encrypted.pdf
```

### Verifying Fixtures

```bash
# Check if PDF is encrypted
qpdf --check encrypted.pdf
# Expected: "PDF is encrypted"

# Decrypt for inspection
qpdf --password=test123 --decrypt encrypted.pdf decrypted.pdf
```

## References

- [PDF Specification](https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf)
- [qpdf Documentation](https://qpdf.readthedocs.io/)
- [PyPDF2 Encryption](https://pypdf2.readthedocs.io/en/latest/user/encryption-decryption.html)
