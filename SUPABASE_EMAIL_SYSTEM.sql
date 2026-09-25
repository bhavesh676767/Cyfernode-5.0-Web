-- ==============================================================================
-- Cyfernode 5.0 Email System Schema
-- File: SUPABASE_EMAIL_SYSTEM.sql
-- 
-- Run this script in your Supabase SQL Editor.
-- This sets up the email_notifications table used to log, monitor, and retry
-- passkey and submission notification emails.
-- It is designed to be 100% self-contained and run cleanly in any order.
-- ==============================================================================

-- 1. Create email_notifications table (no hard prerequisite table dependencies)
create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  email_type text not null check (email_type in ('passkey', 'submission_teacher', 'submission_student', 'submission_finalized')),
  recipient text not null,
  recipient_name text not null default '',
  recipient_type text check (recipient_type in ('teacher_in_charge', 'team_student', 'participant', 'other')),
  submission_id uuid,
  event_registration_id uuid,
  subject text not null default '',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Conditionally link foreign keys if target tables exist
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'submissions') then
    if not exists (select 1 from information_schema.table_constraints where constraint_name = 'fk_email_notifications_submission') then
      alter table public.email_notifications
        add constraint fk_email_notifications_submission
        foreign key (submission_id) references public.submissions(id) on delete set null;
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'event_registrations') then
    if not exists (select 1 from information_schema.table_constraints where constraint_name = 'fk_email_notifications_event_reg') then
      alter table public.email_notifications
        add constraint fk_email_notifications_event_reg
        foreign key (event_registration_id) references public.event_registrations(id) on delete set null;
    end if;
  end if;
exception when others then null;
end $$;

-- 3. Indexes for fast status filtering, recipient search, and retry queues
create index if not exists idx_email_notifications_status_created
  on public.email_notifications (status, created_at desc);

create index if not exists idx_email_notifications_submission_id
  on public.email_notifications (submission_id);

create index if not exists idx_email_notifications_event_reg_id
  on public.email_notifications (event_registration_id);

create index if not exists idx_email_notifications_recipient
  on public.email_notifications (lower(recipient));

create index if not exists idx_email_notifications_type
  on public.email_notifications (email_type);

-- 4. Automatic updated_at trigger
create or replace function public.set_email_notifications_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists email_notifications_set_updated_at on public.email_notifications;
create trigger email_notifications_set_updated_at
  before update on public.email_notifications
  for each row execute function public.set_email_notifications_updated_at();

-- 5. Row Level Security (RLS)
alter table public.email_notifications enable row level security;

-- Revoke direct browser/anon/authenticated access (sensitive emails/metadata)
revoke all on table public.email_notifications from anon, authenticated;

-- Service role has full access (Edge functions use service role)
drop policy if exists email_notifications_service_role on public.email_notifications;
create policy email_notifications_service_role
  on public.email_notifications
  for all
  to service_role
  using (true)
  with check (true);
