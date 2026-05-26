-- Migration: 001_initial
-- Creates the core tables for the Ethora BNB Faucet indexer.

CREATE TABLE IF NOT EXISTS drip_events (
  id              BIGSERIAL PRIMARY KEY,
  wallet          VARCHAR(42)   NOT NULL,
  token           VARCHAR(42)   NOT NULL,
  amount          NUMERIC(78,0) NOT NULL,
  cooldown_expiry TIMESTAMPTZ   NOT NULL,
  tx_hash         VARCHAR(66)   NOT NULL,
  block_number    INTEGER       NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_drip_tx_token UNIQUE (tx_hash, token)
);

CREATE INDEX idx_drip_wallet     ON drip_events (wallet);
CREATE INDEX idx_drip_token      ON drip_events (token);
CREATE INDEX idx_drip_created_at ON drip_events (created_at DESC);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash    VARCHAR(64)   NOT NULL UNIQUE,
  label       TEXT,
  owner_email TEXT,
  tier        VARCHAR(20)   NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url         TEXT        NOT NULL,
  events      TEXT[]      NOT NULL,
  secret_hash VARCHAR(64) NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
