# Barber Booking System

A mobile-first web app for a single-barber barbershop. Customers book appointments online; the owner manages bookings via a private dashboard.

## Tech Stack

- **Framework** — Next.js 16.2.1, React 19, TypeScript
- **Styling** — Tailwind CSS v4
- **Database** — Supabase (PostgreSQL), accessed server-side only via service role key
- **Auth** — HMAC-signed session cookie (`admin_session`), no external auth library
- **Hosting** — Vercel (with cron jobs)

## Features

### Customer
- Browse available dates and time slots
- Book an appointment with name and phone number
- Receive a unique booking link for viewing or cancelling
- WhatsApp pre-filled message to confirm booking with the barber

### Admin Dashboard
- View bookings by date with a 5-day date strip
- Per-day booking count indicators
- Cancel or hard-delete bookings
- WhatsApp link per booking for direct customer contact
- Manage working hours, slot intervals, and booking window
- Block specific dates via date overrides
- Reset weekly schedule to defaults

### System
- Bookings auto-deleted 7 days after the appointment date (Vercel cron, daily at 3 AM)
- Optional map button linking to shop location (Google Maps)

## Project Structure

```
app/
  page.tsx                   # Customer booking page
  booking/[id]/page.tsx      # Customer booking detail & cancel
  admin/
    login/page.tsx
    dashboard/page.tsx
    settings/page.tsx
  api/
    status/                  # Shop open status + booking window
    availability/            # Available dates
    slots/                   # Available + booked slots for a date
    bookings/                # Create, get, cancel, lookup bookings
    admin/
      bookings/              # Admin: list, delete bookings
      settings/              # booking_window, slot_interval
      schedule/              # Weekly schedule
      date-overrides/        # Date-specific overrides
      login/ logout/
    cron/cleanup/            # Auto-delete old bookings
components/ui/               # Shared UI components
lib/                         # Supabase client, auth helpers
```

## Database Schema

| Table | Key Columns |
|---|---|
| `bookings` | `id` (uuid), `name`, `phone`, `date`, `slot` (HH:MM), `status` (`active`\|`cancelled`), `code` (6-char), `created_at` |
| `settings` | `key` / `value` — stores `booking_window` (days), `slot_interval` (minutes) |
| `weekly_schedule` | `day_of_week` (0–6), `start_time`, `end_time`, `is_closed` |
| `date_overrides` | `date`, `start_time`, `end_time`, `is_closed` |

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `SESSION_SECRET` | Yes | 32-byte hex secret for HMAC session signing — `openssl rand -hex 32` |
| `CRON_SECRET` | Yes | Bearer token Vercel sends to cron endpoints — `openssl rand -hex 32` |
| `NEXT_PUBLIC_SHOP_COORDINATES` | No | `lat,lng` — enables map button on booking page |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the customer page, and [http://localhost:3000/admin](http://localhost:3000/admin) for the admin login.

## Future Plans

- Automated WhatsApp notifications (Twilio or similar)
- Multiple barbers and service types
- Payment integration
- Customer login and booking history
