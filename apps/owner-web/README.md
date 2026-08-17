# Turf Owner Web Application (React + TypeScript)

Owner-facing React application for Turvo Phase 1. Foundation is implemented:
environment configuration, Supabase Auth client, central `/api/v1` API client,
auth context with protected routes (owner role), app shell and profile.

## Module status (spec section 34)

| Page | Status |
|------|--------|
| Registration | Not started |
| Login / Forgot / Reset password | Implemented |
| Dashboard | Placeholder |
| Profile | Implemented |
| My Turfs / Create / Edit / Details / Submission status | Not started |
| Sports / Facilities / Rules / Equipment | Not started |
| Courts | Not started |
| Operating Hours / Availability / Pricing | Not started |
| Bookings / Booking details | Not started |
| Notifications / Earnings / Reports | Not started |

## Run

```bash
npm install
cp .env.example .env.local   # fill in Supabase project values
npm run dev                  # http://localhost:5174 (proxies /api to :4000)
```
