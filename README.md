# Moonriver Music Education Platform

A full-featured music education platform built with **Next.js 15**, **Auth0** authentication, **Google Calendar** integration via Token Vault, and **AI-powered RAG search**.

## Screenshots

| Student Dashboard | AI Instructor Matching |
|:-:|:-:|
| ![Student Dashboard](docs/screenshots/screenshot-3.png) | ![Find Instructors](docs/screenshots/screenshot-4.png) |

| Schedule & Google Calendar | Admin Command Center |
|:-:|:-:|
| ![Schedule](docs/screenshots/screenshot-2.png) | ![Admin Dashboard](docs/screenshots/screenshot-1.png) |

## Demo Accounts

> Create these accounts in Auth0 Dashboard (User Management > Users > Create User) with connection `Username-Password-Authentication`, then assign the corresponding role.

| Role | Email | Password | What you'll see |
|------|-------|----------|-----------------|
| **Student** | `student@moonriver.com` | `Moonriver2026!` | 3 enrolled courses, upcoming lessons, AI instructor matches |
| **Creator** | `creator@moonriver.com` | `Moonriver2026!` | 3 courses with enrolled students, lesson schedule, student management |
| **Admin** | `admin@moonriver.com` | `Moonriver2026!` | Platform-wide stats, RAG-powered AI search, all user data |

### Test Data Overview

**Student account** (`student@moonriver.com` — Alex Thompson):
- Enrolled in: Guitar Fundamentals (35%), Music Theory Essentials (60%), Jazz Improvisation (20%)
- Upcoming lessons with Sarah Johnson and Dr. Emily Rodriguez
- Matched with 4 instructors based on interests (Guitar, Music Theory, Rock)

**Creator account** (`creator@moonriver.com` — Sarah Johnson):
- Teaching: Guitar Fundamentals, Piano Mastery, Jazz Improvisation Workshop
- 45 total students, 4.9 rating, Juilliard graduate
- Scheduled lessons with Alex Thompson and Maria Garcia

**Admin account** (`admin@moonriver.com`):
- Full platform statistics dashboard
- RAG-powered natural language search across all data
- Access to all courses, students, creators, and appointments

## Features

### Role-Based Dashboards
- **Student Dashboard** — Enrolled courses, progress tracking, appointment scheduling, AI recommendations
- **Creator Dashboard** — Course management, student overview, schedule management, teaching tools
- **Admin Dashboard** — Platform statistics, RAG-powered AI search across all data, user management

### Auth0 Authentication
- Secure login/logout with Auth0
- Role-based access control (Admin, Creator, Student)
- Automatic Student role assignment for new users
- Auth0 Management API integration for role management

### Google Calendar Integration (Token Vault)
- Auth0 Token Vault for secure Google token management
- Connect Google accounts via Auth0 Connected Accounts
- Sync Moonriver appointments to Google Calendar
- Fetch Google Calendar events into the platform

### AI-Powered RAG Search (Admin)
- Natural language search across all platform data
- Search appointments, courses, enrollments, students, creators
- Powered by OpenRouter API with fallback responses
- Context-aware responses based on user role

### Course Management
- Browse course catalog with filters (level, category)
- Enroll/unenroll in courses
- Track progress per course
- Creators can create and manage courses

### Appointment Scheduling
- Create, reschedule, and cancel appointments
- Calendar month view with appointment indicators
- Role-based appointment visibility
- Google Calendar sync for appointments

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Auth**: Auth0 (`@auth0/nextjs-auth0` v4)
- **Styling**: Tailwind CSS with custom mango/orange theme
- **Icons**: Lucide React
- **AI**: OpenRouter API (RAG implementation)
- **Calendar**: Google Calendar API via Auth0 Token Vault
- **Database**: Neon (serverless PostgreSQL)
- **Language**: TypeScript

