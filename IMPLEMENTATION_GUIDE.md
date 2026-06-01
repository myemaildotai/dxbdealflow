# Deal Exchange Platform - MVP Implementation Guide

## Overview

This is a complete Next.js + Supabase MVP implementation of the Deal Exchange Platform, a private broker-to-broker real estate marketplace.

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, React Hook Form
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Deployment**: Vercel compatible
- **Database**: PostgreSQL with RLS (Row Level Security)

## Project Structure

```
src/
├── app/
│   ├── api/                 # API routes
│   │   ├── admin/          # Admin endpoints
│   │   ├── apply/          # Broker signup
│   │   ├── chat/           # Chat messages
│   │   ├── leads/          # Lead management
│   │   ├── listings/       # Listing CRUD
│   │   ├── export/         # CSV export
│   │   └── public/         # Public endpoints
│   ├── admin/              # Admin dashboard
│   ├── dashboard/          # Broker dashboard
│   ├── listings/           # Broker listing feed
│   ├── post-listing/       # Listing creation wizard
│   ├── apply/              # Broker application form
│   ├── signin/             # Sign in page
│   ├── requirements/       # Buyer requirements
│   └── page.tsx            # Public home page
├── auth/                    # Authentication logic
│   ├── authContext.ts
│   ├── authOperations.ts
│   ├── AuthProvider.tsx
│   ├── types.ts
│   └── useAuth.ts
├── components/             # Reusable UI components
│   ├── AppShell.tsx       # Dashboard layout
│   ├── ListingCard.tsx    # Listing preview
│   ├── EnquiryModal.tsx   # Enquiry form modal
│   ├── forms/             # Form components
│   ├── layout/            # Layout components
│   ├── modals/            # Modal components
│   └── ui/                # Basic UI elements
├── lib/                    # Utilities & API functions
│   ├── deal-api.ts        # API client
│   ├── deal-data.ts       # Data fetching logic
│   ├── deal-server.ts     # Server utilities
│   ├── deal-types.ts      # TypeScript types
│   ├── deal-utils.ts      # Helper functions
│   ├── supabase.ts        # Supabase client
│   ├── route-access.ts    # Route protection
│   └── storage.ts         # Local storage utilities
├── theme/                  # Theme configuration
└── types/                  # Global types
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- Supabase account (free tier works for MVP)
- npm/yarn package manager

### 2. Environment Configuration

Create `.env.local` file in project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# WhatsApp Integration (Optional)
NEXT_PUBLIC_WHATSAPP_PREFIX=https://wa.me/
```

Get these values from your Supabase dashboard:
- Go to Settings → API
- Copy your project URL and keys
- The anon key is for client-side use
- The service role key is for server-side use (keep secure!)

### 3. Database Setup

#### Option A: Using Supabase SQL Editor (Recommended for MVP)

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Click "New Query"
4. Copy the entire content of `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click "Run"

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 4. Install Dependencies

```bash
npm install
# or
yarn install
```

### 5. Initialize Seed Data (Areas)

Add initial areas for the platform:

```sql
INSERT INTO areas (name, city, slug) VALUES
('Palm Jumeirah', 'Dubai', 'palm-jumeirah'),
('Downtown Dubai', 'Dubai', 'downtown-dubai'),
('Business Bay', 'Dubai', 'business-bay'),
('Jumeirah', 'Dubai', 'jumeirah'),
('Marina', 'Dubai', 'marina'),
('JBR', 'Dubai', 'jbr'),
('Deira', 'Dubai', 'deira'),
('Bur Dubai', 'Dubai', 'bur-dubai'),
('DIFC', 'Dubai', 'difc'),
('Emaar Beachfront', 'Dubai', 'emaar-beachfront');
```

### 6. Create Admin User

In Supabase Auth:
1. Go to Authentication → Users
2. Create a new user with your admin email
3. Set password

Then in the database (SQL Editor):

```sql
INSERT INTO users (id, email, first_name, last_name, role, status, created_at, updated_at)
VALUES (
  'uid-from-auth',  -- Get this from Auth users list
  'admin@example.com',
  'Admin',
  'User',
  'admin',
  'approved',
  NOW(),
  NOW()
);
```

### 7. Configure Supabase Storage

1. Go to Storage → Buckets
2. Create a new bucket named "listings" (make it public)
3. Configure CORS if needed
4. Optionally create folders: `listings/`, `requirements/`, `documents/`

### 8. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Key Features Implementation

### 1. User Authentication Flow

**Public Users**
- Sign in with email/password
- Browse public listings
- Submit enquiries
- NO dashboard access

**Brokers**
- Sign up with agency details
- Status: `pending` → Admin approves → `approved`
- Only `approved` brokers access dashboard
- Dashboard restrictions before approval

**Admin**
- Created manually in Supabase Auth
- Role: `admin`
- Full access control panel

### 2. Broker Approval System

```
Flow: /apply → POST /api/apply → pending status
↓
Admin reviews: /admin → POST /api/admin/action
↓
Case 1: Approve → status = approved, dashboard unlocked
Case 2: Reject → status = deactivated, access blocked
```

### 3. Listing Credit System

**Credit Flow:**
1. Admin assigns credits: POST `/api/admin/credits`
2. Broker publishes listing: POST `/api/listings/create`
3. Credits deducted automatically (1 per listing)
4. Broker can see balance in dashboard

**Key Rules:**
- Credits only assigned by admin
- Each listing consumes 1 credit on publish
- No payment system
- Listings persist until manually deleted
- Listings stay active indefinitely once approved

### 4. Broker-to-Broker Chat

**Per-Listing Only:**
```
Listing Created
  ↓
