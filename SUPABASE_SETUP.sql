-- Cyfernode submission verification. Run this whole file in the Supabase SQL Editor.
-- It has not been applied automatically.
--
-- Reuses schools, event_registrations, and participants.
-- Each event_registrations row is one team. Several rows may share a school and event.
-- Teachers are teacher_email on those rows. Students are participants.
-- school_passkeys has no browser policies. Only the service-role Edge Function reads it.

alter table public.schools
  add column if not exists is_active boolean not null default true;

alter table public.event_registrations
  add column if not exists is_active boolean not null default true,
  add column if not exists team_number int,
  add column if not exists team_name text;

with numbered as (
  select
    id,
    row_number() over (
      partition by school_code, event_id
      order by created_at, id
    ) as rn
  from public.event_registrations
  where school_code is not null
    and team_number is null
)
update public.event_registrations er
set
  team_number = numbered.rn,
  team_name = coalesce(nullif(btrim(er.team_name), ''), 'Team ' || numbered.rn)
from numbered
where er.id = numbered.id;

create unique index if not exists event_registrations_school_event_team
  on public.event_registrations (school_code, event_id, team_number)
  where school_code is not null and team_number is not null;

create index if not exists idx_event_registrations_school_active
  on public.event_registrations (school_code, event_id)
  where is_active;

create index if not exists idx_participants_email_lower
  on public.participants (lower(email));

do $$ begin
  create type public.submission_status as enum ('draft', 'submitted', 'under_review', 'reviewed', 'disqualified');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.deliverable_type as enum ('file', 'url', 'text');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_role as enum ('student', 'teacher_in_charge');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_status as enum ('pending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_deliverables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  key text not null,
  name text not null,
  description text not null default '',
  type public.deliverable_type not null,
  required boolean not null default true,
  accepted_file_types text[] not null default '{}',
  max_file_size_mb int,
  max_words int,
  accepted_link_types text[] not null default '{}',
  sort_order int not null default 0,
  helper_text text not null default '',
  placeholder text not null default '',
  created_at timestamptz not null default now(),
  unique (event_id, key)
);

drop table if exists public.submission_deliverables cascade;
drop table if exists public.submission_notifications cascade;
drop table if exists public.submissions cascade;
drop table if exists public.submission_admins cascade;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete restrict,
  event_registration_id uuid not null unique references public.event_registrations (id) on delete restrict,
  school_code text not null,
  school_name_snapshot text not null,
  event_slug text not null,
  event_name_snapshot text not null,
  team_name_snapshot text not null,
  team_number int,
  submitted_by_email text not null,
  submitted_by_name text not null,
  submitted_by_role public.submission_role not null,
  status public.submission_status not null default 'draft',
  reference_code text unique,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.submission_deliverables (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  deliverable_id uuid not null references public.event_deliverables (id) on delete restrict,
  deliverable_key text not null default '',
  deliverable_name text not null default '',
  value text,
  file_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, deliverable_id)
);