## Getting Started

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd moonriver
npm install
```

### 2. Configure Environment

```bash
cp env.example .env.local
```

Required variables:
- **Auth0**: `AUTH0_SECRET`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- **Auth0 Management**: `AUTH0_MANAGEMENT_CLIENT_ID`, `AUTH0_MANAGEMENT_CLIENT_SECRET`
- **Auth0 Scope**: must include `offline_access` for Token Vault
- **Auth0 Audience**: must point to a custom API with **Allow Offline Access** enabled
- **OpenRouter** (for AI): `OPENROUTER_API_KEY`
- **Database**: `DATABASE_URL` (Neon PostgreSQL connection string)

### 3. Auth0 Setup

1. Create an Auth0 application (**Regular Web Application**)
2. Set Allowed Callback URLs: `http://localhost:3000/auth/callback`
3. Set Allowed Logout URLs: `http://localhost:3000`
4. Create roles in Auth0: `Admin`, `Creator`, `Student`
5. Create a Machine-to-Machine app for Management API access
6. Grant it permissions: `read:users`, `update:users`, `read:roles`, `create:role_members`, `read:role_members`

**For Google Calendar (Token Vault):**
1. Add Google social connection (Authentication > Social > google-oauth2)
2. Enable **Connected Accounts** on the connection (via Management API: `PATCH /api/v2/connections/{id}` with `{"connected_accounts":{"active":true}}`)
3. Enable **Offline Access** on the Google connection (Connection Permissions)
4. Create **My Account API**: identifier `https://YOUR_DOMAIN/me/`, scope `create:me:connected_accounts`, enable **Allow Offline Access**
5. Enable grant types on your app: **Refresh Token**, **Token Vault**
6. Set `AUTH0_AUDIENCE` to the My Account API identifier
7. Set `AUTH0_SCOPE` to `openid profile email offline_access create:me:connected_accounts`

### 4. Database Setup

1. Create a free database at [neon.tech](https://neon.tech)
2. Add connection string to `.env.local`:
   ```
   DATABASE_URL='postgresql://user:password@host/database?sslmode=require'
   ```
3. Run schema: `psql $DATABASE_URL -f scripts/schema.sql`
4. Seed test data: `npx tsx scripts/seed-from-json.ts`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
moonriver/
├── lib/auth0.js              # Auth0 client configuration
├── data/
│   ├── database.json         # Courses, creators, students, enrollments, matches
│   └── appointments.json     # Appointments data
├── scripts/
│   ├── schema.sql            # Database schema
│   └── seed-from-json.ts     # Seed script
├── src/
│   ├── app/
│   │   ├── page.tsx          # Landing page + role-based redirect
│   │   ├── layout.tsx        # Root layout with Auth0Provider
│   │   ├── admin/dashboard/  # Admin dashboard with RAG search
│   │   ├── creator/          # Creator pages (dashboard, courses, schedule, students)
│   │   ├── student/          # Student pages (dashboard, courses, appointments, progress)
│   │   └── api/              # API routes
│   │       ├── ai-assistant/ # RAG-powered AI search
│   │       ├── appointments/ # CRUD appointments
│   │       ├── courses/      # Course management
│   │       ├── google-calendar/ # Google Calendar integration (Token Vault)
│   │       ├── user-roles/   # Auth0 role fetching
│   │       └── ...
│   ├── components/           # Shared components (Sidebar, DashboardHeader, RoleGuard)
│   ├── contexts/             # UserContext with role management
│   └── lib/                  # Utility functions, Google Calendar token helper
├── tailwind.config.js        # Custom theme colors
└── env.example               # Environment variable template
```

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full platform access, RAG search, user management, all data |
| **Creator** | Course creation, student management, schedule, own data |
| **Student** | Course enrollment, appointments, progress tracking, AI assistant |

## Color Scheme

- Primary: `#F2B949` (Gold)
- Mango Orange: `#F27430`
- Dash Primary: `#F97316` (Orange)
- Background: `#FFFCF5` (Warm White)
