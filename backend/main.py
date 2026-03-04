"""
main.py — This is the heart of our backend (server-side) application.

We're using FastAPI, which is a modern Python framework for building APIs.
An API is basically a set of web addresses (called "endpoints") that the frontend
can call to get, create, or update data.

Here's what this file does:
  - Defines what a "Lead" looks like (the data model)
  - Stores leads in a SQLite database file (database.db) — data persists on restart
  - Sets up REST endpoints so the frontend can fetch and update leads
  - Sets up a WebSocket so the dashboard updates in real time for all users
  - Handles CORS, which stops the browser from blocking requests from our frontend

To start this server, run:
  source venv/bin/activate
  uvicorn main:app --reload --port 8001
"""

import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime
from typing import List, Literal, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── App Setup ─────────────────────────────────────────────────────────────────
app = FastAPI()

# CORS: allow our Next.js frontend to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── SQLite Database Setup ─────────────────────────────────────────────────────
# SQLite stores everything in a single file — no external database server needed.
# This file lives next to main.py in the backend/ folder.
DB_PATH = "database.db"


def get_connection() -> sqlite3.Connection:
    """Open a connection to the SQLite database and enable dict-style row access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Rows behave like dicts: row["name"] instead of row[1]
    return conn


@contextmanager
def get_db():
    """Context manager that opens a DB connection, yields it, then always closes it."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()   # Persist any INSERT / UPDATE / DELETE changes
    except Exception:
        conn.rollback() # Undo partial changes if something went wrong
        raise
    finally:
        conn.close()


def init_db():
    """
    Create the 'leads' table if it doesn't exist yet, and seed it with
    sample data on first run so the dashboard isn't empty.
    """
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id        TEXT PRIMARY KEY,
                name      TEXT NOT NULL,
                email     TEXT NOT NULL,
                status    TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                notes     TEXT DEFAULT ''
            )
        """)

        # Only seed if the table is completely empty (first run only)
        count = conn.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
        if count == 0:
            sample_leads = [
                ("1",  "Alice Johnson",     "alice@example.com",    "New",       "2026-03-01T10:00:00Z", "Interested in cloud solutions."),
                ("2",  "Bob Smith",         "bob@techcorp.com",     "Contacted", "2026-03-01T11:30:00Z", "Follow up on Tuesday."),
                ("3",  "Charlie Davis",     "charlie@startup.io",   "Qualified", "2026-03-02T09:15:00Z", "High budget client."),
                ("4",  "Diana Prince",      "diana@amazon.com",     "Lost",      "2026-03-02T14:45:00Z", "Went with a competitor."),
                ("5",  "Edward Norton",     "edward@films.com",     "New",       "2026-03-02T16:20:00Z", "Wants a demo."),
                ("6",  "Fiona Gallagher",   "fiona@southside.com",  "Contacted", "2026-03-03T08:00:00Z", "Checking internal approval."),
                ("7",  "George Miller",     "george@madmax.com",    "Qualified", "2026-03-03T12:10:00Z", "Ready to sign contract."),
                ("8",  "Hannah Abbott",     "hannah@hogwarts.edu",  "New",       "2026-03-03T15:30:00Z", "Inquiry from website."),
                ("9",  "Ian Wright",        "ian@arsenal.co.uk",    "Contacted", "2026-03-04T09:45:00Z", "Left a voicemail."),
                ("10", "Jenny Slate",       "jenny@comedy.com",     "Lost",      "2026-03-04T11:00:00Z", "Not the right fit currently."),
                ("11", "Kevin Hart",        "kevin@laugh.com",      "Qualified", "2026-03-04T13:20:00Z", "Expansion project."),
                ("12", "Laura Palmer",      "laura@twinpeaks.com",  "New",       "2026-03-04T14:50:00Z", "Urgent request."),
                ("13", "Mike Wazowski",     "mike@monsters.inc",    "Contacted", "2026-03-04T16:10:00Z", "Needs more documentation."),
                ("14", "Nina Simone",       "nina@jazz.com",        "Qualified", "2026-03-05T09:00:00Z", "Recurring partnership interest."),
                ("15", "Oscar Isaac",       "oscar@dune.com",       "New",       "2026-03-05T10:30:00Z", "Referral from partner."),
                ("16", "Peter Parker",      "peter@dailybugle.com", "Contacted", "2026-03-05T11:45:00Z", "Discussing photography services."),
                ("17", "Quentin Tarantino", "qt@pulp.com",          "Lost",      "2026-03-05T13:15:00Z", "Budget constraints."),
                ("18", "Riley Reid",        "riley@studios.com",    "New",       "2026-03-05T14:40:00Z", "New lead from LinkedIn."),
                ("19", "Steven Spielberg",  "steve@amblin.com",     "Qualified", "2026-03-05T15:55:00Z", "Scaling production team."),
                ("20", "Tony Stark",        "tony@starkintl.com",   "Contacted", "2026-03-05T16:50:00Z", "Interested in energy tech."),
            ]
            conn.executemany(
                "INSERT INTO leads (id, name, email, status, createdAt, notes) VALUES (?,?,?,?,?,?)",
                sample_leads
            )


# Run DB init when the server starts
init_db()


# ── Data Models ───────────────────────────────────────────────────────────────
# Pydantic models validate incoming and outgoing data automatically.

LeadStatus = Literal["New", "Contacted", "Qualified", "Lost"]


class Lead(BaseModel):
    id: str
    name: str
    email: str
    status: LeadStatus
    createdAt: str
    notes: Optional[str] = ""


class LeadOut(Lead):
    """Model used when returning lead data to the frontend."""
    pass


class LeadUpdate(BaseModel):
    """Only fields that are being changed need to be included."""
    name:   Optional[str] = None
    email:  Optional[str] = None
    status: Optional[LeadStatus] = None
    notes:  Optional[str] = None


# ── WebSocket Connection Manager ──────────────────────────────────────────────
class ConnectionManager:
    """Tracks all open browser connections and broadcasts updates to all of them."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)


