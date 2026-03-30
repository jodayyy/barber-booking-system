# Barber Booking System

A mobile-first web app for a single-barber barbershop. Customers book appointments online; the owner manages bookings via a private dashboard.

## Tech Stack

- **Frontend & Backend** — Next.js
- **Database** — Supabase (PostgreSQL)
- **Hosting** — Vercel
- **Notifications** — WhatsApp via `wa.me` link

## Features

- Book appointments by selecting a date and available time slot
- Unique booking link per customer for viewing and cancelling
- WhatsApp confirmation with pre-filled booking summary
- Owner dashboard to view and cancel bookings by date
- Owner settings: working hours, slot interval, booking window, blocked dates
- Bookings auto-deleted after 7 days

## Future Plans

- Automated WhatsApp notifications (Twilio or similar)
- Multiple barbers and service types
- Payment integration
- Customer login and booking history
