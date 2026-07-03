# Student Performance Analysis System (SPAS)

A university platform that tracks student academic progress across courses, computes
faculty teaching-effectiveness scores (P1 / P2 / TEC), and gives role-based dashboards
to Faculty, HOD, Dean, and IQAC.

> **For AI coding agents (Claude Code, Cursor, Copilot, etc.):** This document is the
> single source of truth for schema, roles, routes, and business rules. Do not invent
> table names, column names, or role names that differ from what's written here — the
> database has already been created against this exact spec. When something is marked
> `PLACEHOLDER`, implement it exactly as described but keep the logic isolated so it can
> be swapped later without touching unrelated code.

---

## 1. Tech Stack

| Layer          | Technology                                   |
|----------------|-----------------------------------------------|
| Frontend       | React (Vite), plain CSS (no Tailwind/UI kit unless added later) |
| Backend        | Node.js + Express.js (REST API)               |
| Database       | PostgreSQL via Supabase                       |
| Auth           | Supabase Auth (email/password or magic link)  |
| Hosting target | Frontend: Vercel/Netlify. Backend: Render/Railway/Supabase Edge Functions |

Do not introduce a different frontend framework, ORM, or database. If Prisma/Knex/etc.
is desired later, that's a separate migration — start with the plain `pg` / Supabase
JS client against the schema below.

---

## 2. Core Concept: Multi-Role Users

A single person can simultaneously be **Faculty + HOD**, or **Faculty + Dean**, etc.
There is **no `role` column on `users`**. Role is derived from `user_roles`, and
department/school scope is derived from separate assignment tables. Never hardcode
"if user.role === 'dean'" — always resolve roles via `user_roles` and scope via the
relevant `*_assignment` table.

On login, the backend must return **all** roles the user holds, and the frontend must
let the user pick which "hat" to operate under for that session (Faculty view vs. Dean
view, etc.), then scope every subsequent query to that chosen role + its assignment
table.

---

## 3. Database Schema (PostgreSQL / Supabase)

All tables already exist in Supabase. This is the authoritative reference — use it to
write queries, not assumptions.

