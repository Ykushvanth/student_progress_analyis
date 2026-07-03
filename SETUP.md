# SPAS Setup Guide

Student Performance Analysis System - Complete setup instructions.

## Prerequisites

- Node.js 16+ and npm
- PostgreSQL database (via Supabase)
- Git (optional)

## Project Structure

```
student_progress_analysis_system/
├── backend/          # Node.js + Express API
├── frontend/         # React application
└── README (5).md     # Full specification
```

## Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Note your project URL and keys (Settings → API)

### 2. Run Database Migrations

The database schema is defined in README (5).md section 3. You need to run the SQL commands to create all tables.

**Required tables:**
- schools, departments, academic_batches, academic_years, semesters, sections
- roles, users, user_roles
- dean_assignment, hod_assignment, faculty_department_assignment
- courses, faculty_course_assignment
- students, student_course_enrollment
- student_course_performance, faculty_effectiveness
- workflow_stage

Execute the SQL from README (5).md in your Supabase SQL editor.

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `backend/.env` from the example:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Start Backend Server

```bash
npm run dev
```

Server runs at http://localhost:5000

Test health endpoint: http://localhost:5000/health

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `frontend/.env` from the example:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

### 3. Start Frontend Server

```bash
npm start
```

Frontend runs at http://localhost:3000

## User Setup

### Creating Users in Supabase Auth

1. Go to Supabase Dashboard → Authentication → Users
2. Add users with email (password is optional - OTP authentication is used)
3. **Important:** Enable email confirmations if you want users to verify their email first
4. Note the user's `auth.users.id` (UUID)

### Linking Users to Database

For each user, insert into `users` table:

```sql
INSERT INTO users (auth_user_id, employee_no, full_name, email, is_active)
VALUES ('uuid-from-auth', 'EMP001', 'John Doe', 'john@example.com', true);
```

### Assigning Roles

```sql
-- Get role_id
SELECT role_id FROM roles WHERE role_name = 'Faculty';

-- Assign role to user
INSERT INTO user_roles (user_id, role_id)
VALUES (1, 5);  -- Adjust IDs as needed
```

### Assigning Scope

**For Faculty:**
```sql
INSERT INTO faculty_department_assignment (user_id, department_id, academic_year_id, active)
VALUES (1, 1, 1, true);
```

**For HOD:**
```sql
INSERT INTO hod_assignment (user_id, department_id, academic_year_id, active)
VALUES (2, 1, 1, true);
```

**For Dean:**
```sql
INSERT INTO dean_assignment (user_id, school_id, academic_year_id, active)
VALUES (3, 1, 1, true);
```

## Supabase Email OTP Configuration

**CRITICAL:** Configure these settings in Supabase Dashboard before testing:

### Email Provider Settings
Navigate to **Authentication → Providers → Email**:
- ✅ Enable "Email provider"
- ✅ **REQUIRED: Enable "Allow sign ups"** 
  - **IMPORTANT:** Must be ON even for existing-users-only OTP login
  - Supabase requires this setting enabled for OTP authentication to work
  - Control access via database roles and backend authorization instead
- ✅ Enable "Confirm email" (optional, if you want email verification)

### Email OTP Settings
Navigate to **Authentication → Email Auth**:
- **Email OTP length**: Set to `8` (must match the app - currently configured for 8 digits)
- **Email OTP expiration**: `3600` seconds (1 hour recommended)
- **Enable sign ups**: Turn ON if you want users to self-register via OTP
  - If DISABLED: You must manually create users in Supabase Auth first (see "Creating Users in Supabase Auth" section above)
  - If ENABLED: New users can register via OTP automatically

### Email Templates
Navigate to **Authentication → Email Templates**:
1. Select "Magic Link" template (used for OTP emails)
2. Ensure the template includes the OTP token: `{{ .Token }}`
3. Customize the email message if desired

### SMTP Configuration (Production)
For development: Supabase uses built-in SMTP (limited to 4 emails/hour per email address)
For production: Configure custom SMTP provider in **Settings → Auth → SMTP**:
- Recommended: SendGrid, AWS SES, Mailgun, Postmark
- Add your SMTP credentials to send unlimited OTP emails

#### Step-by-Step SMTP Setup:

**1. Choose an SMTP Provider:**
- **SendGrid** (easiest, free tier: 100 emails/day) - Recommended for development
- **AWS SES** (cheapest, $0.10/1000 emails) - Recommended for production
- **Mailgun** (free tier: limited emails/month)
- **Postmark** (paid, excellent deliverability)

**2. Get SMTP Credentials:**

For **SendGrid** (example):
1. Sign up at sendgrid.com
2. Go to Settings → API Keys
3. Create new API key (select "SMTP Relay" permissions)
4. Note: `smtp.sendgrid.net`, port `587`, username `apikey`, password `<your-api-key>`

For **AWS SES**:
1. Sign up at AWS, go to SES console
2. Verify your domain or email
3. Create SMTP credentials in "SMTP Settings"
4. Note: host, port, username, password