Other brokers view listing
  ↓
They can join chat → POST /api/chat/[listingId]
  ↓
Realtime messages with Supabase subscriptions
```

**Participants Tracked:**
- Anyone with access can chat
- Chat is listing-specific
- Messages persist in database
- Admin can view read-only

### 5. Public Enquiry System

**Unauthenticated User Flow:**
```
Public home page
  ↓
Browse/filter listings
  ↓
Click enquiry → submit form
  ↓
POST /api/leads/public
  ↓
Lead created, broker notified
```

**Fields Required:**
- Contact name
- Contact email
- Phone (optional)
- Message (optional)
- Preferred channel (email/WhatsApp/both)

### 6. Listing Management

**Creation:**
```
/post-listing → Multi-step form
  Step 1: Property details (type, bedrooms, area)
  Step 2: Deal details (price, payment plan, handover)
  Step 3: Co-broke terms
  Step 4: Image upload
  ↓
POST /api/listings/create
  ↓
Status: pending (awaits admin approval)
```

**Publishing:**
- Requires available credits
- Images upload to Supabase Storage
- Automatic credit deduction
- Admin approves before visibility

**Editing:**
- Only pending listings can be edited
- PUT /api/listings/[id]
- Cannot edit after approval

## API Endpoints Reference

### Public Endpoints
- `GET /api/public/overview` - Platform stats
- `POST /api/leads/public` - Submit enquiry

### Broker Endpoints (requires approval)
- `POST /api/apply` - Broker application
- `GET /api/listings` - Browse listings
- `POST /api/listings/create` - Create listing
- `PUT /api/listings/[id]` - Update listing
- `DELETE /api/listings/[id]` - Delete listing
- `POST /api/listings/upload-image` - Upload image
- `GET/POST /api/chat/[listingId]` - Chat messages
- `POST /api/leads` - Create lead (broker-to-broker)

### Admin Endpoints (requires admin role)
- `GET /api/admin/overview` - Dashboard stats
- `POST /api/admin/action` - Approve/reject applications/listings
- `GET /api/admin/applications` - Pending broker applications
- `GET /api/admin/listings` - Pending listings
- `POST /api/admin/credits` - Assign credits
- `GET /api/export/leads` - CSV export

## Database Schema

### Core Tables

**users**
- Platform user accounts
- Linked to Supabase Auth via UUID
- Fields: id, email, first_name, last_name, phone, role, status, agency_id

**broker_profiles**
- Extended broker information
- Linked to users table
- Fields: user_id, agency_id, rera_brn, covered_area_ids, speciality, experience_years, etc.

**broker_credits**
- Credit balance tracking
- One record per broker
- Fields: user_id, available_credits, used_credits, total_credits_assigned

**listings**
- Property listings
- Soft-delete via visibility flag
- Fields: id, title, property_type, deal_type, price, area_id, created_by, status, is_visible

**listing_images**
- Images for listings
- Stored in Supabase Storage
- Fields: id, listing_id, file_name, storage_path, public_url, is_cover

**leads**
- Enquiries and requirement matches
- Tracks communication channels
- Fields: id, listing_id, requirement_id, from_user_id, to_user_id, lead_type, lead_status

**chat_messages**
- Real-time broker chat
- Per-listing only
- Fields: id, listing_id, sender_id, content, created_at

**activity_log**
- Audit trail
- Fields: id, actor_user_id, action, target_table, target_id, metadata, created_at

## UI Components

### Pages Built
- ✅ `/` - Public home
- ✅ `/apply` - Broker application form
- ✅ `/signin` - Sign in page
- ✅ `/listings` - Broker listing feed
- ✅ `/post-listing` - Listing creation wizard
- ✅ `/dashboard` - Broker dashboard
- ✅ `/dashboard/listings` - My listings
- ✅ `/dashboard/enquiries` - Received enquiries
- ✅ `/dashboard/chat` - Broker chat
- ✅ `/admin` - Admin panel

### Reusable Components
- `ListingCard` + `ListingCardGrid`
- `EnquiryModal`
- `AppShell` (dashboard layout)
- `StatCard`
- `EmptyState`
- Form components with validation

## Deployment to Vercel

### 1. Prepare for Production

```bash
# Build the project
npm run build