```sql
-- Master / lookup tables ----------------------------------------------------

CREATE TABLE schools (
    school_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_code VARCHAR(20) UNIQUE NOT NULL,
    school_name VARCHAR(150) NOT NULL,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
    department_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    department_code VARCHAR(20) UNIQUE NOT NULL,
    department_name VARCHAR(150) NOT NULL,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE academic_batches (
    batch_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_name VARCHAR(20) UNIQUE NOT NULL,   -- e.g. '2022-2026'
    start_year INT NOT NULL,
    end_year INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE academic_years (
    academic_year_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    academic_year VARCHAR(20) UNIQUE NOT NULL,   -- e.g. '2025-2026'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE semesters (
    semester_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    semester_name VARCHAR(20) UNIQUE NOT NULL,        -- e.g. 'Semester 1'
    semester_type VARCHAR(10) CHECK (semester_type IN ('Odd','Even'))
);
-- IMPORTANT: filter logic always uses semester_type ('Odd'/'Even'),
-- never semester_name, since the name is just a display label.

CREATE TABLE sections (
    section_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_name VARCHAR(10) UNIQUE NOT NULL   -- 'A', 'B', 'C'
);

-- Identity & roles ------------------------------------------------------

CREATE TABLE roles (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
    -- seeded values: Admin, IQAC, Dean, HOD, Faculty
);

CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id),  -- Supabase Auth link
    employee_no VARCHAR(30) UNIQUE,      -- e.g. 'HODCSE', 'CSE001'
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- No password_hash column — auth is handled entirely by Supabase Auth.

CREATE TABLE user_roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    role_id BIGINT REFERENCES roles(role_id),
    UNIQUE(user_id, role_id)
);

-- Scope assignment tables (year-scoped, reassignable) -----------------------

CREATE TABLE dean_assignment (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    school_id BIGINT REFERENCES schools(school_id),
    academic_year_id BIGINT REFERENCES academic_years(academic_year_id),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE hod_assignment (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    department_id BIGINT REFERENCES departments(department_id),
    academic_year_id BIGINT REFERENCES academic_years(academic_year_id),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE faculty_department_assignment (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    department_id BIGINT REFERENCES departments(department_id),
    academic_year_id BIGINT REFERENCES academic_years(academic_year_id),
    active BOOLEAN DEFAULT TRUE,
    UNIQUE (user_id, academic_year_id)
);
-- Gives every plain Faculty user a department for a given academic year.
-- Without this table, "faculty may only teach within their own department"
-- cannot be enforced — always join through it, never guess department from
-- employee_no in application code (that trick was only used for one-time
-- data seeding, not for runtime logic).

-- Academic structure ----------------------------------------------------

CREATE TABLE courses (
    course_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    course_name VARCHAR(200) NOT NULL,
    department_id BIGINT REFERENCES departments(department_id),
    year_of_study INT CHECK (year_of_study BETWEEN 1 AND 4),
    credits NUMERIC(4,1),
    status BOOLEAN DEFAULT TRUE
);
-- Courses are NOT batch-specific — the same course (e.g. DBMS) is taught to
-- every batch. Only faculty_course_assignment varies by batch/year/semester.

CREATE TABLE faculty_course_assignment (
    assignment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    faculty_id BIGINT REFERENCES users(user_id),
    course_id BIGINT REFERENCES courses(course_id),
    batch_id BIGINT REFERENCES academic_batches(batch_id),
    section_id BIGINT REFERENCES sections(section_id),
    academic_year_id BIGINT REFERENCES academic_years(academic_year_id),
    semester_id BIGINT REFERENCES semesters(semester_id),
    UNIQUE(faculty_id, course_id, batch_id, section_id, academic_year_id, semester_id)
);
-- THE central table: "which faculty teaches which course, to which batch,
-- in which section, in which academic year + semester." Every downstream
-- table (enrollment, performance, effectiveness) hangs off assignment_id,
-- not off raw faculty/course/section IDs.

CREATE TABLE students (
    student_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    register_no VARCHAR(30) UNIQUE NOT NULL,   -- e.g. '22CSE001'
    student_name VARCHAR(150) NOT NULL,
    batch_id BIGINT REFERENCES academic_batches(batch_id),
    department_id BIGINT REFERENCES departments(department_id),
    section_id BIGINT REFERENCES sections(section_id),
    email VARCHAR(255),
    status BOOLEAN DEFAULT TRUE
);

CREATE TABLE student_course_enrollment (
    enrollment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT REFERENCES students(student_id),
    assignment_id BIGINT REFERENCES faculty_course_assignment(assignment_id),
    UNIQUE(student_id, assignment_id)
);
-- Enrollment points at assignment_id (not course_id) because "which course"
-- is meaningless without knowing which faculty/section/term taught it.

-- Performance & analytics ------------------------------------------------

CREATE TABLE student_course_performance (
    performance_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    enrollment_id BIGINT REFERENCES student_course_enrollment(enrollment_id),
    initial_analysis VARCHAR(20)
        CHECK (initial_analysis IN ('Slow Learner','Medium Learner','Fast Learner')),
    sessional1_marks NUMERIC(5,2),
    sessional2_marks NUMERIC(5,2),
    p1_score NUMERIC(5,2),
    p2_score NUMERIC(5,2),
    tec_score NUMERIC(5,2),
    overall_score NUMERIC(5,2),
    remarks TEXT,
    created_by BIGINT REFERENCES users(user_id),
    updated_by BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE faculty_effectiveness (
    effectiveness_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assignment_id BIGINT REFERENCES faculty_course_assignment(assignment_id),
    p1 NUMERIC(5,2),
    p2 NUMERIC(5,2),
    tec NUMERIC(5,2),
    effectiveness_score NUMERIC(5,2),
    rating VARCHAR(50),   -- 'Highly Effective' | 'Strong' | 'Moderate'  (PLACEHOLDER thresholds, see §7)
    calculated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- One row per (faculty, course, section, term) — pre-aggregated so
-- dashboards never average raw student rows on every page load.

-- Workflow control --------------------------------------------------------

CREATE TABLE workflow_stage (
    stage_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stage_name VARCHAR(50) UNIQUE NOT NULL,   -- 'Initial Analysis' | 'Sessional 1' | 'Sessional 2'
    is_open BOOLEAN DEFAULT FALSE,
    opened_by BIGINT REFERENCES users(user_id),
    opened_at TIMESTAMP,
    closed_at TIMESTAMP
);
-- IQAC toggles is_open per stage. The API must check the relevant stage's
-- is_open flag before accepting a write to initial_analysis, sessional1_marks,
-- or sessional2_marks. Faculty can never bypass this check client-side —
-- enforce it server-side in the Express route handler, every time.
```

**Entity relationship summary:**
```
schools ─< departments ─< courses ─< faculty_course_assignment >─ users (faculty)
                                            │                         │
                                            │                         ├─< hod_assignment
                                            v                         ├─< dean_assignment
                                  student_course_enrollment            └─< faculty_department_assignment
                                            │
                                            v
                                 student_course_performance
                                            │
                                            v (aggregated)
                                  faculty_effectiveness
```

