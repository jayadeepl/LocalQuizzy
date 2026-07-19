# BIRD LiveQuiz

**On Device Quizzing Solution** — a self-hosted, Kahoot-style live quiz app built for BIRD Lucknow. Host a quiz from one PC and let participants join from their phones over the local network (no internet required).

## Features

- **Quiz creation** — build quizzes manually, or import questions in bulk from a CSV/Excel file (download the built-in template from the dashboard to get the exact column format)
- **Live hosting** — real-time host and player screens over WebSockets, with a lobby, QR-code/PIN join, timed or untimed questions, pause/resume, and a leaderboard
- **Question types** — multiple choice (with configurable correct answer), survey (no correct answer), and free-text (rendered as a live word cloud)
- **Scoring modes** — score by speed of response or a flat score for any correct answer; per-quiz option to disable the timer entirely
- **Team mode** — group participants into teams
- **Resilient reconnects** — participants who refresh or briefly drop connection rejoin mid-question instead of losing their place
- **Results & certificates** — exportable results spreadsheet (.xlsx) per session, plus a per-participant certificate page
- **LAN-first** — designed to run entirely on one host machine's local network; a QR code and PIN let phones join without installing anything

## Tech stack

- **Backend**: NestJS, Prisma ORM, SQLite, Socket.IO
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Framer Motion, socket.io-client

## Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- Windows (the launcher scripts are `.bat` files; the app itself is cross-platform if you start the servers manually — see below)

## Setup

Run once, before first use:

```
install.bat
```

This installs dependencies for the root, backend, and frontend, sets up the SQLite database, and (if run as Administrator) opens ports 3000/3001 on the Windows Firewall so other devices on the network can join.

If you skipped the firewall step or need to redo it later, run **`firewall-setup.bat`** as Administrator.

## Running the app

| Script | Use for | Notes |
|---|---|---|
| `start-prod.bat` | **Live hosting / events** | Builds a production bundle first, then serves it. Pages load instantly — recommended whenever you're actually running a quiz. |
| `start.bat` | Active development | Runs both servers in dev/watch mode with hot reload. Each page recompiles the first time you visit it, so it feels slower — don't use this for a live event. |
| `stop.bat` | Cleanup | Stops anything running on ports 3000/3001. Use this if a previous launch is still running, or a start script reports the ports are busy. |

Once running:

- **Host** (this PC): http://localhost:3000
- **Participants** (same WiFi/network): the script prints your machine's LAN IP, e.g. `http://192.168.x.x:3000` — share this URL or the QR code shown in the lobby

Both launcher scripts open the backend in a minimized window and the frontend in the current window; press `Ctrl+C` (or close the window) to stop, or use `stop.bat`.

### Running without the batch scripts (e.g. on macOS/Linux)

```bash
# one-time setup
cd backend && npm install && npx prisma generate && npx prisma migrate deploy && cd ..
cd frontend && npm install && cd ..

# production
cd backend && npm run build && node dist/main &
cd frontend && npm run build && npx next start --hostname 0.0.0.0 --port 3000
```

The backend listens on port 3001, the frontend on port 3000; both must be reachable from participants' devices.

## Typical flow

1. Register/log in, then create a quiz manually or import one (**Template** button on the dashboard downloads the exact CSV format expected by **Import**)
2. Start a session from the dashboard — this opens the **lobby** with a PIN and QR code
3. Participants join at `/join` with the PIN (or by scanning the QR code) and pick a name
4. Start the quiz from the lobby to move to the **host** screen; step through questions, reveal answers, and show the leaderboard between rounds
5. At the end, view full results, export them to Excel, or generate a certificate for each participant

## Project structure

```
backend/    NestJS API + Socket.IO gateway (port 3001)
  src/
    auth/       registration/login (JWT)
    quiz/       quiz CRUD
    question/   question CRUD
    session/    quiz sessions, scoring, leaderboard
    gateway/    real-time game logic (join/rejoin, questions, timers, pause/resume)
    import/     bulk import from CSV/Excel
    export/     results export + certificates
  prisma/       SQLite schema and migrations

frontend/   Next.js app (port 3000)
  src/app/    pages (dashboard, quiz editor, lobby, host, play, results, certificate)
  src/hooks/  socket connection, timer, auth, theme
  src/lib/    API client, socket client, sound effects
```

## Troubleshooting

- **A start script closes instantly / does nothing**: something is already using port 3000 or 3001. Run `stop.bat`, then try again.
- **Other devices can't join**: make sure they're on the same WiFi network as the host PC, and that the firewall rules are in place (`firewall-setup.bat`, run as Administrator).
- **Pages feel slow**: you're likely running `start.bat` (dev mode), which recompiles each page on first visit. Use `start-prod.bat` for real hosting.
