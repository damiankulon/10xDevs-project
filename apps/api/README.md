# Kipio API

NestJS backend API for the Kipio tracker application.

## Available Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Dashboard

- `GET /api/dashboard` - Get dashboard with trackers and summary statistics
  - Query params:
    - `sparkline_days` (optional, default: 7, max: 30) - Number of days for sparkline data
  - Returns: Active trackers with sparkline data, trends, and summary statistics
  - Auth: Required (JWT)

### Trackers

- `POST /api/trackers` - Create a new tracker
- `GET /api/trackers/:trackerId/stats` - Get detailed statistics for a tracker
  - Path params:
    - `trackerId` (required) - UUID of the tracker
  - Query params:
    - `period` (optional, default: "7d") - Statistics period: `7d`, `30d`, `90d`, `1y`, `all`
  - Returns: Numeric stats, chart data, and heatmap data
  - Auth: Required (JWT)
  - Authorization: User must own the tracker or have it shared with them

### Profiles

- `GET /api/profiles/me` - Get current user profile
- `PATCH /api/profiles/me` - Update current user profile
- `POST /api/profiles/complete-onboarding` - Complete user onboarding

## Running the API

### Development

```bash
pnpm dev
```

### Production Build

```bash
pnpm build
pnpm start:prod
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov
```

## Environment Variables

Create a `.env` file in the `apps/api` directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_jwt_secret

# Server Configuration
PORT=3000
NODE_ENV=development
```

## Architecture

### Module Structure

- **AuthModule** - Authentication and authorization
- **DashboardModule** - Dashboard statistics and overview
- **TrackersModule** - Tracker CRUD and statistics
- **ProfilesModule** - User profile management
- **EntriesModule** - Tracker entries management
- **SupabaseModule** - Supabase database client

### Key Features

#### Dashboard Statistics

The dashboard endpoint provides optimized data retrieval for the main dashboard view:

- Batch queries to avoid N+1 problems
- Sparkline data with configurable time ranges
- Trend calculation (up/down/stable) based on data comparison
- Summary statistics (total trackers, active trackers, entries today/this week)

#### Tracker Statistics

Detailed statistics endpoint with:

- Flexible time periods (7d, 30d, 90d, 1y, all)
- Numeric statistics (count, average, min, max, median, standard deviation)
- Chart-ready data (labels and values arrays)
- Heatmap data for activity visualization
- Access control (owner or shared tracker)

### Performance Optimizations

- **Batch Queries**: Dashboard uses single query with IN clause for last entries
- **Database Aggregation**: Statistics calculated using PostgreSQL functions
- **Efficient Filtering**: Queries use composite indexes on (tracker_id, recorded_at)
- **Parallel Execution**: Dashboard fetches trackers and summary in parallel

## Security

- **JWT Authentication**: All protected endpoints require valid JWT token
- **RLS Policies**: Database-level Row Level Security enforced via Supabase
- **Input Validation**: All DTOs validated using class-validator
- **UUID Validation**: Tracker IDs validated for proper UUID format
- **Access Control**: Tracker access verified (owner or shared)

## Error Handling

Standard error responses follow this format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "sparkline_days",
      "message": "sparkline_days must be at most 30"
    }
  ]
}
```

Common status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid JWT)
- `403` - Forbidden (no access to resource)
- `404` - Not Found
- `500` - Internal Server Error
