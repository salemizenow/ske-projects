# SKE Projects (Next.js)

**Version code: `next-v1.0`**. Built from prototype `SKE-PROJECTS-v2.0`, with the same screens and workflow, but every rule is now enforced on the server.

Project workflow for Shri Krishna Enterprises:
- Users register and an admin approves them.
- The admin decides who can create projects.
- Each project is shared by link with chosen people, each with an access level.
- Every step has one owner who updates it and sends it for approval.

## Stack
- **Next.js 15** (App Router, Server Actions) + **React 19** + TypeScript
- **PostgreSQL** via **Prisma** (Neon / Supabase / Railway)
- Email + password sign-in:
  - passwords hashed with scrypt
  - sessions stored in the database
  - session cookie is HttpOnly
- File uploads straight from the browser to **S3 / Cloudflare R2** with signed URLs (no extra SDK)
- No UI library. Plain CSS in `app/globals.css`.

## Run it on your computer (Hinglish)
1. Node 20+ install karo. Postgres database banao, sabse aasaan [Neon](https://neon.tech) (free).
2. `.env.example` ko `.env` naam se copy karo. Usme `DATABASE_URL` daalo.
3. Ye commands chalao:
   ```bash
   npm install
   npm run db:push      # database tables banata hai
   npm run db:seed      # demo users + projects (password: ske@1234)
   npm run dev          # http://localhost:3000
   ```
4. Login: `satyam.tiwari@example.com` / `ske@1234` (admin). Baaki demo accounts `prisma/seed.ts` mein hain.

**Asli data ke liye:** seed mat chalao. Seedha `/register` kholo. **Pehla account jo banega wo apne aap admin ban jayega.** Uske baad har naya account approval ke liye wait karega.

## Deploy on Vercel
1. Code GitHub par push karo, phir Vercel par **Import Project** karo.
2. Environment variables daalo:
   - `DATABASE_URL`: Neon ka *pooled* URL
   - `APP_URL`: e.g. `https://projects.shrikrishnaenterprises.in`
   - S3 wale variables, agar file upload chahiye
3. Build command already set hai (`prisma generate && next build`). Pehli baar tables banane ke liye apne computer se `npm run db:push` ek baar chala do.
4. Domain: Vercel → Settings → Domains mein `projects.` subdomain jodo.

## File uploads (optional)
- Bucket banao (AWS S3 `ap-south-1`, ya Cloudflare R2), aur `S3_*` variables bharo.
- Bucket par **CORS** allow karo: method `PUT` aur `GET`, origin = aapka `APP_URL`.
- S3 variables khaali hon to app chalta rahega, sirf file ke naam save honge.
- Files hamesha private rehti hain. Kholne par app access check karta hai, phir 5 minute ka signed link deta hai.

## Who can do what
| Role | Can do |
|---|---|
| **Admin** | Sees every project. Approves accounts. Makes admins. Turns "Creates projects" on/off. Blocks sign-in. |
| **Member with "Creates projects"** | Creates projects, picks people and access, assigns steps. |
| **Manager** (on a project) | Approves or sends back steps, assigns steps, adds steps and people, completes the project. |
| **Team member** (on a project) | Updates and sends for approval **only the steps given to them**. |
| **Viewer** (on a project) | Reads progress only. Good for clients like HBL. |

These checks run in `lib/access.ts` and inside every server action (`app/actions/*`), so hiding a button is never the only protection.

## Security notes
- Each project's link (`/projects/PRJ-1001`) opens only for people on that project. Anyone else sees "You don't have access".
- Passwords use scrypt with a per-user salt.
- Login is limited to 8 tries per email and 20 per IP every 15 minutes. This limiter lives in memory per server, so for a big rollout use Redis/Upstash instead.
- Unknown emails take the same time as wrong passwords.
- Session tokens are random. Only their hash is stored. Disabling a user signs them out everywhere.
- Server Actions check the request origin (built into Next.js). Security headers are set in `next.config.ts`.

## Tests
```bash
npm test
```
Tests cover:
- password hashing
- access rules (who can update, approve, complete)
- S3 signing, checked against AWS's published example
- date and progress helpers

## Files
```
app/(auth)/login, register     sign-in pages
app/(app)/                     signed-in pages: home, projects, projects/new, projects/[code], approvals, team, profile
app/actions/                   server actions: auth.ts, projects.ts, team.ts
app/api/upload, api/files/[id] signed upload / download
lib/                           access rules, sessions, password, storage, formatting, queries
prisma/schema.prisma, seed.ts  database
middleware.ts                  sends signed-out visitors to /login (keeps the project link)
```
# ske-projects
