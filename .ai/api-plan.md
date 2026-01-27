# REST API Plan

## 1. Resources

| Resource          | Database Table      | Description                                     |
| ----------------- | ------------------- | ----------------------------------------------- |
| Profiles          | `profiles`          | User profile management (extends Supabase Auth) |
| Trackers          | `trackers`          | Metric definitions created by users             |
| Tracker Shares    | `tracker_shares`    | Sharing trackers between users                  |
| Entries           | `entries`           | Data entries/measurements for trackers          |
| API Tokens        | `api_tokens`        | User API tokens for webhook integrations        |
| Template Packages | `template_packages` | Onboarding template packages                    |
| Tracker Templates | `tracker_templates` | Tracker templates within packages               |
| Activity Log      | `activity_log`      | Activity and changes log                        |

---

## 2. Endpoints

### 2.1. Profile Endpoints

#### GET /api/profiles/me

Get current user's profile.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "display_name": "string",
  "onboarding_completed": false,
  "preferred_theme": "dark",
  "trackers_limit": 50,
  "api_requests_per_hour": 100,
  "timezone": "Europe/Warsaw",
  "created_at": "2026-01-23T12:00:00Z",
  "updated_at": "2026-01-23T12:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token
- `404 Not Found` - Profile not found (shouldn't happen if trigger works)

---

#### PATCH /api/profiles/me

Update current user's profile.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "display_name": "string (optional, max 100 chars)",
  "preferred_theme": "light | dark | system (optional)",
  "timezone": "string (optional, valid timezone)"
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "display_name": "string",
  "onboarding_completed": false,
  "preferred_theme": "dark",
  "trackers_limit": 50,
  "api_requests_per_hour": 100,
  "timezone": "Europe/Warsaw",
  "created_at": "2026-01-23T12:00:00Z",
  "updated_at": "2026-01-23T12:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `422 Unprocessable Entity` - Validation errors

---

#### POST /api/profiles/me/complete-onboarding

Mark onboarding as completed.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "selected_package_ids": ["uuid", "uuid"]
}
```

**Response (200 OK):**

```json
{
  "message": "Onboarding completed successfully",
  "created_trackers_count": 5
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `409 Conflict` - Onboarding already completed

---

#### DELETE /api/profiles/me

Delete current user's account (soft delete, GDPR compliance).

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (204 No Content)**

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token

---

### 2.2. Tracker Endpoints

#### GET /api/trackers

List all trackers for the current user (including shared).

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `sort_by` | string | `display_order` | Sort field: `display_order`, `name`, `created_at`, `updated_at` |
| `sort_order` | string | `asc` | Sort order: `asc`, `desc` |
| `is_active` | boolean | true | Filter by active status |
| `data_type` | string | - | Filter by data type: `number`, `scale`, `boolean`, `text` |
| `include_shared` | boolean | true | Include shared trackers |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Weight",
      "data_type": "number",
      "unit": "kg",
      "config": {},
      "color": "#FF5733",
      "icon": "scale",
      "display_order": 1,
      "is_active": true,
      "is_owner": true,
      "shared_permission": null,
      "created_at": "2026-01-23T12:00:00Z",
      "updated_at": "2026-01-23T12:00:00Z",
      "last_entry": {
        "value": 75.5,
        "recorded_at": "2026-01-23T08:00:00Z"
      },
      "sparkline_data": [75.2, 75.4, 75.3, 75.5, 75.1, 75.3, 75.5]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 15,
    "total_pages": 1
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token
- `400 Bad Request` - Invalid query parameters

---

#### GET /api/trackers/:id

Get a specific tracker by ID.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Weight",
  "data_type": "number",
  "unit": "kg",
  "config": {},
  "color": "#FF5733",
  "icon": "scale",
  "display_order": 1,
  "is_active": true,
  "is_owner": true,
  "shared_permission": null,
  "created_at": "2026-01-23T12:00:00Z",
  "updated_at": "2026-01-23T12:00:00Z",
  "stats": {
    "total_entries": 150,
    "first_entry_at": "2025-06-01T10:00:00Z",
    "last_entry_at": "2026-01-23T08:00:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User doesn't have access to this tracker
- `404 Not Found` - Tracker not found

---

#### POST /api/trackers

Create a new tracker.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "name": "string (required, max 100 chars)",
  "data_type": "number | scale | boolean | text (required)",
  "unit": "string (optional, max 20 chars, only for 'number' type)",
  "config": {
    "min": 1,
    "max": 10
  },
  "color": "string (optional, hex format #RRGGBB)",
  "icon": "string (optional, max 50 chars)",
  "display_order": "integer (optional, default 0)"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Energy Level",
  "data_type": "scale",
  "unit": null,
  "config": { "min": 1, "max": 10 },
  "color": "#4CAF50",
  "icon": "battery",
  "display_order": 2,
  "is_active": true,
  "created_at": "2026-01-23T12:00:00Z",
  "updated_at": "2026-01-23T12:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - Tracker limit reached
- `422 Unprocessable Entity` - Validation errors (e.g., invalid hex color, config mismatch)

---

#### PATCH /api/trackers/:id

Update an existing tracker.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "name": "string (optional, max 100 chars)",
  "unit": "string (optional, max 20 chars)",
  "config": "object (optional)",
  "color": "string (optional, hex format)",
  "icon": "string (optional, max 50 chars)",
  "display_order": "integer (optional)",
  "is_active": "boolean (optional)"
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Updated Name",
  "data_type": "number",
  "unit": "lbs",
  "config": {},
  "color": "#FF5733",
  "icon": "scale",
  "display_order": 1,
  "is_active": true,
  "created_at": "2026-01-23T12:00:00Z",
  "updated_at": "2026-01-23T14:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User is not the owner of this tracker
- `404 Not Found` - Tracker not found
- `422 Unprocessable Entity` - Validation errors

**Note:** `data_type` cannot be changed after creation.

---

#### DELETE /api/trackers/:id

Delete a tracker (soft delete).

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (204 No Content)**

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User is not the owner of this tracker
- `404 Not Found` - Tracker not found

---

#### PATCH /api/trackers/reorder

Bulk update tracker display order.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "order": [
    { "id": "uuid", "display_order": 0 },
    { "id": "uuid", "display_order": 1 },
    { "id": "uuid", "display_order": 2 }
  ]
}
```

**Response (200 OK):**

```json
{
  "message": "Tracker order updated successfully",
  "updated_count": 3
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User doesn't own one or more trackers

---

### 2.3. Tracker Shares Endpoints

#### GET /api/trackers/:trackerId/shares

List all shares for a specific tracker.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "tracker_id": "uuid",
      "shared_with_user_id": "uuid",
      "shared_with_user": {
        "id": "uuid",
        "display_name": "John Doe"
      },
      "permission": "read",
      "created_at": "2026-01-23T12:00:00Z",
      "created_by": "uuid"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User is not the owner of this tracker
- `404 Not Found` - Tracker not found

---

#### POST /api/trackers/:trackerId/shares

Share a tracker with another user.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "shared_with_email": "string (required, email format)",
  "permission": "read | write (required)"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "tracker_id": "uuid",
  "shared_with_user_id": "uuid",
  "permission": "read",
  "created_at": "2026-01-23T12:00:00Z",
  "created_by": "uuid"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User is not the owner of this tracker
- `404 Not Found` - Tracker or target user not found
- `409 Conflict` - Share already exists for this user

---

#### DELETE /api/trackers/:trackerId/shares/:shareId

Remove a share from a tracker.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (204 No Content)**

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User is not the owner of this tracker
- `404 Not Found` - Tracker or share not found

---

### 2.4. Entry Endpoints

#### GET /api/trackers/:trackerId/entries

List entries for a specific tracker.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Items per page (max 100) |
| `sort_order` | string | `desc` | Sort by recorded_at: `asc`, `desc` |
| `from` | ISO8601 | - | Filter entries from this date |
| `to` | ISO8601 | - | Filter entries to this date |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "tracker_id": "uuid",
      "user_id": "uuid",
      "value": 75.5,
      "recorded_at": "2026-01-23T08:00:00Z",
      "created_at": "2026-01-23T08:00:00Z",
      "updated_at": "2026-01-23T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_items": 150,
    "total_pages": 3
  }
}
```

**Note:** The `value` field is normalized based on tracker's `data_type`:

- `number`/`scale`: numeric value from `value_number`
- `boolean`: boolean from `value_boolean`
- `text`: string from `value_text`

**Error Responses:**

- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User doesn't have access to this tracker
- `404 Not Found` - Tracker not found

---

#### GET /api/trackers/:trackerId/entries/:entryId

Get a specific entry.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "tracker_id": "uuid",
  "user_id": "uuid",
  "value": 75.5,
  "recorded_at": "2026-01-23T08:00:00Z",
  "created_at": "2026-01-23T08:00:00Z",
  "updated_at": "2026-01-23T08:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User doesn't have access to this tracker
- `404 Not Found` - Tracker or entry not found

---

#### POST /api/trackers/:trackerId/entries

Create a new entry.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "value": "number | boolean | string (required, based on tracker data_type)",
  "recorded_at": "ISO8601 (optional, defaults to now)"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "tracker_id": "uuid",
  "user_id": "uuid",
  "value": 75.5,
  "recorded_at": "2026-01-23T08:00:00Z",
  "created_at": "2026-01-23T08:00:00Z",
  "updated_at": "2026-01-23T08:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User doesn't have write access to this tracker
- `404 Not Found` - Tracker not found
- `422 Unprocessable Entity` - Value doesn't match tracker's data_type

---

#### PATCH /api/trackers/:trackerId/entries/:entryId

Update an existing entry.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "value": "number | boolean | string (optional)",
  "recorded_at": "ISO8601 (optional)"
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "tracker_id": "uuid",
  "user_id": "uuid",
  "value": 76.0,
  "recorded_at": "2026-01-23T08:00:00Z",
  "created_at": "2026-01-23T08:00:00Z",
  "updated_at": "2026-01-23T14:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User is not the author of this entry
- `404 Not Found` - Tracker or entry not found
- `422 Unprocessable Entity` - Value doesn't match tracker's data_type

---

#### DELETE /api/trackers/:trackerId/entries/:entryId

Delete an entry (soft delete).

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (204 No Content)**

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User is not the author of this entry
- `404 Not Found` - Tracker or entry not found

---

### 2.5. Webhook Endpoint (API Token Authentication)

#### POST /api/webhook

Receive data from external systems using API token authentication.

**Headers:**

```
X-API-Key: <api_token>
```

Or:

```
Authorization: Bearer <api_token>
```

**Request Body:**

```json
{
  "tracker_id": "uuid (required)",
  "value": "number | boolean | string (required)",
  "recorded_at": "ISO8601 (optional, defaults to now)"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "tracker_id": "uuid",
  "value": 75.5,
  "recorded_at": "2026-01-23T08:00:00Z",
  "created_at": "2026-01-23T08:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing API token
- `403 Forbidden` - Token doesn't have access to this tracker
- `404 Not Found` - Tracker not found
- `422 Unprocessable Entity` - Value doesn't match tracker's data_type
- `429 Too Many Requests` - Rate limit exceeded

---

#### POST /api/webhook/batch

Batch create multiple entries via webhook.

**Headers:**

```
X-API-Key: <api_token>
```

**Request Body:**

```json
{
  "entries": [
    {
      "tracker_id": "uuid",
      "value": 75.5,
      "recorded_at": "2026-01-23T08:00:00Z"
    },
    {
      "tracker_id": "uuid",
      "value": true,
      "recorded_at": "2026-01-23T08:00:00Z"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "created": 2,
  "failed": 0,
  "entries": [
    { "id": "uuid", "tracker_id": "uuid", "status": "created" },
    { "id": "uuid", "tracker_id": "uuid", "status": "created" }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing API token
- `207 Multi-Status` - Partial success (some entries failed)
- `429 Too Many Requests` - Rate limit exceeded

---

### 2.6. API Token Endpoints

#### GET /api/tokens

List all API tokens for the current user.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "n8n Integration",
      "token_prefix": "kip_abcd",
      "last_used_at": "2026-01-23T12:00:00Z",
      "expires_at": null,
      "is_active": true,
      "created_at": "2026-01-01T12:00:00Z"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token

---

#### POST /api/tokens

Create a new API token.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "name": "string (required, max 50 chars)",
  "expires_at": "ISO8601 (optional, null for never)"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "name": "n8n Integration",
  "token": "kip_abcdefgh1234567890...",
  "token_prefix": "kip_abcd",
  "expires_at": null,
  "created_at": "2026-01-23T12:00:00Z"
}
```

**Note:** The full `token` is only returned once at creation time. Store it securely!

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `422 Unprocessable Entity` - Validation errors

---

#### DELETE /api/tokens/:id

Revoke an API token.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (204 No Content)**

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - Token doesn't belong to current user
- `404 Not Found` - Token not found

---

#### POST /api/tokens/:id/regenerate

Regenerate an existing API token.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "name": "n8n Integration",
  "token": "kip_newtoken1234567890...",
  "token_prefix": "kip_newt",
  "expires_at": null,
  "created_at": "2026-01-23T12:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - Token doesn't belong to current user
- `404 Not Found` - Token not found

---

### 2.7. Template Endpoints

#### GET /api/templates/packages

List all available template packages for onboarding.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Health",
      "description": "Track your health metrics: weight, sleep, water intake",
      "icon": "heart",
      "display_order": 1,
      "trackers": [
        {
          "id": "uuid",
          "name": "Weight",
          "data_type": "number",
          "unit": "kg",
          "icon": "scale",
          "color": "#FF5733"
        },
        {
          "id": "uuid",
          "name": "Sleep",
          "data_type": "number",
          "unit": "hours",
          "icon": "moon",
          "color": "#3498DB"
        }
      ]
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token

---

#### POST /api/templates/packages/:packageId/apply

Apply a template package to create trackers for the current user.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (201 Created):**

```json
{
  "message": "Package applied successfully",
  "created_trackers": [
    {
      "id": "uuid",
      "name": "Weight",
      "data_type": "number"
    },
    {
      "id": "uuid",
      "name": "Sleep",
      "data_type": "number"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - Would exceed tracker limit
- `404 Not Found` - Package not found

---

### 2.8. Export Endpoints

#### GET /api/export

Export all user data.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | `json` | Export format: `json`, `csv` |
| `tracker_ids` | string | - | Comma-separated tracker IDs (optional, exports all if not provided) |
| `from` | ISO8601 | - | Export entries from this date |
| `to` | ISO8601 | - | Export entries to this date |

**Response (200 OK):**

- `Content-Type: application/json` or `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="kipio_export_2026-01-23.json"`

**JSON Format:**

```json
{
  "exported_at": "2026-01-23T12:00:00Z",
  "user": {
    "id": "uuid",
    "display_name": "John Doe"
  },
  "trackers": [
    {
      "id": "uuid",
      "name": "Weight",
      "data_type": "number",
      "unit": "kg",
      "entries": [
        {
          "id": "uuid",
          "value": 75.5,
          "recorded_at": "2026-01-23T08:00:00Z"
        }
      ]
    }
  ]
}
```

**CSV Format:**

```csv
tracker_id,tracker_name,entry_id,value,recorded_at
uuid,Weight,uuid,75.5,2026-01-23T08:00:00Z
```

**Error Responses:**

- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Invalid or missing JWT token

---

### 2.9. Dashboard/Statistics Endpoints

#### GET /api/dashboard

Get dashboard summary with sparkline data for all active trackers.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sparkline_days` | integer | 7 | Number of days for sparkline data (max 30) |

**Response (200 OK):**

```json
{
  "trackers": [
    {
      "id": "uuid",
      "name": "Weight",
      "data_type": "number",
      "unit": "kg",
      "color": "#FF5733",
      "icon": "scale",
      "display_order": 1,
      "last_entry": {
        "value": 75.5,
        "recorded_at": "2026-01-23T08:00:00Z"
      },
      "sparkline": {
        "data": [75.2, 75.4, 75.3, 75.5, 75.1, 75.3, 75.5],
        "labels": [
          "2026-01-17",
          "2026-01-18",
          "2026-01-19",
          "2026-01-20",
          "2026-01-21",
          "2026-01-22",
          "2026-01-23"
        ],
        "trend": "up"
      },
      "stats": {
        "avg_7d": 75.33,
        "min_7d": 75.1,
        "max_7d": 75.5
      }
    }
  ],
  "summary": {
    "total_trackers": 5,
    "active_trackers": 4,
    "entries_today": 3,
    "entries_this_week": 25
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token

---

#### GET /api/trackers/:trackerId/stats

Get detailed statistics for a specific tracker.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `7d` | Time period: `7d`, `30d`, `90d`, `1y`, `all` |

**Response (200 OK):**

```json
{
  "tracker_id": "uuid",
  "period": "30d",
  "data_type": "number",
  "stats": {
    "count": 28,
    "average": 75.32,
    "min": 74.5,
    "max": 76.1,
    "median": 75.3,
    "std_dev": 0.42
  },
  "chart_data": {
    "labels": ["2025-12-25", "2025-12-26", "..."],
    "values": [75.2, 75.4, "..."]
  },
  "heatmap_data": [
    { "date": "2026-01-01", "count": 1, "value": 75.5 },
    { "date": "2026-01-02", "count": 1, "value": 75.3 }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User doesn't have access to this tracker
- `404 Not Found` - Tracker not found

---

### 2.10. Activity Log Endpoints

#### GET /api/activity

Get activity log for the current user.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Items per page (max 100) |
| `entity_type` | string | - | Filter by entity type: `tracker`, `entry`, `api_token`, `profile` |
| `action` | string | - | Filter by action: `create`, `update`, `delete`, `restore` |
| `from` | ISO8601 | - | Filter from this date |
| `to` | ISO8601 | - | Filter to this date |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "entity_type": "tracker",
      "entity_id": "uuid",
      "action": "create",
      "changes": {
        "name": "Weight",
        "data_type": "number"
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2026-01-23T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_items": 100,
    "total_pages": 2
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token

---

## 3. Authentication and Authorization

### 3.1. Authentication Mechanisms

The API supports two authentication methods:

#### JWT Authentication (Primary)

Used for web/mobile app requests.

- **Provider:** Supabase Auth
- **Flow:** User authenticates via Supabase (Google, GitHub, or email/password), receives JWT
- **Header:** `Authorization: Bearer <jwt_token>`
- **Validation:** NestJS validates JWT using Supabase public key via Passport.js

```typescript
// Example JWT payload
{
  "sub": "uuid-user-id",
  "email": "user@example.com",
  "role": "authenticated",
  "exp": 1706054400
}
```

#### API Token Authentication

Used for webhook/automation integrations.

- **Storage:** Token hash (SHA-256) stored in `api_tokens` table
- **Format:** `kip_<32_random_chars>` (e.g., `kip_abcdefgh1234567890abcdefgh1234`)
- **Headers:** `X-API-Key: <api_token>` or `Authorization: Bearer <api_token>`
- **Validation:** Hash incoming token, compare with stored hash

### 3.2. Authorization Rules

Authorization is enforced at two levels:

#### 1. Row Level Security (RLS) in Supabase

- Enforced at database level for all operations
- Policies defined for each table (see db-plan.md for details)

#### 2. Application-level Guards (NestJS)

- `@UseGuards(JwtAuthGuard)` - Validates JWT token
- `@UseGuards(ApiTokenGuard)` - Validates API token (for webhooks)
- Custom guards for specific business rules

### 3.3. Rate Limiting

```typescript
// Global rate limits
@Throttle({ default: { limit: 100, ttl: 3600000 } }) // 100 requests per hour

// Per-endpoint limits
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for sensitive operations
```

| Endpoint Type  | Limit                                     | Window  |
| -------------- | ----------------------------------------- | ------- |
| Standard API   | 100/hour                                  | Rolling |
| Webhook        | Configurable per user (default: 100/hour) | Rolling |
| Auth endpoints | 10/minute                                 | Rolling |
| Export         | 5/hour                                    | Rolling |

---

## 4. Validation and Business Logic

### 4.1. Validation Rules by Resource

#### Profile

| Field             | Validation                      |
| ----------------- | ------------------------------- |
| `display_name`    | Required, max 100 characters    |
| `preferred_theme` | Enum: `light`, `dark`, `system` |
| `timezone`        | Valid IANA timezone string      |

#### Tracker

| Field            | Validation                                                |
| ---------------- | --------------------------------------------------------- |
| `name`           | Required, max 100 characters                              |
| `data_type`      | Required, enum: `number`, `scale`, `boolean`, `text`      |
| `unit`           | Optional, max 20 characters, only valid for `number` type |
| `config`         | JSONB, validated based on `data_type`                     |
| `config.min/max` | Required for `scale` type, min < max                      |
| `color`          | Optional, regex: `^#[0-9A-Fa-f]{6}$`                      |
| `icon`           | Optional, max 50 characters                               |
| `display_order`  | Integer, default 0                                        |

#### Entry

| Field             | Validation                                    |
| ----------------- | --------------------------------------------- |
| `value`           | Required, must match tracker's `data_type`    |
| `value` (number)  | DECIMAL(15,4), within config.min/max if scale |
| `value` (boolean) | Boolean                                       |
| `value` (text)    | String, max 500 characters                    |
| `recorded_at`     | Valid ISO8601 datetime, cannot be in future   |

#### API Token

| Field        | Validation                              |
| ------------ | --------------------------------------- |
| `name`       | Required, max 50 characters             |
| `expires_at` | Optional, valid future ISO8601 datetime |

### 4.2. Business Logic Implementation

#### Tracker Limit Enforcement

```typescript
// Before creating a new tracker
async validateTrackerLimit(userId: string): Promise<void> {
  const profile = await this.profilesService.findOne(userId);
  const trackerCount = await this.trackersService.countByUser(userId);

  if (trackerCount >= profile.trackers_limit) {
    throw new ForbiddenException('Tracker limit reached');
  }
}
```

#### Value Type Validation

```typescript
// Validate entry value matches tracker data_type
async validateEntryValue(trackerId: string, value: any): Promise<void> {
  const tracker = await this.trackersService.findOne(trackerId);

  switch (tracker.data_type) {
    case 'number':
      if (typeof value !== 'number') throw new UnprocessableEntityException('Value must be a number');
      break;
    case 'scale':
      const { min, max } = tracker.config;
      if (typeof value !== 'number' || value < min || value > max) {
        throw new UnprocessableEntityException(`Value must be between ${min} and ${max}`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') throw new UnprocessableEntityException('Value must be a boolean');
      break;
    case 'text':
      if (typeof value !== 'string' || value.length > 500) {
        throw new UnprocessableEntityException('Value must be a string (max 500 chars)');
      }
      break;
  }
}
```

#### Onboarding Flow

```typescript
// Complete onboarding with selected packages
async completeOnboarding(userId: string, packageIds: string[]): Promise<void> {
  const profile = await this.profilesService.findOne(userId);

  if (profile.onboarding_completed) {
    throw new ConflictException('Onboarding already completed');
  }

  // Apply selected template packages
  for (const packageId of packageIds) {
    await this.templatesService.applyPackage(userId, packageId);
  }

  // Mark onboarding as completed
  await this.profilesService.update(userId, { onboarding_completed: true });
}
```

#### Soft Delete Pattern

```typescript
// All delete operations use soft delete
async softDelete(id: string, userId: string): Promise<void> {
  await this.repository.update(
    { id, user_id: userId },
    { deleted_at: new Date() }
  );

  // Log activity
  await this.activityLogService.log({
    user_id: userId,
    entity_type: 'tracker',
    entity_id: id,
    action: 'delete'
  });
}
```

#### API Token Generation

```typescript
// Generate secure API token
async createToken(userId: string, name: string): Promise<{ token: string; tokenInfo: ApiToken }> {
  const token = `kip_${crypto.randomBytes(32).toString('hex')}`;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const tokenPrefix = token.substring(0, 12);

  const apiToken = await this.repository.save({
    user_id: userId,
    name,
    token_hash: tokenHash,
    token_prefix: tokenPrefix
  });

  return { token, tokenInfo: apiToken };
}
```

#### Rate Limit Checking for API Tokens

```typescript
// Check rate limit before processing webhook request
async checkRateLimit(userId: string): Promise<void> {
  const profile = await this.profilesService.findOne(userId);
  const requestsInLastHour = await this.getRequestCount(userId, 3600);

  if (requestsInLastHour >= profile.api_requests_per_hour) {
    throw new TooManyRequestsException('API rate limit exceeded');
  }
}
```

### 4.3. Activity Logging

All mutation operations are logged to `activity_log`:

```typescript
// Automatic activity logging via interceptor
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap((data) => {
        const request = context.switchToHttp().getRequest();
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
          this.activityLogService.log({
            user_id: request.user.sub,
            entity_type: this.extractEntityType(request.path),
            entity_id: data?.id || request.params.id,
            action: this.mapMethodToAction(request.method),
            changes: request.method !== 'DELETE' ? request.body : null,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'],
          });
        }
      })
    );
  }
}
```

### 4.4. Error Response Format

All error responses follow a consistent format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "name must be shorter than or equal to 100 characters"
    }
  ],
  "timestamp": "2026-01-23T12:00:00Z",
  "path": "/api/trackers"
}
```
