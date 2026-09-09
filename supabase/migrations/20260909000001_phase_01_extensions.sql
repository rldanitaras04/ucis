-- UCIS Migration: Phase 01 - Extensions
-- Dependencies: None

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions (for gen_random_bytes, token generation)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Advisory locks are built into PostgreSQL core, no extension needed.
-- Use pg_advisory_lock(id) / pg_advisory_unlock(id) directly.