create table public.submission_notifications (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  recipient_email text not null,
  recipient_name text not null default '',
  recipient_type text not null check (recipient_type in ('teacher_in_charge', 'team_student')),
  notification_type text not null default 'submission_finalized',
  status public.notification_status not null default 'pending',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.school_passkeys (
  school_code text primary key,
  passkey text not null check (passkey ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.submission_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  school_id uuid not null references public.schools (id) on delete cascade,
  school_code text not null,
  email text not null,
  display_name text not null,
  role public.submission_role not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.submission_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  school_code text not null,
  email text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_code, email)
);

create index if not exists idx_submissions_school on public.submissions (school_id);
create index if not exists idx_submissions_status on public.submissions (status);
create index if not exists idx_submission_notifications_status on public.submission_notifications (status, created_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
drop trigger if exists submissions_set_updated_at on public.submissions;
create trigger submissions_set_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();
drop trigger if exists submission_deliverables_set_updated_at on public.submission_deliverables;
create trigger submission_deliverables_set_updated_at before update on public.submission_deliverables
  for each row execute function public.set_updated_at();
drop trigger if exists submission_attempts_set_updated_at on public.submission_verification_attempts;
create trigger submission_attempts_set_updated_at before update on public.submission_verification_attempts
  for each row execute function public.set_updated_at();

create or replace function public.set_submission_reference()
returns trigger language plpgsql as $$
begin
  if new.reference_code is null or btrim(new.reference_code) = '' then
    new.reference_code := 'SUB-' || upper(substr(replace(new.id::text, '-', ''), 1, 12));
  end if;
  return new;
end $$;

drop trigger if exists submissions_set_reference on public.submissions;
create trigger submissions_set_reference before insert on public.submissions
  for each row execute function public.set_submission_reference();

create or replace function public.protect_final_submission()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if old.status is distinct from 'draft' then
    raise exception 'This submission is locked';
  end if;
  return new;
end $$;

drop trigger if exists submissions_protect_final on public.submissions;
create trigger submissions_protect_final before update on public.submissions
  for each row execute function public.protect_final_submission();

create or replace function public.protect_submission_deliverable_row()
returns trigger language plpgsql as $$
declare
  parent_status public.submission_status;
  parent_id uuid;
begin
  if auth.role() = 'service_role' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  parent_id := case when tg_op = 'DELETE' then old.submission_id else new.submission_id end;
  select status into parent_status from public.submissions where id = parent_id;
  if parent_status is distinct from 'draft' then
    raise exception 'This submission is locked';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists submission_deliverables_protect_final on public.submission_deliverables;
create trigger submission_deliverables_protect_final
  before insert or update or delete on public.submission_deliverables
  for each row execute function public.protect_submission_deliverable_row();

alter table public.events enable row level security;
alter table public.event_deliverables enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_deliverables enable row level security;
alter table public.submission_notifications enable row level security;
alter table public.school_passkeys enable row level security;
alter table public.submission_sessions enable row level security;
alter table public.submission_verification_attempts enable row level security;

drop policy if exists events_public_read on public.events;
drop policy if exists event_deliverables_public_read on public.event_deliverables;
drop policy if exists submissions_select_own on public.submissions;
drop policy if exists submissions_insert_own_draft on public.submissions;
drop policy if exists submissions_update_own_draft on public.submissions;
drop policy if exists submission_deliverables_select_own on public.submission_deliverables;
drop policy if exists submission_deliverables_insert_own_draft on public.submission_deliverables;
drop policy if exists submission_deliverables_update_own_draft on public.submission_deliverables;
drop policy if exists submission_deliverables_delete_own_draft on public.submission_deliverables;

revoke all on table public.school_passkeys from anon, authenticated;
revoke all on table public.submission_sessions from anon, authenticated;
revoke all on table public.submission_verification_attempts from anon, authenticated;
revoke all on table public.submissions from anon, authenticated;
revoke all on table public.submission_deliverables from anon, authenticated;
revoke all on table public.submission_notifications from anon, authenticated;

grant select on public.events to anon, authenticated;
grant select on public.event_deliverables to anon, authenticated;

create policy events_public_read on public.events
  for select to anon, authenticated using (is_active);
create policy event_deliverables_public_read on public.event_deliverables
  for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.is_active));

insert into storage.buckets (id, name, public, file_size_limit)
values ('submission-files', 'submission-files', false, 209715200)
on conflict (id) do update set public = false, file_size_limit = 209715200;

drop policy if exists submission_files_select_own on storage.objects;
drop policy if exists submission_files_insert_own_draft on storage.objects;
drop policy if exists submission_files_update_own_draft on storage.objects;
drop policy if exists submission_files_delete_own_draft on storage.objects;

-- Deliverable seed is appended by the same statements as the previous setup.
-- Kept in supabase/functions side via the file continuation marker below.

insert into public.events (slug, name, description, is_active, sort_order)
values
  ('fontastic', 'Fontastic', 'Submit the final poster and the editable design project.', true, 1),
  ('blendered', 'Blendered', 'Submit the final render, the editable 3D project, and any external asset credits.', true, 2),
  ('unscripted', 'Unscripted', 'Submit a public link to the finished work and the script.', true, 3),
  ('buildout', 'Buildout', 'Submit a video explanation and the pitch deck as public links.', true, 4),
  ('breadboard', 'Breadboard', 'Submit the pitch deck, a short demo, and the project source as public links.', true, 5),
  ('wireframe', 'Wireframe', 'Submit the editable design file, a UI showcase PDF, and a short design essay.', true, 6),
  ('entrepreneur-exe', 'Entrepreneur.exe', 'Submit one pitch deck that covers the idea, company, branding, and business model.', true, 7),
  ('unbranded', 'Unbranded', 'Submit the rebrand deck, advertisement, optional website, and philosophy write-up.', true, 8)
