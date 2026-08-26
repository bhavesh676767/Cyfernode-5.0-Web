-- Rate-limit tracking for the register Edge Function (service role only)

create table if not exists registration_rate_limits (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_ip_time
  on registration_rate_limits (ip_hash, attempted_at desc);

alter table registration_rate_limits enable row level security;

-- No public policies: only the Edge Function (service role) reads/writes this table.
