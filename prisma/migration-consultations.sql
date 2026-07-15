-- Run this in Supabase SQL Editor
-- Adds Consultation and AvailabilityRule tables

CREATE TABLE "Consultation" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
    consultant_id TEXT NOT NULL REFERENCES "User"(id),
    client_id TEXT REFERENCES "Client"(id) ON DELETE SET NULL,
    lead_email TEXT,
    lead_name TEXT,
    lead_phone TEXT,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')),
    room_name TEXT,
    meeting_link TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultation_org ON "Consultation"(organization_id);
CREATE INDEX idx_consultation_consultant ON "Consultation"(consultant_id);
CREATE INDEX idx_consultation_client ON "Consultation"(client_id);
CREATE INDEX idx_consultation_start ON "Consultation"(start_time);
CREATE INDEX idx_consultation_status ON "Consultation"(status);

CREATE TABLE "AvailabilityRule" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    slot_duration INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, day_of_week)
);

CREATE INDEX idx_avail_org ON "AvailabilityRule"(organization_id);
CREATE INDEX idx_avail_user ON "AvailabilityRule"(user_id);