**3. Configure in Supabase:**
1. Go to Supabase Dashboard
2. **Settings** (gear icon) → **Authentication**
3. Scroll to **SMTP Settings** section
4. Enable "Enable Custom SMTP"
5. Fill in:
   - **Host**: smtp.sendgrid.net (or your provider)
   - **Port**: 587 (TLS) or 465 (SSL)
   - **Username**: apikey (for SendGrid) or your SMTP username
   - **Password**: Your API key or SMTP password
   - **Sender email**: noreply@yourdomain.com
   - **Sender name**: SPAS System
6. Click **Save**

**4. Test:**
Try sending an OTP. You should now have unlimited email capacity.

**Cost Estimates:**
- SendGrid free: 100 emails/day (good for 10-20 users testing)
- AWS SES: $0.10 per 1000 emails (very cheap for production)
- Mailgun: Free tier limited, then $35/month

## Testing the Application

### 1. Login

Navigate to http://localhost:3000/login

**OTP Authentication Flow:**
1. Enter your email address (must exist in Supabase Auth)
2. Click "Send OTP"
3. Check your email for the 8-digit code
4. Enter the OTP code in the app
5. Click "Verify & Login"

**Note:** The system uses email-based OTP (one-time password) instead of traditional password login for enhanced security.

**Important:** If signups are disabled in Supabase, users must be manually created first (see "Creating Users in Supabase Auth" section above).

### 2. Role Selection

If user has multiple roles, select the role you want to operate under.

### 3. Faculty Flow

1. Select Academic Year and Semester
2. Select a Course Assignment
3. View enrolled students
4. Set Initial Analysis (Slow/Medium/Fast Learner)
5. Enter Sessional 1 marks (requires Initial Analysis)
6. Enter Sessional 2 marks (requires Sessional 1)
7. View auto-calculated P1, P2, and overall scores

### 4. Admin Dashboards

HOD, Dean, and IQAC dashboards show placeholder interfaces. The backend APIs are complete at:
- `/api/hod/*`
- `/api/dean/*`
- `/api/iqac/*`

## Workflow Stage Management (IQAC Only)

IQAC users can open/close workflow stages to control when faculty can enter data:

```sql
-- Check workflow stages
SELECT * FROM workflow_stage;

-- Update via IQAC dashboard or API:
POST /api/iqac/workflow-stage/:stage_id/open
POST /api/iqac/workflow-stage/:stage_id/close
```

## Effectiveness Calculation

The system implements the formulas from "Faculty Teaching Effectiveness Framework.pdf":

- **P1 (Baseline Outcome)**: Ratio of students meeting thresholds in SE-I
- **P2 (Learning Improvement)**: Ratio of students showing improvement SE-I → SE-II
- **TEC (Teaching Environment Challenges)**: Average of 4 factors (student quality, course complexity, faculty experience, class size)
- **Effectiveness Marks**: Matrix lookup (P1/P2 classification × TEC classification)
- **Final Rating**: Combined P1 + P2 effectiveness score

Calculations happen automatically when faculty enters sessional marks.

## API Endpoints

Full API documentation is in README (5).md section 6.

**Key endpoints:**
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user profile
- `GET /api/master/*` - Master data lookups
- `GET /api/faculty/assignments` - Faculty's courses
- `PUT /api/faculty/students/:id/initial-analysis` - Set student analysis
- `PUT /api/faculty/students/:id/sessional1` - Enter SE-I marks
- `PUT /api/faculty/students/:id/sessional2` - Enter SE-II marks
- `GET /api/hod/analytics` - HOD analytics
- `GET /api/dean/analytics` - Dean analytics
- `GET /api/iqac/analytics` - IQAC analytics

## Troubleshooting

### Backend won't start
- Check `.env` file has correct Supabase credentials
- Verify port 5000 is available
- Check `npm install` completed successfully

### Frontend won't connect to backend
- Verify backend is running at http://localhost:5000
- Check `REACT_APP_API_BASE_URL` in frontend `.env`
- Check CORS settings in backend `app.js`

### Login fails
- Verify user exists in Supabase Auth
- Verify user has entry in `users` table with matching `auth_user_id`
- Check user has at least one role in `user_roles`

### Cannot enter marks
- Check workflow stage is open (via `workflow_stage` table or IQAC dashboard)
- Verify faculty owns the assignment
- For Sessional 1: Initial Analysis must be set
- For Sessional 2: Sessional 1 must be set

## Next Steps

1. **Enhance Admin Dashboards**: Implement full analytics UI for HOD/Dean/IQAC
2. **Add Reporting**: Export capabilities for effectiveness reports
3. **Implement Search/Filters**: Enhanced filtering in all dashboards
4. **Add Notifications**: Email/in-app notifications for workflow stage changes
5. **Mobile Responsive**: Optimize UI for mobile devices
6. **Real TEC Inputs**: Add UI to capture course complexity, CGPA data, teaching count

## Production Deployment

See README (5).md section 1 for deployment targets:
- Frontend: Vercel/Netlify
- Backend: Render/Railway/Supabase Edge Functions

Update environment variables in your hosting platform with production Supabase credentials.

## Support

Refer to README (5).md for complete technical specification and business rules.
