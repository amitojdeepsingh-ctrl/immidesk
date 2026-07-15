-- Run this in Supabase SQL Editor
-- v2 migration: Document Templates, Case Stages, RBAC, Notifications, AI Features

-- Update UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CONSULTANT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ASSISTANT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AUDITOR';

-- CaseTypeConfig: per-org per-stream document templates + case stages
CREATE TABLE "CaseTypeConfig" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
    case_type TEXT NOT NULL,
    document_templates JSONB NOT NULL DEFAULT '[]',
    case_stages JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, case_type)
);
CREATE INDEX idx_casetypeconfig_org ON "CaseTypeConfig"(organization_id);

-- RolePermission: granular role-based access control
CREATE TABLE "RolePermission" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, role, permission)
);
CREATE INDEX idx_roleperm_org ON "RolePermission"(organization_id);

-- NotificationPreference: per-user per-event settings
CREATE TABLE "NotificationPreference" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    email BOOLEAN NOT NULL DEFAULT true,
    in_app BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, event)
);
CREATE INDEX idx_notifpref_user ON "NotificationPreference"(user_id);

-- AiFeatureConfig: per-org AI feature flags
CREATE TABLE "AiFeatureConfig" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
    feature_type TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, feature_type)
);
CREATE INDEX idx_aifeature_org ON "AiFeatureConfig"(organization_id);