---

## 4. Roles & Access Scope

| Role      | Scope resolved via                     | Can do                                                            |
|-----------|------------------------------------------|--------------------------------------------------------------------|
| Admin     | global (no assignment table)             | Manage master data, users, roles                                   |
| IQAC      | global                                   | Open/close `workflow_stage`; view all analytics, any school/dept/course |
| Dean      | `dean_assignment` → school               | View analytics for their school → department → batch → course → section |
| HOD       | `hod_assignment` → department            | View analytics for their department → batch → course; also teaches (see below) |
| Faculty   | `faculty_department_assignment` → department, `faculty_course_assignment` → their actual courses | Update `initial_analysis`, `sessional1_marks`, `sessional2_marks` for their own assigned students only, and only while the relevant `workflow_stage` is open |

**HODs and Deans also teach** if they additionally hold a `Faculty` role row in
`user_roles` — in that case they get a `faculty_course_assignment` row like any other
faculty and see a Faculty dashboard tab in addition to their HOD/Dean tab. IQAC/Admin
never teach and never get a `faculty_course_assignment` row.

---

## 5. Faculty Selection Flow (drives the Faculty UI)

This is the exact drill-down a Faculty user follows after login — implement it as a
sequence of dependent dropdowns/selects, each query filtered by the previous choice:

```
1. Select Academic Year        → academic_years (only years they have assignments in)
2. Select Semester (Odd/Even)  → semesters
3. → System resolves their faculty_course_assignment rows for that year+semester
4. Select Course                → distinct courses from step 3 (same faculty can teach 2+ courses)
5. Select Section               → sections available for that course (same course, different
                                   sections may be taught by the same or different faculty)
6. → List students enrolled in that assignment_id (via student_course_enrollment)
7. Faculty selects a student     → can set initial_analysis (if 'Initial Analysis' stage open)
8. → Once initial_analysis is set, faculty can enter sessional1_marks (if that stage is open)
9. → Later, sessional2_marks (if that stage is open)
```

IQAC/HOD/Dean dashboards follow the same drill-down shape but read-only, scoped
top-down (School → Department → Batch → Academic Year → Semester → Course →
[section-wise + overall] scores) instead of starting from "their own assignments."

---

## 6. REST API (Express)

Base path: `/api`. All routes except `/auth/*` require a valid Supabase session
token (verify via Supabase JWT in middleware) and re-derive role/scope server-side —
never trust a role sent from the client.

```
POST   /api/auth/login                     Exchange Supabase session, return user + roles[]
GET    /api/auth/me                        Current user profile + role list

GET    /api/faculty/assignments            ?academic_year_id=&semester_id=  -> this faculty's courses
GET    /api/faculty/students               ?assignment_id=                  -> enrolled students
PUT    /api/faculty/students/:enrollment_id/initial-analysis
PUT    /api/faculty/students/:enrollment_id/sessional1
PUT    /api/faculty/students/:enrollment_id/sessional2

GET    /api/hod/departments/:department_id/faculty
GET    /api/hod/courses                    ?department_id=&academic_year_id=&semester_id=&batch_id=
GET    /api/hod/analytics                  ?course_id=  -> faculty-wise, section-wise results

GET    /api/dean/school/:school_id/departments
GET    /api/dean/analytics                 ?department_id=&batch_id=&academic_year_id=&semester_id=

GET    /api/iqac/schools
GET    /api/iqac/departments               ?school_id=
GET    /api/iqac/analytics                 ?school_id=&department_id=&batch_id=&academic_year_id=&semester_id=&course_id=
POST   /api/iqac/workflow-stage/:stage_id/open
POST   /api/iqac/workflow-stage/:stage_id/close

GET    /api/master/schools
GET    /api/master/departments
GET    /api/master/academic-years
GET    /api/master/semesters
GET    /api/master/batches
GET    /api/master/sections
GET    /api/master/courses
```

Every write endpoint (`PUT /api/faculty/students/:id/...`) must, server-side:
1. Confirm the calling user owns the `faculty_course_assignment` behind that
   `enrollment_id` (join `student_course_enrollment` → `faculty_course_assignment` →
   `faculty_id = current_user.user_id`).
2. Confirm the relevant `workflow_stage.is_open = TRUE`.
3. Reject with `403` if either check fails — do not silently ignore.

---

## 7. Calculation Engine (P1 / P2 / TEC) — ⚠️ PLACEHOLDER, NEEDS CONFIRMATION

