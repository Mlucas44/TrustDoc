# Supabase Storage Setup

This document explains how to configure Supabase Storage for secure PDF contract uploads.

## Bucket Configuration

### 1. Create the `contracts-temp` Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **New Bucket**
4. Configure:
   - **Name**: `contracts-temp`
   - **Public**: **No** (Private bucket)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `application/pdf`

### 2. Row Level Security (RLS) Policies

The bucket should be **private** with the following RLS policies:

#### Policy 1: Backend Service Role Only (Insert)

```sql
CREATE POLICY "Service role can upload files"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'contracts-temp');
```

#### Policy 2: Backend Service Role Only (Select)

```sql
CREATE POLICY "Service role can read files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'contracts-temp');
```

#### Policy 3: Backend Service Role Only (Delete)

```sql
CREATE POLICY "Service role can delete files"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'contracts-temp');
```

**Important**: No public access policies. Only the backend using `SUPABASE_SERVICE_ROLE_KEY` can access files.

### 3. Automatic File Cleanup (TTL)

Files should be deleted after analysis to save storage costs. We handle this in two ways:

#### Option A: Application-level cleanup (Recommended)

Files are deleted immediately after successful parsing in the analysis pipeline:

```typescript
// After successful parsing
await supabase.storage.from("contracts-temp").remove([`${userId}/${fileId}.pdf`]);
```

#### Option B: Scheduled cleanup (Fallback)

Create a cron job to delete files older than 24 hours:

```sql
-- Run this as a Supabase Edge Function or external cron
DELETE FROM storage.objects
WHERE bucket_id = 'contracts-temp'
  AND created_at < NOW() - INTERVAL '24 hours';
```

## Environment Variables

Add to your `.env.local`:

```bash
# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Upload Configuration
UPLOAD_MAX_SIZE_MB=10
UPLOAD_ALLOWED_MIME_TYPES=application/pdf

# Development: Mock storage (bypass Supabase in local dev)
MOCK_STORAGE=false
```

## File Naming Convention

Files are stored with the following structure:

```
contracts-temp/
  ├── user-{userId}/
  │   ├── {cuid}-{timestamp}.pdf
  │   └── {cuid}-{timestamp}.pdf
  └── guest-{guestId}/
      ├── {cuid}-{timestamp}.pdf
      └── {cuid}-{timestamp}.pdf
```

Example: `contracts-temp/user-abc123/cm4x5y6z7-1699123456789.pdf`

**Benefits**:

- User isolation (easy to query/delete per user)
- Unique filenames (CUID + timestamp prevents collisions)
- Easy cleanup (delete by prefix)

## Security Measures

1. **Private Bucket**: No public URLs accessible
2. **RLS Policies**: Only service role can read/write
3. **Server-side Upload**: Client never gets service role key
4. **MIME Type Validation**: Only `application/pdf` accepted
5. **Size Limit**: Maximum 10 MB enforced at API level
6. **Rate Limiting**: 5 uploads per minute per IP
7. **Temporary Storage**: Files deleted after analysis

## Testing in Development

### Mock Mode (Local Development)

Set `MOCK_STORAGE=true` in `.env.local` to bypass Supabase and save files locally:

```bash
MOCK_STORAGE=true
```

Files will be saved to `./temp/uploads/` instead of Supabase Storage.

### Testing with Real Supabase

1. Ensure bucket is created and policies are applied
2. Set correct environment variables
3. Upload a test PDF (≤10 MB)
4. Verify file appears in Supabase Storage dashboard
5. Verify file is deleted after analysis

## Troubleshooting

### Error: "Bucket not found"

- Check bucket name is exactly `contracts-temp`
- Verify you're using the correct Supabase project

### Error: "Access denied" or 403

- Verify RLS policies are created
- Check you're using `SUPABASE_SERVICE_ROLE_KEY`, not anon key
- Ensure service role has storage permissions

### Error: "File too large"

- Check file size is ≤10 MB
- Verify `UPLOAD_MAX_SIZE_MB` environment variable

### Files not being deleted

- Check application-level cleanup in analysis pipeline
- Verify service role has DELETE permission
- Check cron job if using scheduled cleanup

## Cost Optimization

- **Storage**: Files are temporary (deleted after analysis)
- **Bandwidth**: Only backend accesses files (no public downloads)
- **Average cost**: ~$0.021/GB/month (minimal for temporary storage)

**Estimated cost for 1000 uploads/month**:

- Average PDF size: 2 MB
- Storage duration: ~1 hour (before cleanup)
- Total: **~$0.01/month** (negligible)
