# TeamSync — Backend

REST API for TeamSync, a project and task management platform. Handles authentication, workspaces, projects, tasks, members, and role-based access control.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Auth | JWT + Passport.js |
| OAuth | Google OAuth 2.0 |
| Validation | Zod |
| Password hashing | bcrypt |

---

## Project Structure

```
src/
├── config/          # Database, passport, app config
├── controllers/     # Route handlers
├── enums/           # Shared enums (roles, task status/priority, providers)
├── middlewares/     # Auth, error handling
├── models/          # Mongoose models (User, Workspace, Project, Task, Member, Role)
├── routes/          # Express routers
├── seeders/         # Database seeders
├── services/        # Business logic
└── utils/           # Helpers (bcrypt, role permissions)
```

---

## Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (or local MongoDB instance)

---

## Setup & Run

### 1. Clone and install

```bash
git clone https://github.com/jayan92/team-sync-backend.git
cd team-sync-backend
npm install
```

### 2. Configure environment variables

Create a `.env` file in the root:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/teamsync_db
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_ORIGIN=http://localhost:5173
```

### 3. Seed the database

Seeds roles, 5 users, 2 workspaces, 4 projects, and 28 tasks:

```bash
npm run seed
```

**Test credentials created by the seeder:**

| Email | Password | Role |
|---|---|---|
| alice@teamsync.dev | Alice@1234 | Owner — Alpha Team |
| bob@teamsync.dev | Bob@1234 | Owner — Beta Studio |
| carol@teamsync.dev | Carol@1234 | Admin — Alpha Team |
| david@teamsync.dev | David@1234 | Member — Alpha Team |
| eva@teamsync.dev | Eva@1234 | Member — both workspaces |

### 4. Start development server

```bash
npm run dev
```

API runs at `http://localhost:5000`.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run seed` | Seed all data (users, workspaces, projects, tasks) |
| `npm run seed:roles` | Seed roles only |

---

## Data Models

- **User** — email/password auth, profile, current workspace
- **Account** — OAuth provider linkage (Google, GitHub, Facebook, Email)
- **Workspace** — container for projects and members, has invite code
- **Member** — joins a user to a workspace with a role
- **Role** — OWNER / ADMIN / MEMBER with granular permissions
- **Project** — belongs to a workspace, has emoji and description
- **Task** — belongs to a project, has status, priority, assignee, due date
