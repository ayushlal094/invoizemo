# Invoizemo — Backend

A production-ready REST API for the Invoizemo invoicing platform. Built with Node.js, Express, TypeScript, and MongoDB.

🔗 **Live API:** https://invoizemo-backend.onrender.com

---

## Tech Stack

- **Node.js** + **TypeScript** — runtime and type safety
- **Express.js** — web framework
- **MongoDB Atlas** + **Mongoose** — cloud database and ODM
- **Zod** — environment and request body validation
- **bcryptjs** — password hashing (cost factor 12)
- **jsonwebtoken** — access tokens (15min) + refresh tokens (7d)
- **Passport.js** — Google OAuth 2.0 strategy
- **Nodemailer** — transactional email (password reset, welcome)
- **helmet** — security headers
- **express-rate-limit** — rate limiting per route
- **express-mongo-sanitize** — NoSQL injection prevention
- **cookie-parser** — HttpOnly refresh token handling

---

## Features

- 🔐 Email/password auth with bcrypt and Google OAuth 2.0
- 🔄 Refresh token rotation with reuse detection
- 📧 Password reset via email with SHA-256 hashed tokens
- 🧾 Full invoice CRUD with status state machine
- 👥 Client management with soft delete
- 🛡️ Ownership checks on every endpoint — no IDOR vulnerabilities
- 📊 Paginated listings with filters
- ⚙️ User profile, session management, GDPR data export
- 🔒 Account lockout and session revocation

---

## API Endpoints

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new account |
| POST | `/api/v1/auth/login` | Login with email + password |
| POST | `/api/v1/auth/refresh` | Refresh access token via cookie |
| POST | `/api/v1/auth/logout` | Logout and clear cookie |
| POST | `/api/v1/auth/forgot-password` | Send password reset email |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| GET | `/api/v1/auth/google` | Google OAuth redirect |
| GET | `/api/v1/auth/google/callback` | Google OAuth callback |

### Users
| Method | Route | Description |
|---|---|---|
| GET | `/api/v1/users/me` | Get current user profile |
| PATCH | `/api/v1/users/me` | Update profile |
| DELETE | `/api/v1/users/me` | Delete account (requires confirmation) |
| GET | `/api/v1/users/me/export` | GDPR data export |
| GET | `/api/v1/users/me/sessions` | List active sessions |
| DELETE | `/api/v1/users/me/sessions/:id` | Revoke a session |

### Clients
| Method | Route | Description |
|---|---|---|
| GET | `/api/v1/clients` | List clients (paginated + search) |
| POST | `/api/v1/clients` | Create client |
| GET | `/api/v1/clients/:id` | Get client by ID |
| PATCH | `/api/v1/clients/:id` | Update client |
| DELETE | `/api/v1/clients/:id` | Soft delete client |

### Invoices
| Method | Route | Description |
|---|---|---|
| GET | `/api/v1/invoices` | List invoices (paginated + filter) |
| POST | `/api/v1/invoices` | Create invoice |
| GET | `/api/v1/invoices/:id` | Get invoice by ID |
| PATCH | `/api/v1/invoices/:id` | Update invoice (draft only) |
| PATCH | `/api/v1/invoices/:id/status` | Update invoice status |
| DELETE | `/api/v1/invoices/:id` | Soft delete invoice |

### Health
| Method | Route | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check (DB connection) |

---

## Project Structure

```
backend/
├── src/
│   ├── server.ts               # Entry point
│   ├── app.ts                  # Express app + middleware stack
│   ├── config/
│   │   ├── env.ts              # Zod-validated env — crashes on bad config
│   │   ├── db.ts               # MongoDB connection
│   │   ├── passport.ts         # Google OAuth strategy
│   │   └── logger.ts           # Structured logger
│   ├── middleware/
│   │   ├── requireAuth.ts      # JWT verify → attach req.user
│   │   ├── validate.ts         # Zod schema middleware
│   │   ├── roleGuard.ts        # Role-based access control
│   │   └── errorHandler.ts     # Central error handler
│   ├── modules/
│   │   ├── auth/               # register, login, refresh, logout, OAuth, reset
│   │   ├── users/              # profile, sessions, export, delete
│   │   ├── clients/            # client CRUD
│   │   └── invoices/           # invoice CRUD + status transitions
│   ├── services/
│   │   └── email.service.ts    # Nodemailer wrapper + email templates
│   ├── sockets/
│   │   └── index.ts            # Socket.io with JWT auth guard
│   ├── utils/
│   │   ├── jwt.ts              # signAccessToken, signRefreshToken, verify
│   │   ├── appError.ts         # AppError class + isAppError guard
│   │   ├── ownershipCheck.ts   # assertOwnership helper
│   │   └── tokenCompare.ts     # crypto.timingSafeEqual wrapper
│   └── types/
│       └── express.d.ts        # Augment Express Request with req.user
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/invoizemo.git
cd invoizemo/backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Variables

Open `.env` and fill in all values:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/invoizemo

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=replace_with_64_char_hex
JWT_REFRESH_SECRET=replace_with_different_64_char_hex
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# URLs
CLIENT_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

# Encryption
ENCRYPTION_KEY=replace_with_64_char_hex

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

# Email (optional — uses Ethereal in dev if not set)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=your_api_key
EMAIL_FROM=noreply@yourdomain.com
```

### Run in Development

```bash
npm run dev
```

API runs at **http://localhost:5000**

### Build for Production

```bash
npm run build
npm start
```

---

## Security Practices

| Practice | Implementation |
|---|---|
| Password hashing | bcrypt cost factor 12 |
| Access token | 15 min expiry, Authorization header only |
| Refresh token | 7 day expiry, HttpOnly Secure SameSite=Strict cookie |
| Refresh rotation | New token on every refresh, reuse triggers full revocation |
| Token comparison | crypto.timingSafeEqual — no === |
| NoSQL injection | express-mongo-sanitize on all requests |
| Rate limiting | 100 req/min global, 10 req/min on auth routes |
| Ownership checks | assertOwnership() on every resource endpoint |
| Soft delete | isDeleted filter on all queries |
| Password reset | SHA-256 hashed token, 1hr expiry, single use |
| CORS | Explicit origin allowlist — never wildcard |
| Request size | express.json limit 10kb |

---

## Response Format

All responses follow a consistent shape:

```json
// Success
{ "success": true, "data": { ... } }

// Paginated
{ "success": true, "data": [...], "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```

---

## Deployment

Deployed on **Render** (free tier).

1. Push backend to GitHub
2. Create a new Web Service on Render
3. Set Root Directory to `backend`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Add all environment variables from `.env.example`
7. Update `CORS_ORIGINS` to your Vercel frontend URL

> **Note:** Free tier spins down after 15 min inactivity. First request may take 30-60 seconds to wake up.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production build |
| `npm run typecheck` | Run TypeScript type check only |
| `npm run lint` | Run ESLint |
