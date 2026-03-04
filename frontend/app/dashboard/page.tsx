/*
  dashboard/page.tsx — This is the main page of the app.

  It does several things at once:
  1. Fetches the list of leads from our Python backend when the page loads
  2. Keeps the data up to date in real time using WebSockets
  3. Lets the user search and filter leads without reloading the page
  4. Shows a details popup when you click on a lead
  5. Lets you add a brand new lead using a form in a popup

  All of this happens on the client side (in the browser),
  which is why we have "use client" at the very top.
*/

"use client";

import { useState, useEffect, useCallback } from "react";
import { Lead, LeadStatus } from "@/lib/types"; // Our custom type definitions
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

// Storing the backend address in one place means we only need to change it here
// if the port ever changes — rather than hunting through every fetch() call.
const API = "http://127.0.0.1:8001";

export default function DashboardPage() {

    // ── State Variables ──────────────────────────────────────────────────────
    // Think of "state" as the page's memory. When any of these values change,
    // React automatically redraws the parts of the page that use them.

    const [leads, setLeads] = useState<Lead[]>([]);           // The full list of leads from the backend
    const [loading, setLoading] = useState(true);              // True while we're waiting for data to arrive
    const [searchTerm, setSearchTerm] = useState("");          // Whatever the user has typed in the search box
    const [statusFilter, setStatusFilter] = useState<string>("all"); // The currently selected status in the dropdown
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null); // The lead the user clicked on (for the detail popup)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);   // Whether the "Add New Lead" popup is open
    const [newLeadData, setNewLeadData] = useState({           // The values typed into the "Add New Lead" form
        name: "", email: "", status: "New", notes: ""
    });

    // ── Fetching Data from the Backend ───────────────────────────────────────
    // This function sends a request to our FastAPI server and saves the response.
    // We pass the search term and status filter directly as URL query parameters
    // so the SERVER does the filtering — not the browser.
    // We wrap it in "useCallback" so React doesn't recreate the function unnecessarily.
    // Note: searchTerm and statusFilter are listed as dependencies so a fresh fetch
    // fires automatically whenever the user changes either filter.
    const fetchLeads = useCallback(async () => {
        try {
            setLoading(true);
            // Build the URL with query parameters so the backend handles filtering
            const params = new URLSearchParams();
            if (searchTerm) params.append("q", searchTerm);
            if (statusFilter !== "all") params.append("status", statusFilter);

            const response = await fetch(`${API}/leads?${params.toString()}`);
            const data = await response.json();
            setLeads(data);
        } catch (error) {
            console.error("Backend connection failed:", error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter]); // Re-run whenever either filter changes

    // Run fetchLeads once as soon as the dashboard page loads
    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // ── Real-Time Updates via WebSocket ──────────────────────────────────────
    // A WebSocket is like a telephone call between the browser and the server.
    // Unlike normal HTTP requests (which are like sending a letter),
    // the connection stays open so the server can send us news at any moment.
    //
    // Here, whenever someone creates or updates a lead on the backend,
    // the server sends us a message and we refresh our table automatically.
    useEffect(() => {
        const socket = new WebSocket(`ws://127.0.0.1:8001/ws/leads`);

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data); // Parse the incoming message from JSON text

            // If a lead was created or updated, re-fetch the full list to stay in sync
            if (message.type === "lead_created" || message.type === "lead_updated") {
                fetchLeads();
            }
        };

        // Clean-up: when the user leaves the dashboard, close the connection politely.
        // This prevents memory leaks in the browser.
        return () => socket.close();
    }, [fetchLeads]);

    // ── Creating a New Lead ──────────────────────────────────────────────────
    // This function runs when the user submits the "Add New Lead" form.
    // It sends the form data to the backend using a POST request.
    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent the browser from refreshing the page on form submit
        try {
            const res = await fetch(`${API}/leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }, // Tell the server we're sending JSON
                body: JSON.stringify(newLeadData),                // Convert the form data to a JSON string
            });

            if (res.ok) {
                // If the server accepted our new lead:
                setIsCreateModalOpen(false);                            // Close the popup
                setNewLeadData({ name: "", email: "", status: "New", notes: "" }); // Reset the form
                fetchLeads();                                           // Refresh the table immediately
            }
        } catch (error) {
            console.error("Error creating lead:", error);
        }
    };

    // ── Analytics Calculations ───────────────────────────────────────────────
    // Since filtering is now done server-side, "leads" already contains only
    // the matching results. We compute counts from the full unfiltered list
    // by fetching without params — but for simplicity here we count from what we have.
    const totalLeads = leads.length;

    // This "reduce" loop builds an object like: { New: 6, Contacted: 5, ... }
    const statusCounts = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // ── Status Badge Colours ─────────────────────────────────────────────────
    // Each status gets a different colour so users can spot them at a glance.
    // These are Tailwind CSS class names.
    const statusBadgeColor: Record<LeadStatus, string> = {
        New: "bg-blue-100 text-blue-700",
        Contacted: "bg-yellow-100 text-yellow-700",
        Qualified: "bg-green-100 text-green-700",
        Lost: "bg-red-100 text-red-700",
    };

    // ── Render ───────────────────────────────────────────────────────────────
    // Everything below is JSX — a mix of HTML and JavaScript that React
    // converts into the actual webpage the browser displays.
    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">

            {/* ── Header ── */}
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Lead Dashboard</h1>
                <div className="flex items-center gap-4">
                    {/* Clicking this button opens the "Add New Lead" popup */}
                    <Button onClick={() => setIsCreateModalOpen(true)}>+ New Lead</Button>
                    {/* A simple avatar placeholder — in a real app this would show the user's photo */}
                    <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold">
                        USR
                    </div>
                </div>
            </header>

            {/* ── Analytics Cards ── */}
            {/* These cards give the user a quick overview of how many leads are in each category */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500">Total Leads</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Show "..." while loading, then show the real number */}
                        <div className="text-2xl font-bold">{loading ? "..." : totalLeads}</div>
                    </CardContent>
                </Card>

                {/* Loop through each status and create one card for each */}
                {(["New", "Contacted", "Qualified", "Lost"] as LeadStatus[]).map((status) => (
                    <Card key={status}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-500">{status}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? "..." : (statusCounts[status] || 0)}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Filters ── */}
            {/* The search box and status dropdown work together to narrow down the table */}
            <div className="flex gap-4 items-center">
                <Input
                    placeholder="Search by name or email..."
                    className="max-w-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)} // Update state on every keystroke
                />
                <Select onValueChange={setStatusFilter} defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Qualified">Qualified</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* ── Leads Table ── */}
            {/* This is the main data table. It shows filtered results, not all leads */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            // While data is loading, show a single row with a message
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10 text-zinc-400">
                                    Loading leads from backend...
                                </TableCell>
                            </TableRow>
                        ) : leads.length > 0 ? (
                            // If there are leads to show, render one row per lead
                            leads.map((lead: Lead) => (
                                <TableRow
                                    key={lead.id}
                                    className="cursor-pointer hover:bg-zinc-50"
                                    onClick={() => setSelectedLead(lead)} // Open the detail popup on click
                                >
                                    <TableCell className="font-medium">{lead.name}</TableCell>
                                    <TableCell>{lead.email}</TableCell>
                                    <TableCell>
                                        {/* Coloured badge — the colour depends on the status */}
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeColor[lead.status]}`}>
                                            {lead.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {/* Convert the ISO date string to a human-readable format */}
                                        {new Date(lead.createdAt).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            // If the search matches nothing, show an empty state message
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10 text-zinc-500">
                                    No leads found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Modal: Create New Lead ── */}
            {/* This popup appears when the user clicks "+ New Lead" */}
            {/* "open" controls whether the popup is visible or hidden */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Lead</DialogTitle>
                        <DialogDescription>Fill in the details below to add a new lead to the system.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                        <Input
                            placeholder="Full Name"
                            required
                            value={newLeadData.name}
                            onChange={e => setNewLeadData({ ...newLeadData, name: e.target.value })}
                        />
                        <Input
                            type="email"
                            placeholder="Email Address"
                            required
                            value={newLeadData.email}
                            onChange={e => setNewLeadData({ ...newLeadData, email: e.target.value })}
                        />
                        {/* Status selector — defaults to "New" for fresh leads */}
                        <Select value={newLeadData.status} onValueChange={val => setNewLeadData({ ...newLeadData, status: val })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Contacted">Contacted</SelectItem>
                                <SelectItem value="Qualified">Qualified</SelectItem>
                                <SelectItem value="Lost">Lost</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Notes (optional)"
                            value={newLeadData.notes}
                            onChange={e => setNewLeadData({ ...newLeadData, notes: e.target.value })}
                        />
                        <DialogFooter>
                            {/* Cancel closes the popup without saving anything */}
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Lead</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Modal: Lead Details ── */}
            {/* This popup appears when the user clicks on a row in the table */}
            {/* "!!selectedLead" converts the lead object to true/false for the "open" prop */}
            <Dialog open={!!selectedLead} onOpenChange={(open) => { if (!open) setSelectedLead(null); }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{selectedLead?.name}</DialogTitle>
                        <DialogDescription>{selectedLead?.email}</DialogDescription>
                    </DialogHeader>
                    {/* Only render the content if a lead is actually selected */}
                    {selectedLead && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-500">Status:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeColor[selectedLead.status]}`}>
                                    {selectedLead.status}
                                </span>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-zinc-500">Created:</span>
                                <p className="text-sm mt-1">
                                    {/* Display the date in a friendly format like "1 March 2026" */}
                                    {new Date(selectedLead.createdAt).toLocaleDateString("en-GB", {
                                        year: "numeric", month: "long", day: "numeric",
                                    })}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-zinc-500">Notes:</span>
                                <p className="text-sm mt-1 text-zinc-700 bg-zinc-50 rounded-md p-3 border">
                                    {selectedLead.notes || "No notes recorded for this lead."}
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
}