# Moonriver Music Education Platform

A full-featured music education platform built with **Next.js 15**, **Auth0** authentication, **Google Calendar** integration, and **AI-powered RAG search**.

## Features

### Role-Based Dashboards
- **Student Dashboard** - Enrolled courses, progress tracking, appointment scheduling, AI recommendations
- **Creator Dashboard** - Course management, student overview, schedule management, teaching tools
- **Admin Dashboard** - Platform statistics, RAG-powered AI search across all data, user management

### Auth0 Authentication
- Secure login/logout with Auth0
- Role-based access control (Admin, Creator, Student)
- Automatic Student role assignment for new users
- Auth0 Management API integration for role management

### Google Calendar Integration
- OAuth 2.0 flow for connecting Google accounts
- Sync Moonriver appointments to Google Calendar
- Fetch Google Calendar events into the platform
- Per-user Google Calendar connections

### AI-Powered RAG Search (Admin)
- Natural language search across all platform data
- Search appointments, courses, enrollments, students, creators
- Powered by OpenRouter API with fallback responses
- Context-aware responses based on user role
- Quick search suggestions

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
- **Calendar**: Google Calendar API
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

Copy the example env file and fill in your credentials:

```bash
cp env.example .env.local
```

Required variables:
- **Auth0**: `AUTH0_SECRET`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- **Auth0 Management**: `AUTH0_MANAGEMENT_CLIENT_ID`, `AUTH0_MANAGEMENT_CLIENT_SECRET`
- **OpenRouter** (for AI): `OPENROUTER_API_KEY`
- **Google Calendar** (optional): via Auth0 Token Vault — add Google connection, enable Offline Access, create My Account API, enable Token Vault grant (see `env.example`)

### 3. Auth0 Setup

1. Create an Auth0 application (Regular Web Application)
2. Set Allowed Callback URLs: `http://localhost:3000/auth/callback`
3. Set Allowed Logout URLs: `http://localhost:3000`
4. Create roles in Auth0: `Admin`, `Creator`, `Student`
5. Create a Machine-to-Machine app for Management API access
6. Grant it permissions: `read:users`, `read:roles`, `update:users`

### 4. Neon Database Setup

1. Create a free database at [neon.tech](https://neon.tech)
2. Copy the connection string and add to `.env.local`:
   ```
   DATABASE_URL='postgresql://user:password@host/database?sslmode=require'
   ```
3. Run the schema in Neon SQL Editor (or `psql $DATABASE_URL -f scripts/schema.sql`)
4. (Optional) Seed from existing JSON data: `npm run db:seed`

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
│   ├── database.json         # Courses, creators, students, enrollments
│   └── appointments.json     # Appointments data
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
│   │       ├── google-calendar/ # Google Calendar integration
│   │       ├── user-roles/   # Auth0 role fetching
│   │       └── ...
│   ├── components/           # Shared components (Sidebar, DashboardHeader)
│   ├── contexts/             # UserContext with role management
│   └── lib/                  # Utility functions
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
