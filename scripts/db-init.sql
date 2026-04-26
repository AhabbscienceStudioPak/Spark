-- Generative City Wallet — Database Schema
-- Run once on first startup via docker-entrypoint-initdb.d

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Merchants ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  geo_fence_radius_meters INTEGER NOT NULL DEFAULT 500,
  operating_hours JSONB NOT NULL DEFAULT '[]',
  offer_preview_mode BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  onboarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Campaign Rules ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_discount_percentage NUMERIC(5,2) NOT NULL CHECK (max_discount_percentage >= 0 AND max_discount_percentage <= 100),
  target_time_windows JSONB NOT NULL DEFAULT '[]',
  target_days_of_week JSONB NOT NULL DEFAULT '[]',
  eligible_categories JSONB NOT NULL DEFAULT '[]',
  goal TEXT NOT NULL DEFAULT 'increase_foot_traffic',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Offers ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  consumer_id TEXT,
  context_state_id TEXT NOT NULL,
  content JSONB NOT NULL,
  visual_design JSONB NOT NULL,
  discount_percentage NUMERIC(5,2) NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  rejection_reason TEXT,
  relevance_score INTEGER NOT NULL DEFAULT 0,
  walking_distance_meters INTEGER NOT NULL DEFAULT 0,
  walking_time_minutes INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generation_model TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_consumer_generated ON offers(consumer_id, generated_at);
CREATE INDEX IF NOT EXISTS idx_offers_merchant_status ON offers(merchant_id, status);

-- ── Offer Tokens ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offer_tokens (
  token TEXT PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES offers(id),
  consumer_id TEXT NOT NULL,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  discount_percentage NUMERIC(5,2) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Redemptions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES offers(id),
  consumer_id TEXT NOT NULL,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  original_price NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL,
  final_price NUMERIC(10,2) NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL,
  cashback_credited BOOLEAN NOT NULL DEFAULT false
);

-- ── Dismissals ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dismissals (
  offer_id UUID NOT NULL,
  consumer_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (offer_id, consumer_id)
);

-- ── Validation Log (fraud detection, Req 19.5) ───────────────────────────────
CREATE TABLE IF NOT EXISTS validation_log (
  id BIGSERIAL PRIMARY KEY,
  token TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  result_code TEXT NOT NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_validation_log_token ON validation_log(token);
CREATE INDEX IF NOT EXISTS idx_validation_log_merchant ON validation_log(merchant_id, validated_at);

-- ── Consumer Wallet Balance (cashback, Req 20.5) ─────────────────────────────
CREATE TABLE IF NOT EXISTS consumer_wallets (
  consumer_id TEXT PRIMARY KEY,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── System Health Metrics (Req 30) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_metrics (
  id BIGSERIAL PRIMARY KEY,
  service TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_metrics_service ON health_metrics(service, recorded_at);

-- ── System Alerts (Req 30.5) ─────────────────────────────────────────────────
-- Persistent alerts for admin monitoring dashboard.
-- No external email/webhook needed — alerts live here and show in the UI.
CREATE TABLE IF NOT EXISTS system_alerts (
  id BIGSERIAL PRIMARY KEY,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  metric_name TEXT,
  metric_value NUMERIC,
  threshold NUMERIC,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unacked ON system_alerts(acknowledged, created_at DESC);

-- ── Users (auth — consumers and merchants) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('consumer', 'merchant', 'admin')),
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ── Refresh Tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