The original spec references an IQAC-provided framework for P1, P2, TEC and the final
effectiveness rating, but the exact formula document was never available in this
conversation. The seed SQL currently implements this placeholder model — **implement
the backend calculation with the same formula, in one isolated module
(`services/effectiveness.js` or similar) so it's a single-file swap later**:

```
baseline(initial_analysis):
    'Slow Learner'   -> 40
    'Medium Learner' -> 60
    'Fast Learner'    -> 80

P1  = ((sessional1_marks - baseline) / baseline) * 100
P2  = ((sessional2_marks - sessional1_marks) / sessional1_marks) * 100
TEC = (P1 * 0.4) + (P2 * 0.6)

overall_score (per student) = (sessional1_marks * 0.4) + (sessional2_marks * 0.6)

faculty_effectiveness (per assignment) = AVG(P1), AVG(P2), AVG(TEC) across all
enrolled students for that assignment_id

rating:
    effectiveness_score >= 75            -> 'Highly Effective'
    effectiveness_score >= 50 and < 75    -> 'Strong'
    effectiveness_score < 50              -> 'Moderate'
```

Do not recompute P1/P2/TEC/rating on every page read — recalculate and persist to
`student_course_performance` / `faculty_effectiveness` only when marks change
(on the `PUT sessional1` / `PUT sessional2` write, and re-aggregate the corresponding
`faculty_effectiveness` row in the same request).

---

## 8. Frontend Structure (React)

```
frontend/
├── src/
│   ├── api/                 # one file per resource: authApi.js, facultyApi.js, hodApi.js...
│   ├── components/
│   │   ├── common/          # Button, Select, Table, Loader, ProtectedRoute
│   │   └── dashboard/       # role-specific widgets
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── RoleSelector.jsx     # shown when user.roles.length > 1
│   │   ├── faculty/
│   │   │   ├── FacultyDashboard.jsx
│   │   │   └── StudentAnalysis.jsx
│   │   ├── hod/HodDashboard.jsx
│   │   ├── dean/DeanDashboard.jsx
│   │   └── iqac/IqacDashboard.jsx
│   ├── context/AuthContext.jsx   # holds session, active role, active scope
│   ├── hooks/
│   ├── styles/               # plain CSS, one file per component/page
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

## 9. Backend Structure (Node.js + Express)

```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── faculty.routes.js
│   │   ├── hod.routes.js
│   │   ├── dean.routes.js
│   │   ├── iqac.routes.js
│   │   └── master.routes.js
│   ├── controllers/          # one per route file above
│   ├── services/
│   │   └── effectiveness.js  # P1/P2/TEC engine — isolated per §7
│   ├── middleware/
│   │   ├── auth.middleware.js     # verifies Supabase JWT, attaches req.user
│   │   └── role.middleware.js     # requireRole('HOD'), requireRole('IQAC')...
│   ├── db/
│   │   └── supabaseClient.js
│   ├── app.js
│   └── server.js
├── .env.example
└── package.json
```

---

## 10. Environment Variables

```
# backend/.env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=5000

# frontend/.env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:5000/api
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend — it only belongs in the
Express backend. The frontend uses the anon key + Supabase Auth session only.

---

## 11. Setup

```bash
# Database
# Run 01_master_data.sql through 08_faculty_effectiveness.sql, in order,
# against your Supabase project's SQL editor.

# Backend
cd backend
npm install
cp .env.example .env   # fill in Supabase values
npm run dev

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## 12. Build Order (recommended, for an AI agent working incrementally)

1. Backend: Supabase client + auth middleware + `/api/auth/me`
2. Backend: `master.routes.js` (read-only lookups — low risk, validates DB connection)
3. Frontend: Login page + AuthContext + RoleSelector
4. Backend + Frontend: Faculty flow end-to-end (§5) before touching HOD/Dean/IQAC
5. Backend: `services/effectiveness.js`, wired into the sessional PUT routes
6. Backend + Frontend: HOD dashboard (read-only, reuses master lookups)
7. Backend + Frontend: Dean dashboard
8. Backend + Frontend: IQAC dashboard + workflow-stage open/close controls
9. Polish: loading states, error boundaries, empty states for every list view

---

## 13. Open Items Before Production

- [ ] Confirm the real P1/P2/TEC formula and rating thresholds (§7) with IQAC and
      replace the placeholder in `services/effectiveness.js`.
- [ ] Decide whether `faculty_department_assignment` is maintained manually by Admin
      going forward, or only auto-derived once at seed time.
- [ ] Add Row Level Security (RLS) policies in Supabase mirroring the access rules in
      §4, as defense-in-depth behind the Express-layer checks.
