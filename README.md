# ProjectFlow — Project Management & Task Tracking

A full-stack web application for managing projects and tasks across three roles (**Administrator**, **Project Manager**, **Member**). It has a Kanban board, comments, an activity history, notifications that arrive live, role-based dashboards, email-code (OTP) verification and password reset.

| | |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query, React Hook Form + Zod, Axios, Socket.IO client, dnd-kit, Recharts |
| **Backend** | Node.js, Express 5 (**modular monolith**), TypeScript, Prisma 7 (MySQL), Zod, JWT, Socket.IO, Nodemailer, Swagger (OpenAPI 3) |
| **Database** | MySQL 8 (AWS RDS in production) |
| **Hosting** | AWS EC2 × 2 (Ubuntu), RDS MySQL, Nginx, Let's Encrypt (Certbot), PM2, DuckDNS |

**Live demo:** <https://techprojectflow.duckdns.org> · **API:** <https://techprojectflow-api.duckdns.org>

**API documentation (Swagger UI):** <https://techprojectflow-api.duckdns.org/api-docs> · **Database schema (dbdiagram.io):** <https://dbdiagram.io/d/6ae46c54f99a5c458bb887cc> · [Schema image](DB_SCHEMAS.png)

---

## Contents

1. [Reviewer test credentials](#1-reviewer-test-credentials)
2. [Repository layout](#2-repository-layout)
3. [Run it locally](#3-run-it-locally)
4. [Environment variables](#4-environment-variables)
5. [Deployment on AWS](#5-deployment-on-aws)
6. [Architecture](#6-architecture) (including the [database schema](#61-database-schema) and the [modular monolith](#62-backend-architecture-a-modular-monolith))
7. [Important technical decisions](#7-important-technical-decisions)
8. [API documentation](#8-api-documentation)
9. [Scripts reference](#9-scripts-reference)

---

## 1. Reviewer test credentials

Created by the seed script (`npm run db:seed`). The accounts are verified, so no email code is needed to sign in.

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@example.com` | `ChangeMe123!` |
| **Project Manager** | `arun@example.com` | `ChangeMe123!` |
| **Member** | `suresh@example.com` | `ChangeMe123!` |

Other seeded accounts (same password): Project Manager `priya@example.com`; Members `karthik@example.com` and `divya@example.com`.

> The passwords come from `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD` in the server `.env`, and the administrator email from `SEED_ADMIN_EMAIL`. The values above are the ones in `.env.example`. If you seeded with different values, use those.

**Suggested walkthrough**

1. **Administrator:** open *Users* and create a Project Manager; open *Projects* and create a project for that manager.
2. **Project Manager:** open your project, add a Member, create tasks, assign them, and drag them on the Kanban board.
3. **Member:** open *My Tasks*, change the status of a task assigned to you, add a comment. Watch notifications arrive without refreshing.
4. **Administrator:** deactivate that Member and see what happens in the Member's open browser (see [section 7.7](#77-deactivation-and-role-change-handling)).

---

## 2. Repository layout

```
.
├── client/                  Next.js application (UI + same-origin API gateway)
│   ├── src/app/             Routes (pages), /api gateway, realtime-token endpoint
│   ├── src/proxy.ts         Route guard that runs on the server before pages render
│   ├── src/components/      UI, grouped by feature (auth, users, projects, tasks, ...)
│   ├── src/features/        API calls and TanStack Query hooks per feature
│   ├── src/schemas/         Zod form schemas
│   └── src/lib/             API client, error model, socket client, helpers
└── server/                  Express API (modular monolith)
    ├── prisma/              schema.prisma, migrations, seed
    └── src/
        ├── config/          env validation, CORS, Swagger
        ├── middlewares/     authenticate, authorize, validate, rate limit, CSRF, errors
        ├── modules/         auth, users, projects, tasks, activity, notifications, dashboard
        ├── realtime/        Socket.IO server and the "outbox"
        ├── jobs/            periodic clean-up
        └── utils/           logger, mailer, email templates, JWT, cookies, text helpers
```

Each backend module follows the same shape: `*.routes.ts` (URLs, middleware, API docs) → `*.controller.ts` (HTTP) → `*.service.ts` (business rules, database) → `*.validation.ts` (Zod).

---

## 3. Run it locally

**Prerequisites:** Node.js 20 or newer (22 LTS recommended), npm, and a MySQL 8 database you can reach.

### 3.1 Create the database

```sql
CREATE DATABASE project_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3.2 Backend (port 3000)

```bash
cd server
npm install
cp .env.example .env            # then edit .env (see section 4)
npm run db:generate             # generate the Prisma client
npm run db:deploy               # apply the migrations
npm run db:seed                 # demo accounts, projects and tasks
npm run dev                     # http://localhost:3000
```

Check it: <http://localhost:3000/api/health> and <http://localhost:3000/api-docs>.

In development, leave `SMTP_HOST` empty: the one-time codes (OTP) are printed in the server console as `[mail:dev] …`, so you can sign up and reset passwords without an email service.

### 3.3 Frontend (port 3001)

```bash
cd client
npm install
cp .env.example .env.local      # API_URL=http://localhost:3000
npm run dev                     # http://localhost:3001
```

Open <http://localhost:3001> and sign in with a reviewer account from section 1.

---

## 4. Environment variables

### 4.1 Server (`server/.env`)

The file is validated at start-up (Zod). If anything required is missing or malformed, the server prints what is wrong and exits.

```ini
# ── Core ─────────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development                       # production on the server
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/project_management
CLIENT_URL=http://localhost:3001           # the public address of the web app (CORS, CSRF, links in emails)

# ── Tokens and cookies ───────────────────────────────────────────────
JWT_ACCESS_SECRET=<random, at least 32 characters>
JWT_REFRESH_SECRET=<random, at least 32 characters>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=<random, at least 32 characters>   # also keys the one-time-code hashes
COOKIE_SAME_SITE=lax                       # lax | strict | none

# ── Seed data (used only by `npm run db:seed`) ───────────────────────
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!
SEED_DEMO_EMAIL=demo@example.com
SEED_DEMO_PASSWORD=ChangeMe123!

# ── Email (sign-up codes, password reset, account notices) ───────────
SMTP_HOST=                                 # empty in development: codes are printed to the console
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="ProjectFlow <no-reply@example.com>"
SUPPORT_EMAIL=                             # shown in the "account deactivated" email
OTP_TTL_MINUTES=10
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5

# ── Safety and operations ────────────────────────────────────────────
RATE_LIMIT_ENABLED=false                   # always ON in production
LOG_DIR=logs                               # error log files (errors only)
LOG_RETENTION_DAYS=14
SWAGGER_SERVER_URL=http://localhost:3000   # public address of this API, origin only
SWAGGER_ENABLED=true                       # false hides /api-docs
```

Generate the secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

In **production** `SMTP_HOST` and `SMTP_FROM` are required.

### 4.2 Client (`client/.env.local` for development, `client/.env.production.local` or `.env.production` on the server)

```ini
# Where the app's own server forwards API calls. Origin only, no path. Read on the server at run
# time, never sent to the browser.
API_URL=http://localhost:3000

# Live updates (Socket.IO) connect straight from the browser to the API.
# NOTE: NEXT_PUBLIC_* values are baked in at build time: rebuild after changing it.
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# Optional: where the app's server writes its own error log
# LOG_DIR=logs
```

---

## 5. Deployment on AWS

### 5.1 What was built

```
                           Internet
                               │  HTTPS (443)
              ┌────────────────┴────────────────┐
              ▼                                 ▼
   techprojectflow.duckdns.org      techprojectflow-api.duckdns.org
              │                                 │
   ┌──────────┴──────────┐           ┌──────────┴──────────┐
   │ EC2 #1  (Ubuntu)    │           │ EC2 #2  (Ubuntu)    │
   │ Nginx :80/:443      │           │ Nginx :80/:443      │
   │   └─► Next.js :3001 │ ─ HTTPS ─►│   └─► Express :3000 │
   │       (PM2: web)    │  /api/*   │       (PM2: api)    │
   └─────────────────────┘           └──────────┬──────────┘
                                                │ MySQL 3306 (private)
                                      ┌─────────┴──────────┐
                                      │ RDS MySQL 8        │
                                      │ not public         │
                                      └────────────────────┘
```

- **Two EC2 instances (Ubuntu):** one for the frontend (Next.js), one for the backend (Express + Socket.IO).
- **RDS MySQL:** private. It has no public address and accepts connections **only from the backend EC2 instance**.
- **Nginx** on each instance terminates HTTPS and proxies to the local Node process.
- **Certbot (Let's Encrypt)** issues and renews the certificates for the registered domain names.
- **DuckDNS** provides the free domain names, one per instance.
- **PM2** keeps both Node processes running and restarts them after a crash or a reboot.

### 5.2 Security groups

| Group | Inbound rule | Source |
|---|---|---|
| **EC2 #1 and EC2 #2** | SSH (22) | **My IP only** |
| | HTTP (80) | Anywhere (`0.0.0.0/0`) — needed for the certificate challenge and the redirect to HTTPS |
| | HTTPS (443) | Anywhere (`0.0.0.0/0`) |
| **RDS** | MySQL/Aurora (3306) | The **security group of EC2 #2 (backend) only** — not an IP address, and never `0.0.0.0/0` |

The Node ports (3000 and 3001) are **not** opened: they listen on the instance and are reached only through Nginx. RDS has *Public access = No*.

### 5.3 Step by step

**1. RDS.** Create a MySQL 8 instance in private subnets, *Public access: No*, attach the RDS security group above, and create the database `project_management` (utf8mb4). Note the endpoint, user and password.

**2. EC2 instances.** Launch two Ubuntu instances with the security group above. Give each an **Elastic IP**, so the address survives a stop/start.

**3. DuckDNS.** Create two sub-domains, for example `techprojectflow` (→ EC2 #1's IP) and `techprojectflow-api` (→ EC2 #2's IP).

**4. Install the tools on both instances.**

```bash
sudo apt update && sudo apt -y upgrade
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx git certbot python3-certbot-nginx
sudo npm install -g pm2
```

**5. Backend (EC2 #2).**

```bash
git clone <repository-url> app && cd app/server
npm ci
nano .env                       # production values, see 5.4
npm run db:generate
npm run db:deploy               # create/upgrade the tables on RDS
npm run db:seed                 # only the first time: reviewer accounts and demo data
npm run build                   # type-checks the whole project
pm2 start npm --name api -- start
pm2 save
```

The `start` script runs the TypeScript source with `tsx`, so install the dependencies with plain `npm ci` (not `--omit=dev`).

**6. Frontend (EC2 #1).**

```bash
git clone <repository-url> app && cd app/client
npm ci
nano .env.production.local      # see 5.4: API_URL and NEXT_PUBLIC_SOCKET_URL
npm run build
pm2 start npm --name web -- start
pm2 save
```

**7. Keep PM2 alive across reboots** (on both instances):

```bash
pm2 startup systemd             # run the command it prints (with sudo)
pm2 save
```

**8. Nginx** (see 5.5), then enable the sites and reload:

```bash
sudo ln -s /etc/nginx/sites-available/<name> /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**9. HTTPS with Certbot** (on each instance, for its own domain):

```bash
sudo certbot --nginx -d techprojectflow.duckdns.org          # EC2 #1
sudo certbot --nginx -d techprojectflow-api.duckdns.org      # EC2 #2
sudo certbot renew --dry-run                                  # confirms automatic renewal works
```

**10. Smoke test:** open `https://techprojectflow-api.duckdns.org/api/health`, then the site, and sign in with a reviewer account.

### 5.4 Production configuration

**Backend `server/.env`** — the values that differ from development:

```ini
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://USER:PASSWORD@<rds-endpoint>:3306/project_management
CLIENT_URL=https://techprojectflow.duckdns.org
COOKIE_SAME_SITE=lax                  # the browser only ever talks to the web app's domain (see 7.1)
SMTP_HOST=<smtp host>                 # required in production
SMTP_FROM="ProjectFlow <no-reply@your-domain>"
SWAGGER_SERVER_URL=https://techprojectflow-api.duckdns.org
# plus the three secrets, SEED_* and the rest from section 4.1
```

**Frontend `client/.env.production.local`:**

```ini
API_URL=https://techprojectflow-api.duckdns.org
NEXT_PUBLIC_SOCKET_URL=https://techprojectflow-api.duckdns.org
```

### 5.5 Nginx examples

**Frontend instance** — `/etc/nginx/sites-available/web`:

```nginx
server {
    listen 80;
    server_name techprojectflow.duckdns.org;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Backend instance** — `/etc/nginx/sites-available/api`:

```nginx
# Requests coming from the web server carry the real visitor's address in X-Forwarded-For.
# Trust that header only when the request comes from the frontend instance, so nobody else can
# fake an address to get around the rate limits.
set_real_ip_from <frontend-instance-elastic-ip>;
real_ip_header   X-Forwarded-For;

map $http_upgrade $connection_upgrade { default upgrade; '' close; }

server {
    listen 80;
    server_name techprojectflow-api.duckdns.org;
    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        # WebSockets (Socket.IO)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 120s;
    }
}
```

Certbot rewrites these files to add the HTTPS (`listen 443 ssl`) blocks and the HTTP → HTTPS redirect.

### 5.6 Updating the deployment

```bash
# backend
cd ~/app && git pull && cd server && npm ci && npm run db:deploy && npm run build && pm2 restart api
# frontend (NEXT_PUBLIC_* values are baked in at build time, so always rebuild)
cd ~/app && git pull && cd client && npm ci && npm run build && pm2 restart web
```

Run the database migration (`db:deploy`) **before** restarting the API, and deploy code and migration together.

### 5.7 Operating it

| Need | Command or place |
|---|---|
| Process status and live output | `pm2 status`, `pm2 logs api`, `pm2 logs web` |
| Application error log (errors only) | `server/logs/error-YYYY-MM-DD.log` and `client/logs/gateway-error-YYYY-MM-DD.log` |
| Find one failure | Search both folders for the request id (`x-request-id` response header, or the "Ref: xxxxxxxx" shown to the user) |
| Health check | `GET /api/health` |
| API documentation | `/api-docs` (turn off with `SWAGGER_ENABLED=false`) |

---

## 6. Architecture

```
 Browser ──HTTPS──► Nginx ──► Next.js ───────────────► Express API ──► MySQL (Prisma)
   │                         ├─ pages (App Router)         ▲
   │                         ├─ proxy.ts (route guard)     │ REST: /api/*  (cookie → Bearer)
   │                         └─ /api/[...path] gateway ────┘
   │
   └──── WebSocket (Socket.IO) ───────────────────────────► Express API
```

- **Frontend (Next.js).** Renders pages, keeps server data in TanStack Query, validates forms with Zod, and acts as the **only server the browser talks to for REST**: a route handler under `/api/[...path]` forwards calls to the Express API (section 7.1).
- **Backend (Express 5), a modular monolith** (see [6.2](#62-backend-architecture-a-modular-monolith)). One deployable service with clear modules (`auth`, `users`, `projects`, `tasks`, `activity`, `notifications`, `dashboard`). Each request passes through: request id → security headers → CORS → body parsing → CSRF check → rate limit → `authenticate` → `authorize` → Zod `validate` → controller → service → Prisma. Errors reach one global handler.
- **Database (MySQL via Prisma).** Prisma migrations are the schema's source of truth. Tasks are soft-deleted. Foreign keys use `Restrict` where deleting would lose history.
- **Realtime (Socket.IO).** Attached to the same HTTP server as Express, so REST and WebSocket share one port.

### 6.1 Database schema

The diagram below shows every table and relationship. The same schema is on dbdiagram.io: <https://dbdiagram.io/d/6ae46c54f99a5c458bb887cc>. The source of truth in the code is [server/prisma/schema.prisma](server/prisma/schema.prisma) and its migrations.

![Database schema](DB_SCHEMAS.png)

| Table | What it holds |
|---|---|
| `User` | Accounts: name, email, password hash, role, active flag, `emailVerifiedAt` |
| `Session` | One row per signed-in browser or device (both tokens carry its id); `endedReason` explains a forced logout |
| `OtpCode` | One-time codes for sign-up, admin email change and password reset (hashed, with a `purpose`) |
| `Project` | Name, status, priority, dates, manager, creator, archive time |
| `ProjectMember` | Which Members belong to which project |
| `Task` | Title, status, priority, due date, position on the board, assignee, soft-delete time |
| `Comment` | Comments on a task |
| `Activity` | Append-only history of what happened in a project or task |
| `Notification` | Per-user notifications with a read time |

### 6.2 Backend architecture: a modular monolith

The backend is **one deployable service** (a single Express process and a single MySQL database) that is organised internally into **independent feature modules**. It is not microservices, and it is not one big pile of files either.

```
server/src/
├── modules/                      one folder per business area
│   ├── auth/            routes · controller · service · validation   (+ otp, session, password reset)
│   ├── users/           routes · controller · service · validation
│   ├── projects/        routes · controller · service · validation
│   ├── tasks/           routes · controller · service · validation   (+ access rules)
│   ├── activity/        routes · controller · service · validation
│   ├── notifications/   routes · controller · service · validation
│   └── dashboard/       routes · controller · service · validation
├── middlewares/                  shared: authenticate, authorize, validate, rate limit, CSRF, errors
├── realtime/                     shared: Socket.IO server and the outbox
├── config/ · utils/ · jobs/      shared: env, CORS, Swagger, logger, mailer, JWT, clean-up
└── app.ts · server.ts            wires the modules together and starts the server
```

**Each module has the same four layers**, and a request flows through them in order:

| Layer | Responsibility | Does not do |
|---|---|---|
| `*.routes.ts` | URLs, which middleware runs (login, role, validation, rate limit), and the API documentation | business rules |
| `*.controller.ts` | Reads the request, calls the service, shapes the HTTP response | database access, rules |
| `*.service.ts` | **All business rules** and database access, inside transactions | HTTP details |
| `*.validation.ts` | Zod schemas for the body, params and query | anything else |

**Rules that keep the modules separate**
- A module owns its URLs and its rules. `app.ts` only mounts each module's router under its own prefix (`/api/auth`, `/api/tasks`, …).
- When one module needs another's behaviour it calls a **service function**, never a controller. For example, creating a task calls `recordActivity` (activity) and `notifyUsers` (notifications) with the same database transaction, and the dashboard reuses the project and activity services, so each rule exists in exactly one place.
- Cross-cutting concerns (authentication, validation, error handling, logging, realtime) live in shared folders, not inside any module.
- Because modules share one database, a few simple checks read a neighbouring table directly (for example a task checks its project). That is a deliberate trade-off of a monolith.

**Why a modular monolith**
- **Simple to run and deploy:** one process, one PM2 entry, one database. Two EC2 instances (web and API) are enough.
- **Real transactions across modules:** a status change, its activity entry, its notifications and the project's automatic status change commit or roll back **together**. Separate services would need distributed transactions or eventual consistency.
- **Easy to understand and test:** a new developer finds everything about "tasks" in one folder, in the same four files as every other module.
- **Room to grow:** the boundaries and the service-function contracts mean a module could be split into its own service later without rewriting the others.

---

## 7. Important technical decisions

### 7.1 Authentication and token handling

**Nothing secret is stored in the browser's JavaScript-readable storage.** There is no `localStorage` or `sessionStorage` token.

1. **Login.** The API verifies the password and creates a **session** (one database row per browser or device). It sets two **HttpOnly** cookies: `access_token` (15 minutes, `Path=/`) and `refresh_token` (7 days, `Path=/api/auth` — so it is only ever sent to the auth endpoints). `Secure` in production.
2. **A Next.js route handler is the gateway** (`client/src/app/api/[...path]/route.ts`). The browser calls its own domain (`/api/...`); the handler runs **on the server**, reads the `access_token` cookie, and forwards the request to the Express API with `Authorization: Bearer <token>` and the original cookies. Cookies set by the API (`Set-Cookie` on login, refresh, logout) are passed back to the browser for the web app's own domain. Only a short allow-list of headers is forwarded; a browser-supplied `Authorization` header is ignored.
3. **Why this design.** Scripts on the page (including injected ones) cannot read an HttpOnly cookie, so there is no token to steal from storage. Because the browser only talks to one domain, the cookies are first-party: login works in private windows and with third-party cookies blocked, even though the web app and the API live on different domains.
4. **The API accepts both** a Bearer header and the cookie (Bearer wins). That is also how Swagger and tools like `curl` can call it.
5. **Silent refresh.** When a request returns 401, the client calls `/api/auth/refresh` **once** (concurrent failures share a single call, because refresh tokens rotate), then retries the original request. If the refresh fails, the user is sent to the login page with a message.
6. **Sessions, not a token version.** Both JWTs carry the session id (`sid`). Every request checks that the session row exists, is not expired and has not been ended. This gives **per-device logout** (logging out on one device keeps the others signed in), "sign out everywhere" (password change and reset delete all of a user's sessions) and administrator-forced logout (deactivation, role change).
7. **Live updates.** A WebSocket cannot pass through a route handler, so the socket connects straight to the API. `GET /api/realtime-token` (a route handler that reads the HttpOnly cookie on the server) gives the page the current access token to use for that single connection. The token is kept in memory only.
8. **Route guard (`proxy.ts`).** Next.js 16's replacement for middleware runs before a page is rendered: a signed-in user opening `/login`, `/register`, `/forgot-password`, `/verify-email` or `/reset-password` goes to their own dashboard; a visitor opening `/admin`, `/manager` or `/member` goes to the login page; a user in another role's area goes to their own. The role is read from the access token **without verifying it**, only to choose where to send the person — the API still enforces everything.

### 7.2 Role-based authorization

Enforced **in the backend** (what actually protects the data) and mirrored **in the frontend** (so people only see what they can use).

**Backend**
- `authenticate` loads the user and the session from the database on every request, and rejects deactivated users, unverified emails and ended sessions.
- `authorize(...roles)` guards whole routes (for example everything under `/api/users` is administrators only; creating projects and tasks is administrators and Project Managers).
- **Scope filters** in the services: an administrator sees everything, a Project Manager only projects they manage, a Member only projects they belong to. The filter is part of every query, so an id from another project simply isn't found. Hidden records answer **404**, not 403, so their existence isn't revealed.
- **Per-task permissions** are computed in one place (`tasks.access.ts`): administrators and the project's manager can edit, assign, delete and change the status; a Member can change the status of the task assigned to them and comment, and nothing else. Archived projects are read-only for everyone.
- The acting user always comes from the verified token, never from an id in the request, so a user cannot act as, or on the data of, someone else by putting another id in a URL.

**Frontend**
- A separate area per role (`/admin`, `/manager`, `/member`) with its own sidebar.
- The server returns flags (`canManage`, `permissions.canEdit`, …) and the UI shows or hides buttons from them. Hiding a button is only a convenience; the API refuses the action anyway.
- `proxy.ts` and the layout guard redirect between areas (section 7.1).

### 7.3 Making a Member a Project Manager (and back)

An administrator changes a role on the user's edit page. The role cannot change while the person still holds work in the old role:

| Change | Allowed only when |
|---|---|
| **Project Manager → Member** | They manage **no project** (archived projects count, because they still have that manager). Reassign the projects first. |
| **Member → Project Manager** | They are on **no project** and hold **no assigned task**. |
| Own role, or an administrator's role | Never |

The rule is checked **on the server** before anything else is changed, and the edit page shows the reason in place of the role field. After a successful change the person is signed out on every device and gets an email.

### 7.4 Project archive restrictions

A project can be archived only when the work is finished:

- **Blocks archiving:** the project status is not *Completed*, or any task is not *Completed*.
- **Warns only:** tasks without an assignee, members still on the project.
- Only an administrator or the project's own manager can archive; **restoring is always allowed**.
- Archived projects are **read-only**: no edits, no new members, no task changes, no comments.
- The archive dialog calls a readiness endpoint and shows the reasons; the server enforces the same rules, so they cannot be bypassed.

### 7.5 Project status follows its tasks

- **Setting a project to Completed** is refused while any task is not completed. Tasks that were deleted do not count. The edit page shows a dialog **listing the open tasks** with links.
- **Completing the last open task** completes the project automatically (a Planning or Active project with at least one task).
- **Reopening a task** (or adding a new one) on a Completed project makes the project **Active** again.
- **On Hold** projects are never changed automatically (that is a deliberate choice by a person), and archived projects are never touched.
- Each automatic change is written to the activity history.

### 7.6 Real-time updates with Socket.IO

**The events carry almost nothing, and the page refetches over REST.**

- The server sends small events such as `task:statusChanged` with only ids (`{ projectId, taskId }`), or `notification:new` with the new notification. The client does not apply the payload to its data. It **invalidates the affected TanStack Query caches**, and the page re-reads from the API.
- **Why:** the payload can't leak anything the receiver may not see, there is one source of truth (the API, which applies role scope and permissions), events can be lost or arrive out of order without corrupting the screen, and the client stays simple.
- **Rooms are decided on the server:** each socket joins `user:<id>`, `session:<id>`, `project:<id>` for its projects, and `role:ADMIN` for administrators. A client can never ask to join a room.
- **Sent only after the commit.** Changes collect their events in an **outbox** that is flushed after the database transaction commits, so no one is told about something that was rolled back.
- **Authentication:** the handshake is checked like a REST call (token, live session, active user), and the connection is closed when the access token expires; the client refreshes the session and reconnects. After a reconnect, the client refetches, because events may have been missed.

### 7.7 Deactivation and role-change handling

When an administrator deactivates a user (or changes their role):

1. **The sessions end** and the user's **live connections are closed** immediately. For a role change the sessions are kept, tagged `ROLE_CHANGED`, so the next request can say why.
2. **An email** tells the user what happened.
3. **Any request** they make afterwards is answered with 403 and a marker (`ACCOUNT_DEACTIVATED` or `ROLE_CHANGED`) and the cookies are cleared.
4. **The browser reacts once:** the API client sees the marker, stops sending further requests, and does a full page navigation to `/login?reason=…`, which shows a clear message ("Your account has been deactivated…" / "Your role has been changed…"). A full navigation discards cached data, which prevents the flicker and redirect ping-pong a client-side redirect caused.
5. **Deactivating a Project Manager** opens a dialog that lists the projects they manage and offers (unticked by default) to **put those projects on hold** in the same transaction. Reactivating only reactivates.

### 7.8 One-time codes (OTP) and passwords

- **One table, one verify function** (`OtpCode`) for sign-up, admin email change and password reset, with a `purpose` column. The purpose is part of what is hashed, so a code for one purpose can never be used for another.
- **Only a keyed hash** of the 6-digit code is stored (HMAC-SHA256 with a server secret). The code is valid 10 minutes, single-use, limited to 5 wrong attempts (counted atomically before comparing), with a 60-second resend cooldown that also survives a page refresh in the browser.
- **No account discovery:** forgot-password answers the same way whether or not the account exists.
- **Admin email change:** the old address stays until a code sent to the **new** address is entered. Creating a user needs no code, because the administrator vouches for the account.
- **Password policy** (identical on client and server): 8–72 characters with an uppercase letter, a lowercase letter, a number and a special character. Passwords are hashed with bcrypt (12 rounds) and are never trimmed.
- Registration always creates an unverified **Member**. Login does not apply the strength rules (so older accounts can still sign in).

### 7.9 Validation

- **Zod on both sides.** The server validates `body`, `params` and `query` of every route and returns field-level errors; the forms validate the same rules before sending.
- **Normalisation:** names and titles are trimmed, whitespace is collapsed and invisible characters removed; emails are trimmed and lower-cased; sign-up names are capitalised.
- **Dates:** a project's start date and deadline, and a task's due date, cannot be in the past (with one day of slack for time zones); a deadline cannot precede the start date.

### 7.10 Errors, logging and safety

- **One global error handler.** Database and internal errors are never sent to the browser; the user sees a generic message, plus a short reference (`Ref: xxxxxxxx`) for server failures.
- **Request id.** Every request gets an id (returned in `x-request-id`). The web server and the API share it.
- **Error-only log files** with the request id, user id, method, path, status and stack, one JSON line each, rotated daily and by size, and removed after `LOG_RETENTION_DAYS`. Passwords, tokens and cookies are never written (secrets in error text are redacted).
- **Rate limiting** on login, password change and the code endpoints (always on in production). A **CSRF origin check** on state-changing requests, **Helmet** security headers, and strict **CORS**.
- **Notifications and activity are written in the same transaction as the change**, so history and data cannot disagree. Activity is append-only.

### 7.11 Data and UI decisions

- **Soft delete for tasks** (history, comments and counts stay consistent); projects are archived rather than deleted.
- **Kanban:** fixed-height columns that scroll inside themselves, drag and drop with dnd-kit, positions renumbered on the server.
- **Lists use server-side pagination and filters**; the Activity page is a paginated table.
- **Cross-tab consistency:** logging out in one tab signs out the others.

---

## 8. API documentation

Interactive documentation (OpenAPI 3.0.3) is served by the API:

- **Swagger UI (live):** <https://techprojectflow-api.duckdns.org/api-docs>
- Raw specification: <https://techprojectflow-api.duckdns.org/api-docs.json>
- Locally: <http://localhost:3000/api-docs>

It covers every endpoint (49), grouped by Authentication, Users/Admin, Projects, Tasks, Activities, Notifications, Dashboard and System, with request and response schemas, the roles allowed, and the authentication schemes (Bearer, `access_token` cookie, `refresh_token` cookie). Sign in once with `POST /api/auth/login` in the page, and the browser sends the cookies on later calls.

---

## 9. Scripts reference

**Server (`cd server`)**

| Command | Purpose |
|---|---|
| `npm run dev` | Start with auto-reload (`tsx watch`) |
| `npm start` | Start once (used by PM2) |
| `npm run build` | Generate the Prisma client and type-check/compile (`tsc`) |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create and apply a migration in development |
| `npm run db:deploy` | Apply existing migrations (production) |
| `npm run db:seed` | Create the reviewer accounts and demo data |
| `npm run db:reset` | Drop and recreate the database (development only) |

**Client (`cd client`)**

| Command | Purpose |
|---|---|
| `npm run dev` | Development server on port 3001 |
| `npm run build` | Production build |
| `npm start` | Run the production build on port 3001 |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript check |