manager = ConnectionManager()


# ── Helper ────────────────────────────────────────────────────────────────────
def row_to_lead(row: sqlite3.Row) -> Lead:
    """Convert a database row into a Lead Pydantic model."""
    return Lead(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        status=row["status"],
        createdAt=row["createdAt"],
        notes=row["notes"] or "",
    )


# ── REST Endpoints ────────────────────────────────────────────────────────────

@app.get("/leads", response_model=List[LeadOut])
async def get_leads(q: Optional[str] = None, status: Optional[str] = None):
    """
    GET /leads — Returns all leads, with optional search and status filters.

      ?q=alice        → leads whose name or email contains "alice" (case-insensitive)
      ?status=New     → leads with status "New"
    """
    with get_db() as conn:
        query = "SELECT * FROM leads ORDER BY createdAt DESC"
        rows = conn.execute(query).fetchall()

    leads = [row_to_lead(r) for r in rows]

    if q:
        q_lower = q.lower()
        leads = [l for l in leads if q_lower in l.name.lower() or q_lower in l.email.lower()]

    if status and status != "all":
        leads = [l for l in leads if l.status == status]

    return leads


@app.get("/leads/{lead_id}", response_model=LeadOut)
async def get_single_lead(lead_id: str):
    """GET /leads/{lead_id} — Returns one lead by ID, or 404 if not found."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Lead not found")

    return row_to_lead(row)


@app.post("/leads", response_model=LeadOut)
async def create_lead(data: dict):
    """
    POST /leads — Creates a new lead and saves it to the database.
    Broadcasts an update to all connected WebSocket clients so dashboards refresh instantly.
    """
    new_lead = Lead(
        id=str(uuid.uuid4()),
        name=data["name"],
        email=data["email"],
        status=data["status"],
        createdAt=datetime.utcnow().isoformat() + "Z",
        notes=data.get("notes", ""),
    )

    with get_db() as conn:
        conn.execute(
            "INSERT INTO leads (id, name, email, status, createdAt, notes) VALUES (?,?,?,?,?,?)",
            (new_lead.id, new_lead.name, new_lead.email, new_lead.status, new_lead.createdAt, new_lead.notes),
        )

    await manager.broadcast({"type": "lead_created", "lead": new_lead.dict()})
    return new_lead


@app.patch("/leads/{lead_id}", response_model=LeadOut)
async def update_lead(lead_id: str, updates: LeadUpdate):
    """
    PATCH /leads/{lead_id} — Updates only the fields that were sent.
    Broadcasts the updated lead to all connected WebSocket clients.
    """
    with get_db() as conn:
        row = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Lead not found")

        lead = row_to_lead(row)

        # Apply only the fields that were actually included in the request
        if updates.name   is not None: lead.name   = updates.name
        if updates.email  is not None: lead.email  = updates.email
        if updates.status is not None: lead.status = updates.status
        if updates.notes  is not None: lead.notes  = updates.notes

        conn.execute(
            "UPDATE leads SET name=?, email=?, status=?, notes=? WHERE id=?",
            (lead.name, lead.email, lead.status, lead.notes, lead_id),
        )

    await manager.broadcast({"type": "lead_updated", "lead": lead.dict()})
    return lead


# ── WebSocket Endpoint ────────────────────────────────────────────────────────
@app.websocket("/ws/leads")
async def websocket_endpoint(websocket: WebSocket):
    """
    WS /ws/leads — Keeps a live connection open with the dashboard.
    When the user leaves the page, the connection is cleaned up automatically.
    """
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep the connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)