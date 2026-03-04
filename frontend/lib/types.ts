/*
  types.ts — This file is where we define the "shape" of our data.
  Think of it like a form template: before we fill in any details about a lead,
  we decide exactly what fields a lead should have.
  
  By defining these types here, TypeScript will warn us straight away
  if we accidentally forget a field or use the wrong kind of value.
*/

// These are the only four statuses a lead can have in our system.
// Using a "type" here means TypeScript won't let us accidentally type "Contacted" wrong
// or use a value like "Maybe" that doesn't exist.
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Lost";

// This is the full description of what a Lead looks like.
// Every lead in our app — whether it comes from the backend or the local JSON file —
// must have all of these fields. If one is missing, TypeScript will flag it up.
export interface Lead {
    id: string;        // A unique identifier so we can tell leads apart (e.g. "1", "2" or a long random ID)
    name: string;      // The lead's full name
    email: string;     // Their email address — used for contact and searching
    status: LeadStatus; // Where they are in our sales process (must be one of the four options above)
    createdAt: string; // The date and time the lead was added, stored as a standard ISO string (e.g. "2026-03-01T10:00:00Z")
    notes: string;     // Any extra information we want to remember about this person
}