# Test build locally
npm run start
```

### 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial MVP commit"
git remote add origin https://github.com/yourusername/deal-exchange
git push -u origin main
```

### 3. Connect to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click Deploy

### 4. Production Checklist

- [ ] Supabase RLS policies are secure
- [ ] Service role key is server-side only
- [ ] Email notifications configured (optional)
- [ ] Storage buckets have correct permissions
- [ ] Database backups enabled
- [ ] Admin user created

## Security Considerations

### Row Level Security (RLS)
- Users can only see their own data
- Broker see own listings and assigned leads
- Admin see all data
- Public can view approved listings only

### API Security
- All broker endpoints require approval status
- Admin endpoints use role check
- Service role key used server-side only
- Authentication token validated on each request

### Storage Security
- Public listings bucket is readable
- Only brokers can upload via API
- Filename includes listing ID for attribution

## Testing Workflows

### Test 1: Broker Signup Flow
1. Navigate to /apply
2. Fill form with valid data
3. Verify "application pending" message
4. Switch to admin, approve broker
5. Switch to broker account, verify dashboard access

### Test 2: Listing Creation
1. As approved broker, go to /post-listing
2. Fill all steps
3. Upload 1+ image
4. Verify "pending admin approval" message
5. As admin, approve listing
6. View in public feed

### Test 3: Public Enquiry
1. As public user (logged out), view /listings
2. Click enquiry on listing
3. Fill form with name, email
4. Submit
5. As broker, check /dashboard/enquiries
6. Verify lead appears

### Test 4: Chat
1. As broker, view approved listing
2. In detail view, access chat
3. Send message
4. Another broker views same listing
5. See message history (Supabase realtime subscription)

## Troubleshooting

### "Insufficient credits" error
- Admin hasn't assigned credits yet
- Check broker_credits table for user
- Admin: POST /api/admin/credits

### Listings not appearing
- Check listing status = "approved"
- Check is_visible = true
- Verify images uploaded
- Admin may need to approve

### Auth redirect loops
- Check route-access.ts for authorization logic
- Verify user status and role in DB
- Check broker profile exists for brokers

### Supabase connection errors
- Verify .env.local has correct keys
- Check Supabase project is active
- Test with curl: `curl https://your-project.supabase.co`

## Performance Optimization

### Current Implementation
- Server-side API routes minimize client bundles
- Supabase realtime subscriptions for chat
- Database indexes on common queries
- RLS policies optimize query plans

### Future Enhancements
- Add image CDN (Cloudinary/Imgix)
- Implement caching layer (Redis)
- Add search indexing (Meilisearch/Algolia)
- Pagination for large result sets

## Maintenance

### Regular Tasks
- Monitor Supabase storage usage
- Review activity logs for suspicious activity
- Backup database (Supabase automates this)
- Update dependencies monthly

### Scaling Considerations
- Supabase scales automatically
- May need to increase plan as user base grows
- Consider separate read replicas for analytics
- Implement webhook queuing for async tasks

## Support & Resources

- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com
- React Hook Form: https://react-hook-form.com

## License

This MVP is provided as-is for the Deal Exchange Platform.