on conflict (slug) do update
set name = excluded.name, description = excluded.description, is_active = excluded.is_active, sort_order = excluded.sort_order, updated_at = now();

insert into public.event_deliverables (
  event_id, key, name, description, type, required,
  accepted_file_types, max_file_size_mb, max_words,
  accepted_link_types, sort_order, helper_text, placeholder
)
select e.id, v.key, v.name, v.description, v.type::public.deliverable_type, v.required,
       v.accepted_file_types, v.max_file_size_mb, v.max_words,
       v.accepted_link_types, v.sort_order, v.helper_text, v.placeholder
from public.events e
join (
  values
    ('fontastic', 'fontastic_final_poster', 'Final Poster', 'Upload your final poster.', 'file', true, array['png','jpg','jpeg'], 20, null::int, array[]::text[], 1, 'PNG, JPG, or JPEG. Recommended maximum size: 20 MB.', ''),
    ('fontastic', 'fontastic_project_file', 'Editable Project File', 'Upload your editable source/project file.', 'file', true, array['psd','ai','fig','cdr','afdesign','pdf'], 100, null, array[]::text[], 2, 'Upload your editable source/project file. Any common design tool is fine. Recommended maximum size: 100 MB.', ''),
    ('blendered', 'blendered_final_render', 'Final 3D Render', 'Upload the final still of your 3D work.', 'file', true, array['png','jpg','jpeg','webp'], 50, null, array[]::text[], 1, 'PNG, JPG, JPEG, or WEBP. Recommended maximum size: 50 MB.', ''),
    ('blendered', 'blendered_project_file', 'Editable 3D Project File', 'Upload the editable 3D project.', 'file', true, array['blend','fbx','stl','obj','glb','gltf','usd','usdz','abc','c4d','ma','mb','max','ztl'], 200, null, array[]::text[], 2, 'BLEND, FBX, STL, OBJ, GLB, GLTF, or another relevant 3D project format. Recommended maximum size: 200 MB.', ''),
    ('blendered', 'blendered_external_assets', 'Credits / External Assets', 'List external textures, materials, or other legally usable assets.', 'text', false, array[]::text[], null, null, array[]::text[], 3, 'External textures, materials, and legally usable assets may be used with appropriate credits. Pre-made models must not form the main creative work.', 'Example: Texture from Poly Haven — https://polyhaven.com/...; HDRI from ...'),
    ('unscripted', 'unscripted_work_video', 'Work / Video', 'Submit a publicly accessible link to your completed work/video.', 'url', true, array[]::text[], null, null, array['YouTube','Google Drive','Vimeo','OneDrive','Dropbox'], 1, 'Submit a publicly accessible link to your completed work/video.', 'https://youtube.com/watch?v=... or https://drive.google.com/...'),
    ('unscripted', 'unscripted_script', 'Script', 'Upload the script.', 'file', true, array['pdf','doc','docx','txt'], 20, null, array[]::text[], 2, 'PDF, DOC, DOCX, or TXT. Maximum size: 20 MB.', ''),
    ('buildout', 'buildout_video_explanation', 'Video Explanation', 'Submit a public link to your explanation video.', 'url', true, array[]::text[], null, null, array['YouTube','Google Drive','Vimeo','Loom'], 1, 'YouTube, Google Drive, Vimeo, or Loom.', 'https://youtube.com/... or https://drive.google.com/...'),
    ('buildout', 'buildout_pitch_deck', 'Pitch Deck', 'Submit a public link to the pitch deck.', 'url', true, array[]::text[], null, null, array['Google Drive','Google Slides','Canva','Figma','Behance','Adobe Express'], 2, 'Google Drive, Google Slides, Canva, Figma, Behance, or Adobe Express.', 'https://drive.google.com/... or https://www.canva.com/...'),
    ('breadboard', 'breadboard_pitch_deck', 'Pitch Deck', 'Submit a public link to the pitch deck.', 'url', true, array[]::text[], null, null, array['Google Drive','Google Slides','Canva','Figma','Behance'], 1, 'Google Drive, Google Slides, Canva, Figma, Behance, or another public presentation link.', 'https://drive.google.com/... or https://www.canva.com/...'),
    ('breadboard', 'breadboard_demo_video', 'Demo Video', 'Submit a public link to the demo.', 'url', true, array[]::text[], null, null, array['YouTube','Google Drive','Vimeo','Loom'], 2, 'Maximum recommended duration: 2 minutes.', 'https://youtube.com/... or https://drive.google.com/...'),
    ('breadboard', 'breadboard_source_code', 'Source Code Repository / Project Link', 'Submit a public repository or project archive link.', 'url', true, array[]::text[], null, null, array['GitHub','GitLab','Bitbucket','Google Drive'], 3, 'GitHub, GitLab, Bitbucket, or a public Google Drive ZIP.', 'https://github.com/username/project'),
    ('wireframe', 'wireframe_project_file', 'Editable Project File', 'Submit a link to the editable design file.', 'url', true, array[]::text[], null, null, array['Figma','Adobe XD','Penpot','Sketch'], 1, 'Figma, Adobe XD, Penpot, Sketch Cloud, or another accessible design-tool link.', 'https://figma.com/file/... or https://penpot.app/...'),
    ('wireframe', 'wireframe_ui_showcase_pdf', 'UI Showcase PDF', 'Upload a PDF that shows the interface.', 'file', true, array['pdf'], 50, null, array[]::text[], 2, 'PDF only. Recommended maximum size: 50 MB.', ''),
    ('wireframe', 'wireframe_design_essay', 'Design Essay', 'Upload a short essay about the design.', 'file', true, array['pdf','doc','docx','txt'], 20, 150, array[]::text[], 3, 'Maximum 150 words. PDF, DOC, DOCX, or TXT. Maximum size: 20 MB. Word count is checked for plain text files.', ''),
    ('entrepreneur-exe', 'entrepreneur_pitch_deck', 'Pitch Deck', 'One deck covering Idea, Company, Branding, and Logistics & Business Model.', 'url', true, array[]::text[], null, null, array['Google Drive','Google Slides','Canva','Figma','Behance'], 1, 'The deck itself must include: Idea, Company, Branding, and Logistics & Business Model.', 'https://drive.google.com/... or https://www.canva.com/...'),
    ('unbranded', 'unbranded_pitch_deck', 'Pitch Deck', 'One deck covering the rebrand.', 'url', true, array[]::text[], null, null, array['Google Drive','Google Slides','Canva','Figma','Behance'], 1, 'The deck itself must include: New Logo, Brand Colours & Typography, Brand Creatives, Company & Brand Positioning, New Target Audience, Product / Company Twist, GTM Strategy, and Redesigned Creative Applications.', 'https://drive.google.com/... or https://www.canva.com/...'),
    ('unbranded', 'unbranded_ad_video', 'Advertisement Video', 'Submit a public link to the advertisement.', 'url', true, array[]::text[], null, null, array['YouTube','Google Drive','Vimeo','Loom'], 2, 'Minimum 1-minute advertisement introducing your rebranded GitHub.', 'https://youtube.com/... or https://drive.google.com/...'),
    ('unbranded', 'unbranded_website', 'Redesigned Website (Optional)', 'Optional public link to the redesigned website.', 'url', false, array[]::text[], null, null, array['Vercel','Netlify','GitHub Pages'], 3, 'Optional. Vercel, Netlify, GitHub Pages, a custom domain, or another public website.', 'https://your-project.vercel.app'),
    ('unbranded', 'unbranded_philosophy', 'Rebrand Philosophy', 'Upload the write-up explaining the rebrand.', 'file', true, array['pdf','doc','docx','txt'], 20, null, array[]::text[], 4, '150-word write-up explaining the thinking and philosophy behind your rebrand. PDF, DOC, DOCX, or TXT. Maximum size: 20 MB.', '')
) as v(slug, key, name, description, type, required, accepted_file_types, max_file_size_mb, max_words, accepted_link_types, sort_order, helper_text, placeholder)
  on e.slug = v.slug
