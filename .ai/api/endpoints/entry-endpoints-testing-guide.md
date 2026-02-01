# Entry Endpoints Manual Testing Guide

## Prerequisites

- API running on http://localhost:3000
- Valid JWT token from Supabase Auth
- Existing tracker ID
- PostgreSQL database with proper schema

## Environment Setup

```bash
# Set your JWT token
$TOKEN = "your-jwt-token-here"

# Set tracker ID (create one first if needed)
$TRACKER_ID = "your-tracker-uuid-here"
```

## Test Scenarios

### 1. Create Entry (POST /api/trackers/:trackerId/entries)

**Success - Number type:**

```powershell
$body = @{
    value = 75.5
    recorded_at = "2026-02-01T10:00:00Z"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" } `
    -Body $body
```

**Expected: 201 Created**

```json
{
  "id": "uuid",
  "tracker_id": "uuid",
  "user_id": "uuid",
  "value": 75.5,
  "recorded_at": "2026-02-01T10:00:00Z",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Success - Boolean type:**

```powershell
$body = @{
    value = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" } `
    -Body $body
```

**Success - Scale type (1-10):**

```powershell
$body = @{
    value = 8
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" } `
    -Body $body
```

**Error - Value type mismatch (422):**

```powershell
# For number tracker, send string
$body = @{
    value = "invalid"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" } `
    -Body $body
```

**Expected: 422 Unprocessable Entity**

```json
{
  "statusCode": 422,
  "message": "Value type does not match tracker data_type 'number'. Expected number"
}
```

**Error - Scale value out of range (422):**

```powershell
$body = @{
    value = 15
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" } `
    -Body $body
```

**Expected: 422 Unprocessable Entity**

```json
{
  "statusCode": 422,
  "message": "Value must be at most 10"
}
```

**Error - No authorization (401):**

```powershell
$body = @{ value = 75.5 } | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $body
```

**Expected: 401 Unauthorized**

---

### 2. Get Entries List (GET /api/trackers/:trackerId/entries)

**Success - Basic list:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
```

**Expected: 200 OK**

```json
{
  "data": [
    {
      "id": "uuid",
      "tracker_id": "uuid",
      "user_id": "uuid",
      "value": 75.5,
      "recorded_at": "timestamp",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_items": 10,
    "total_pages": 1
  }
}
```

**Success - With pagination:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries?page=1&limit=10" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
```

**Success - With date filter:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries?from=2026-01-01T00:00:00Z&to=2026-02-01T23:59:59Z" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
```

**Success - With sorting:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries?sort_order=asc" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
```

**Error - Invalid pagination (400):**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries?limit=200" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
```

**Expected: 400 Bad Request**

```json
{
  "statusCode": 400,
  "message": ["limit must not exceed 100"]
}
```

---

### 3. Get Single Entry (GET /api/trackers/:trackerId/entries/:entryId)

**Success:**

```powershell
$ENTRY_ID = "your-entry-uuid-here"

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries/$ENTRY_ID" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
```

**Expected: 200 OK**

```json
{
  "id": "uuid",
  "tracker_id": "uuid",
  "user_id": "uuid",
  "value": 75.5,
  "recorded_at": "timestamp",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Error - Entry not found (404):**

```powershell
$INVALID_ID = "00000000-0000-0000-0000-000000000000"

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries/$INVALID_ID" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
```

**Expected: 404 Not Found**

```json
{
  "statusCode": 404,
  "message": "Entry not found"
}
```

---

### 4. Update Entry (PATCH /api/trackers/:trackerId/entries/:entryId)

**Success - Update value:**

```powershell
$ENTRY_ID = "your-entry-uuid-here"

$body = @{
    value = 80
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries/$ENTRY_ID" `
    -Method PATCH `
    -Headers @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" } `
    -Body $body
```

**Expected: 200 OK** with updated entry

**Success - Update recorded_at:**

```powershell
$body = @{
    recorded_at = "2026-02-01T12:00:00Z"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries/$ENTRY_ID" `
    -Method PATCH `
    -Headers @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" } `
    -Body $body
```

**Error - Not entry author (403):**

```powershell
# Try to update someone else's entry
$OTHER_ENTRY_ID = "entry-created-by-other-user"

$body = @{ value = 100 } | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries/$OTHER_ENTRY_ID" `
    -Method PATCH `
    -Headers @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" } `
    -Body $body
```

**Expected: 403 Forbidden**

```json
{
  "statusCode": 403,
  "message": "Only entry author can modify this entry"
}
```

---

### 5. Delete Entry (DELETE /api/trackers/:trackerId/entries/:entryId)

**Success - Soft delete:**

```powershell
$ENTRY_ID = "your-entry-uuid-here"

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries/$ENTRY_ID" `
    -Method DELETE `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
```

**Expected: 204 No Content** (no response body)

**Verify deletion:**

```powershell
# Entry should not appear in list
Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }

# Direct access should return 404
Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries/$ENTRY_ID" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
```

**Error - Not entry author (403):**

```powershell
$OTHER_ENTRY_ID = "entry-created-by-other-user"

Invoke-RestMethod -Uri "http://localhost:3000/api/trackers/$TRACKER_ID/entries/$OTHER_ENTRY_ID" `
    -Method DELETE `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
```

**Expected: 403 Forbidden**

```json
{
  "statusCode": 403,
  "message": "Only entry author can delete this entry"
}
```

---

## Verification Checklist

### Authorization & Access Control

- [ ] 401 when no token provided
- [ ] 403 when accessing tracker user doesn't own
- [ ] 403 when modifying entry user didn't create
- [ ] Read permission allows GET but not POST
- [ ] Write permission allows GET and POST
- [ ] Owner has full access

### Validation

- [ ] 400 for invalid UUID format
- [ ] 400 for invalid query parameters (limit > 100)
- [ ] 400 for invalid date format
- [ ] 422 for value type mismatch
- [ ] 422 for scale value out of range

### CRUD Operations

- [ ] POST creates entry with 201 status
- [ ] GET list returns paginated results
- [ ] GET single returns entry data
- [ ] PATCH updates entry successfully
- [ ] DELETE soft deletes entry (204)
- [ ] Deleted entries don't appear in lists

### Data Types

- [ ] Number type accepts decimal values
- [ ] Boolean type accepts true/false
- [ ] Scale type validates min/max range
- [ ] Text type accepts strings
- [ ] Value normalization works correctly

### Edge Cases

- [ ] Entry list returns empty array when no entries
- [ ] Pagination calculates total_pages correctly
- [ ] Date filtering works with from/to parameters
- [ ] Sort order (asc/desc) works correctly
- [ ] Default recorded_at uses current time

---

## Database Verification

Check database state after operations:

```sql
-- View entries (including soft deleted)
SELECT id, tracker_id, user_id, value_number, value_boolean, value_text,
       recorded_at, created_at, updated_at, deleted_at
FROM kipio.entries
WHERE tracker_id = 'your-tracker-id'
ORDER BY recorded_at DESC;

-- Count active vs deleted
SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted
FROM kipio.entries
WHERE tracker_id = 'your-tracker-id';

-- Verify indexes are being used
EXPLAIN ANALYZE
SELECT * FROM kipio.entries
WHERE tracker_id = 'your-tracker-id'
  AND deleted_at IS NULL
ORDER BY recorded_at DESC
LIMIT 50;
```

Expected to see: `Index Scan using idx_entries_tracker_id_recorded_at`
