-- School invite requests from the landing page

create table if not exists invite_requests (
  id uuid primary key default gen_random_uuid(),
  school_email text not null,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_invite_requests_submitted_at
  on invite_requests (submitted_at desc);

create index if not exists idx_invite_requests_email_lower
  on invite_requests (lower(school_email));

alter table invite_requests enable row level security;

-- No public policies: inserts go through the request-invite Edge Function (service role).
