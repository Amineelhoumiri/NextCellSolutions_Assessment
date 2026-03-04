# NexCell Solutions — Lead Management Dashboard

A full-stack lead management CRM built as part of the NexCell Solutions technical assessment.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python 3.9), Pydantic, Uvicorn |
| Real-time | WebSockets |
| Storage | SQLite (local file: database.db) |

## Project Structure

```
repo-root/
├── frontend/          # Next.js application
│   ├── app/
│   │   ├── login/     # Login page
│   │   ├── dashboard/ # Main dashboard page
│   │   └── page.tsx   # Root redirect to /login
│   ├── components/ui/ # shadcn/ui components
│   ├── data/          # leads.json seed data
│   └── lib/           # TypeScript types
├── backend/           # FastAPI application
│   ├── main.py        # All routes, models, and WebSocket logic
│   ├── database.db    # SQLite database (auto-created on start)
│   ├── requirements.txt
│   └── venv/          # Python virtual environment
├── SUBMISSION.md
├── SUBMISSION.json
└── README.md
```

## How to Run Locally

### Backend
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```
API available at: `http://localhost:8001`  
Interactive docs at: `http://localhost:8001/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App available at: `http://localhost:3000`

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/leads` | Get all leads. Supports `?q=` search and `?status=` filter |
| GET | `/leads/{id}` | Get a single lead by ID |
| POST | `/leads` | Create a new lead |
| PATCH | `/leads/{id}` | Update an existing lead |
| WS | `/ws/leads` | WebSocket for real-time lead updates |

## Features

- **Login page** — stores email in localStorage, redirects to dashboard
- **Analytics cards** — live counts for Total, New, Contacted, Qualified, Lost
- **Searchable table** — search by name or email, filter by status (server-side)
- **Lead detail modal** — click any row to see full lead info and notes
- **Create lead modal** — add new leads via a form, table updates instantly
- **Real-time updates** — WebSocket broadcasts changes to all open tabs
