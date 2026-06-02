# 🚀 Quick Start - Deal Exchange Platform MVP 

## You Have a Complete MVP! ✅

This is a **production-ready** web application with:
- ✅ Broker signup & approval workflow
- ✅ Listing management with image upload  
- ✅ Admin credit system
- ✅ Real-time broker chat
- ✅ Public enquiry forms
- ✅ Admin moderation panel
- ✅ Full authentication & role-based access control

## 5-Minute Setup

### Step 1: Supabase Account
1. Go to https://supabase.com (free tier OK)
2. Create new project
3. Go to Settings → API
4. Copy your **Project URL** and **Anon Key** and **Service Role Key**

### Step 2: Configure Environment
Create `.env.local` in project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Step 3: Initialize Database
1. In Supabase, go to SQL Editor
2. New Query
3. Copy entire content of `supabase/migrations/001_initial_schema.sql`
4. Paste and run
5. Add sample areas:
```sql
INSERT INTO areas (name, city, slug) VALUES 
('Palm Jumeirah', 'Dubai', 'palm-jumeirah'),
('Downtown Dubai', 'Dubai', 'downtown-dubai'),
('Business Bay', 'Dubai', 'business-bay');
```

### Step 4: Run
```bash
npm install
npm run dev
```
Visit http://localhost:3000

### Step 5: Create Admin
1. In Supabase Auth, create user with your email
2. In SQL Editor:
```sql
INSERT INTO users (id, email, first_name, last_name, role, status)
VALUES ('your-user-id-from-auth', 'admin@example.com', 'Admin', 'User', 'admin', 'approved');
```

## Test It

**Test 1: Broker Signup** (2 min)
- Go to `/apply`  
- Fill form, submit
- Go to `/admin` (as admin)
- Click "Approve"
- Test newly approved broker can access `/dashboard`

**Test 2: List Property** (3 min)
- As approved broker, go to `/post-listing`
- Fill multi-step form
- Upload image
- Go to `/admin`, approve listing
- See in public feed

**Test 3: Public Enquiry** (1 min)
- Log out
- Browse marketplace
- Click enquiry on listing
- Fill form (name, email)
- As broker, check `/dashboard/enquiries`

**Test 4: Chat** (1 min)
- Two approved brokers view same listing
- Open chat in listing detail
- Send messages
- See real-time updates

## Key Pages

| URL | Role | Purpose |
|-----|------|---------|
| `/` | Public | Home page |
| `/apply` | Anyone | Broker registration |
| `/signin` | Public | Sign in |
| `/listings` | Broker | Marketplace |
| `/post-listing` | Broker | Create listing |
| `/dashboard` | Broker | Dashboard |
| `/dashboard/listings` | Broker | My listings |
| `/dashboard/enquiries` | Broker | Received leads |
| `/dashboard/chat` | Broker | Messaging |
| `/admin` | Admin | Control panel |

## What Each Role Can Do

**Public User (not logged in)**
- Browse listings
- Filter by area, price, type
- Submit enquiries
- Can't see broker details or contact them directly

**Broker (approved)**
- Create listings (1 credit per listing)
- Upload images
- View moderation status
- Chat with other brokers per listing
- Check enquiries
- Manage profile & covered areas

**Broker (pending approval)**
- View status page
- Can't access dashboard until approved

**Admin**
- Approve/reject broker applications
- Approve/reject listings
- Assign credits to brokers
- Suspend/deactivate brokers
- Monitor all activity
- Export leads as CSV

## API Quick Reference

```
Broker signup:
  POST /api/apply

Listing operations:
  POST /api/listings/create
  PUT /api/listings/[id]
  DELETE /api/listings/[id]
  POST /api/listings/upload-image

Chat:
  GET /api/chat/[listingId]
  POST /api/chat/[listingId]

Admin:
  POST /api/admin/action (approve/reject)
  POST /api/admin/credits (assign credits)
  GET /api/admin/overview (dashboard)
  GET /api/export/leads (CSV export)

Public:
  POST /api/leads/public (enquiry)
  GET /api/public/overview (stats)
```

## File Structure

```
src/
├── app/api/           ← All API routes here
├── app/admin/         ← Admin dashboard pages
├── app/dashboard/     ← Broker dashboard pages
├── app/listings/      ← Listing marketplace
├── app/apply/         ← Broker signup
├── auth/              ← Authentication logic
├── components/        ← Reusable UI components
├── lib/               ← Utilities & data fetching
└── types/             ← TypeScript types

supabase/
└── migrations/        ← Database schema (SQL)

Documentation:
├── IMPLEMENTATION_GUIDE.md     ← 2000+ lines
├── REQUIREMENTS_VERIFICATION.md ← Feature checklist
├── README_MVP.md               ← Overview
└── BUILD_SUMMARY.md            ← What was built
```

## Database Tables

All created automatically via SQL migration:

- `users` - Platform users
- `broker_profiles` - Broker info
- `broker_credits` - Credit balance
- `listings` - Properties
- `listing_images` - Images
- `leads` - Enquiries
- `chat_messages` - Chat
- `activity_log` - Audit trail
- Plus others (agencies, areas, etc.)

## Deploy to Vercel

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial MVP"
git remote add origin ...
git push -u origin main

# Then:
# 1. Go to vercel.com
# 2. Import GitHub repo
# 3. Add .env.local variables
# 4. Click Deploy
```

## Troubleshooting

**"Cannot create listing"?**
- Check broker has credits (admin assigns them)
- Check user status is "approved"

**Chat messages not appearing?**
- Ensure both users are approved brokers
- Check database connection

**Stuck on approval page?**
- Admin hasn't approved your application yet
- Check user.status in database

**500 errors?**
- Check .env.local variables
- Verify API keys in Supabase
- Check database tables exist (run SQL migration)

## What's Next?

1. ✅ Set up locally (5 min)
2. ✅ Test workflows (10 min)
3. ✅ Deploy to Vercel (5 min)
4. ⏭️ Customize branding (colors, logo)
5. ⏭️ Add email notifications (Supabase Functions)
6. ⏭️ WhatsApp integration (Twilio)
7. ⏭️ Advanced analytics

## Full Documentation

Read these for details:
- **IMPLEMENTATION_GUIDE.md** - Complete setup + deployment
- **REQUIREMENTS_VERIFICATION.md** - Feature checklist
- **README_MVP.md** - Architecture overview
- **BUILD_SUMMARY.md** - What was implemented

## Support

All major features are documented in code with comments.

For questions:
1. Check the docs above
2. Search code for the feature name
3. Review Supabase/Next.js documentation

---

**You're ready to go! Start with Step 1 above. 🚀**

Questions? Read IMPLEMENTATION_GUIDE.md for comprehensive details.