on conflict (event_id, key) do update
set name = excluded.name, description = excluded.description, type = excluded.type, required = excluded.required,
    accepted_file_types = excluded.accepted_file_types, max_file_size_mb = excluded.max_file_size_mb,
    max_words = excluded.max_words, accepted_link_types = excluded.accepted_link_types,
    sort_order = excluded.sort_order, helper_text = excluded.helper_text, placeholder = excluded.placeholder;

insert into public.school_passkeys (school_code, passkey)
values
  ('CYN00', '4060'),
  ('CYN01', '5967'),
  ('CYN02', '2802'),
  ('CYN03', '1479'),
  ('CYN04', '7498'),
  ('CYN05', '9838'),
  ('CYN06', '2584'),
  ('CYN07', '8481'),
  ('CYN08', '6609'),
  ('CYN09', '4574'),
  ('CYN10', '3024'),
  ('CYN11', '7171'),
  ('CYN12', '8662'),
  ('CYN13', '2242'),
  ('CYN14', '9471'),
  ('CYN15', '4872'),
  ('CYN16', '6003'),
  ('CYN17', '6617'),
  ('CYN18', '2379'),
  ('CYN19', '6651'),
  ('CYN20', '2144'),
  ('CYN21', '2512'),
  ('CYN22', '5684'),
  ('CYN23', '7137'),
  ('CYN24', '8432'),
  ('CYN25', '9732'),
  ('CYN26', '7338'),
  ('CYN27', '3498'),
  ('CYN28', '1845'),
  ('CYN29', '4311'),
  ('CYN30', '9734'),
  ('CYN31', '2648'),
  ('CYN32', '7819'),
  ('CYN33', '9487'),
  ('CYN34', '4265'),
  ('CYN35', '7630'),
  ('CYN36', '0553'),
  ('CYN37', '4027'),
  ('CYN38', '5843'),
  ('CYN39', '7845'),
  ('CYN40', '1086'),
  ('CYN41', '8547'),
  ('CYN42', '4074'),
  ('CYN43', '1830'),
  ('CYN44', '6418'),
  ('CYN45', '9711'),
  ('CYN46', '3327'),
  ('CYN47', '7360'),
  ('CYN48', '4292'),
  ('CYN49', '5457'),
  ('CYN50', '3814'),
  ('CYN51', '2838'),
  ('CYN52', '6956'),
  ('CYN53', '5620'),
  ('CYN54', '5779'),
  ('CYN55', '0636'),
  ('CYN56', '9825'),
  ('CYN57', '8364'),
  ('CYN58', '9012'),
  ('CYN59', '3946'),
  ('CYN60', '0529'),
  ('CYN61', '2848'),
  ('CYN62', '4536'),
  ('CYN63', '8891'),
  ('CYN64', '6506'),
  ('CYN65', '4411'),
  ('CYN66', '2912'),
  ('CYN67', '1847'),
  ('CYN68', '6575'),
  ('CYN69', '7856'),
  ('CYN70', '6136'),
  ('CYN71', '4867'),
  ('CYN72', '7322'),
  ('CYN73', '7288'),
  ('CYN74', '4011'),
  ('CYN75', '8178'),
  ('CYN76', '7102'),
  ('CYN77', '8802'),
  ('CYN78', '9830'),
  ('CYN79', '6929'),
  ('CYN80', '3217'),
  ('CYN81', '3499'),
  ('CYN82', '6658'),
  ('CYN83', '8099'),
  ('CYN84', '3913'),
  ('CYN85', '9481'),
  ('CYN86', '5015'),
  ('CYN87', '2087'),
  ('CYN88', '3563'),
  ('CYN89', '9247'),
  ('CYN90', '2846'),
  ('CYN91', '8225'),
  ('CYN92', '0719'),
  ('CYN93', '8583'),
  ('CYN94', '2738'),
  ('CYN95', '1142'),
  ('CYN96', '3760'),
  ('CYN97', '9084'),
  ('CYN98', '7180'),
  ('CYN99', '3770'),
  ('CYN100', '0147')
on conflict (school_code) do update set passkey = excluded.passkey;

