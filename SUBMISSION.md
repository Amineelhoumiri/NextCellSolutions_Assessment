# Full-Stack Assessment Submission

## Candidate Information
**Name:** Amine El Houmiri  
**Email:** medamineelhoumiri@gmail.com  
**Time Spent:** 90 minutes (Part 1) | 90 minutes (Part 2)

---

## What I Delivered
I built a real-time lead management dashboard with a Next.js frontend and a FastAPI backend. It features live updates via WebSockets, server-side filtering, and full CRUD support via REST endpoints.

---

## Technical Decisions

### Frontend
- **Next.js App Router** was used because it is the modern, recommended approach and supports server-side rendering out of the box.
- **shadcn/ui** components (Table, Dialog, Card, Button, Input, Select) were chosen because they are accessible, well-designed, and integrate cleanly with Tailwind CSS.
- **TypeScript** was used throughout with strict typing — no `any` types — to catch mistakes early and make the code easier to understand.
- **useCallback** was used for the fetch function to prevent unnecessary re-renders when the WebSocket effect depends on it.
- Filtering and search parameters are passed directly to the backend API (`?q=` and `?status=`) rather than filtering on the client, so the server does the heavy lifting.

### Backend
- **FastAPI** was chosen because it is fast, easy to read, and automatically generates interactive API documentation at `/docs`.
- **Pydantic models** (`Lead`, `LeadUpdate`) enforce strict data validation — if the frontend sends incorrect data, FastAPI rejects it with a helpful error.
- **SQLite** was used as the database via Python's built-in `sqlite3` module. This ensures data survives server restarts without requiring the installation of any external database servers like PostgreSQL.
- **WebSockets** were implemented so that when any user creates or updates a lead, all open dashboard tabs refresh automatically — without the user needing to reload the page.
- **CORS** is configured to allow both `localhost:3000` and `localhost:3001` so the frontend works regardless of which port Next.js picks.

---

## Reflection

### What went well
- The WebSocket integration worked first time and the real-time updates feel very smooth.
- The shadcn/ui components made it easy to build a clean, consistent UI quickly.
- FastAPI's automatic validation saved a lot of time — I did not need to write manual checks for incoming data.

### What I would improve with more time
- Add real authentication on the login page using JWT tokens.
- Add unit tests for the API endpoints using `pytest`.
- Make the dashboard fully responsive on mobile screens.
- Add a "Delete Lead" button in the detail modal.

---

## AI Usage
I used an AI coding assistant (Google Gemini / Antigravity) throughout this assessment to:
- Help scaffold the initial file structure and boilerplate code.
- Debug Python 3.9 compatibility issues (`str | None` syntax not supported).
- Fix CORS configuration when both ports 3000 and 3001 were needed.
- Generate the 20-lead seed data for the backend.
- Write humanised British English comments in all files.

All code was reviewed, understood, and adjusted by me before submission. The AI was used as a pair-programming tool, not as a replacement for understanding.