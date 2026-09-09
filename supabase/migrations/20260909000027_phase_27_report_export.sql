-- UCIS Migration: Phase 27 - Report Export
-- Dependencies: Phase 25 (audit_logs)

CREATE TABLE report_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor UUID NOT NULL REFERENCES auth.users(id),
  report_type TEXT NOT NULL,
  scope TEXT NOT NULL,
  filters JSONB,
  record_count INTEGER,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id UUID
);

CREATE INDEX idx_report_export_logs_actor ON report_export_logs(actor);
CREATE INDEX idx_report_export_logs_exported_at ON report_export_logs(exported_at);
