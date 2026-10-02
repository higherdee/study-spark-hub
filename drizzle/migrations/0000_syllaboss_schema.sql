create type public.app_role as enum ('admin', 'user');
create type public.material_status as enum ('pending', 'verified', 'rejected');
create type public.withdrawal_status as enum ('pending', 'paid', 'rejected');

create table public.profiles (
  id uuid primary key,
  full_name text,
  email text,
  phone text,
  institution text,
  course text,
  department text,
  level text,
  referral_source text,
  study_plan jsonb not null default '{}'::jsonb,
  onboarding_step int not null default 0,
  points int not null default 0,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (full_name, phone, institution, course, department, level, referral_source, study_plan, onboarding_step, updated_at) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "read own profile or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  course_code text,
  course text not null,
  institution text not null,
  level text,
  material_type text not null,
  description text,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  page_count int not null default 0,
  status material_status not null default 'pending',
  verification_score int,
  verification_notes text,
  points_awarded int not null default 0,
  downloads int not null default 0,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index materials_status_idx on public.materials(status, created_at desc);
grant select on public.materials to anon;
grant select, insert, delete on public.materials to authenticated;
grant all on public.materials to service_role;
alter table public.materials enable row level security;
create policy "verified materials are public" on public.materials for select to anon, authenticated using (status = 'verified');
create policy "owners read own" on public.materials for select to authenticated using (user_id = auth.uid());
create policy "admins read all" on public.materials for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "owners insert pending" on public.materials for insert to authenticated with check (user_id = auth.uid() and status = 'pending' and points_awarded = 0 and page_count = 0 and verification_score is null and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended));
create policy "owners delete unverified" on public.materials for delete to authenticated using (user_id = auth.uid() and status <> 'verified');
create policy "admins delete" on public.materials for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount int not null,
  reason text not null,
  material_id uuid,
  withdrawal_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.points_ledger to authenticated;
grant all on public.points_ledger to service_role;
alter table public.points_ledger enable row level security;
create policy "read own ledger or admin" on public.points_ledger for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  points int not null,
  amount_naira int not null,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  status withdrawal_status not null default 'pending',
  admin_note text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;
alter table public.withdrawals enable row level security;
create policy "read own withdrawals or admin" on public.withdrawals for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.points_for_pages(_pages int)
returns int language sql immutable set search_path = public
as $$ select least(greatest(coalesce(_pages,1),1) * 5, 500) $$;

create or replace function public.set_material_status(_material_id uuid, _status material_status, _score int, _notes text)
returns void language plpgsql security definer set search_path = public
as $$
declare m public.materials; pts int;
begin
  select * into m from public.materials where id = _material_id for update;
  if not found then raise exception 'Material not found'; end if;
  update public.materials set status = _status, verification_score = coalesce(_score, verification_score),
    verification_notes = coalesce(_notes, verification_notes), reviewed_at = now() where id = _material_id;
  if _status = 'verified' and m.points_awarded = 0 then
    pts := public.points_for_pages(m.page_count);
    update public.materials set points_awarded = pts where id = _material_id;
    update public.profiles set points = points + pts where id = m.user_id;
    insert into public.points_ledger (user_id, amount, reason, material_id) values (m.user_id, pts, 'Verified upload (' || greatest(m.page_count,1) || ' pages): ' || m.title, m.id);
  elsif _status <> 'verified' and m.points_awarded > 0 then
    update public.materials set points_awarded = 0 where id = _material_id;
    update public.profiles set points = greatest(points - m.points_awarded, 0) where id = m.user_id;
    insert into public.points_ledger (user_id, amount, reason, material_id) values (m.user_id, -m.points_awarded, 'Upload un-verified: ' || m.title, m.id);
  end if;
end; $$;
revoke execute on function public.set_material_status(uuid, material_status, int, text) from public, anon, authenticated;
grant execute on function public.set_material_status(uuid, material_status, int, text) to service_role;

create or replace function public.admin_review_material(_material_id uuid, _status material_status, _notes text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  perform public.set_material_status(_material_id, _status, null, _notes);
end; $$;
revoke execute on function public.admin_review_material(uuid, material_status, text) from public, anon;
grant execute on function public.admin_review_material(uuid, material_status, text) to authenticated;

create or replace function public.request_withdrawal(_points int, _bank text, _account_number text, _account_name text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare bal int; susp boolean; wid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if _points < 50 or _points % 50 <> 0 then raise exception 'Withdraw in multiples of 50 points'; end if;
  if length(trim(_bank)) < 2 or _account_number !~ '^[0-9]{10}$' or length(trim(_account_name)) < 3 then
    raise exception 'Enter valid bank details (10-digit account number)'; end if;
  select points, suspended into bal, susp from public.profiles where id = auth.uid() for update;
  if susp then raise exception 'Your account is suspended'; end if;
  if bal < _points then raise exception 'Not enough points'; end if;
  update public.profiles set points = points - _points where id = auth.uid();
  insert into public.withdrawals (user_id, points, amount_naira, bank_name, account_number, account_name)
    values (auth.uid(), _points, (_points / 50) * 200, trim(_bank), _account_number, trim(_account_name)) returning id into wid;
  insert into public.points_ledger (user_id, amount, reason, withdrawal_id) values (auth.uid(), -_points, 'Cash withdrawal request', wid);
  return wid;
end; $$;
revoke execute on function public.request_withdrawal(int, text, text, text) from public, anon;
grant execute on function public.request_withdrawal(int, text, text, text) to authenticated;

create or replace function public.admin_process_withdrawal(_id uuid, _status withdrawal_status, _note text)
returns void language plpgsql security definer set search_path = public
as $$
declare w public.withdrawals;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * into w from public.withdrawals where id = _id for update;
  if w.status <> 'pending' then raise exception 'Already processed'; end if;
  update public.withdrawals set status = _status, admin_note = _note, processed_at = now() where id = _id;
  if _status = 'rejected' then
    update public.profiles set points = points + w.points where id = w.user_id;
    insert into public.points_ledger (user_id, amount, reason, withdrawal_id) values (w.user_id, w.points, 'Withdrawal refunded', w.id);
  end if;
end; $$;
revoke execute on function public.admin_process_withdrawal(uuid, withdrawal_status, text) from public, anon;
grant execute on function public.admin_process_withdrawal(uuid, withdrawal_status, text) to authenticated;

create or replace function public.admin_set_suspended(_user_id uuid, _suspended boolean)
returns void language plpgsql security definer set search_path = public
as $$ begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.profiles set suspended = _suspended where id = _user_id;
end; $$;
revoke execute on function public.admin_set_suspended(uuid, boolean) from public, anon;
grant execute on function public.admin_set_suspended(uuid, boolean) to authenticated;

create or replace function public.admin_adjust_points(_user_id uuid, _amount int, _reason text)
returns void language plpgsql security definer set search_path = public
as $$ begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _amount = 0 or length(trim(coalesce(_reason,''))) < 3 then raise exception 'Give an amount and a reason'; end if;
  update public.profiles set points = greatest(points + _amount, 0) where id = _user_id;
  insert into public.points_ledger (user_id, amount, reason) values (_user_id, _amount, 'Admin: ' || trim(_reason));
end; $$;
revoke execute on function public.admin_adjust_points(uuid, int, text) from public, anon;
grant execute on function public.admin_adjust_points(uuid, int, text) to authenticated;

create or replace function public.record_material_download(_material_id uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare p text;
begin
  if auth.uid() is null then raise exception 'Sign in to download'; end if;
  update public.materials set downloads = downloads + 1
    where id = _material_id and status = 'verified' returning file_path into p;
  if p is null then raise exception 'Material not available'; end if;
  return p;
end; $$;
revoke all on function public.record_material_download(uuid) from public, anon;
grant execute on function public.record_material_download(uuid) to authenticated;

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.chat_threads to authenticated;
grant all on public.chat_threads to service_role;
alter table public.chat_threads enable row level security;
create policy "own threads" on public.chat_threads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null,
  message_id text not null,
  role text not null,
  parts jsonb not null,
  created_at timestamptz not null default now()
);
create index chat_messages_thread_idx on public.chat_messages(thread_id, created_at);
grant select, insert, delete on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;
create policy "own messages" on public.chat_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users upload own material files" on storage.objects for insert to authenticated with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own material files" on storage.objects for select to authenticated using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own material files" on storage.objects for delete to authenticated using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admins read material files" on storage.objects for select to authenticated using (bucket_id = 'materials' and public.has_role(auth.uid(), 'admin'));
create policy "signed in read verified files" on storage.objects for select to authenticated using (bucket_id = 'materials' and exists (select 1 from public.materials m where m.file_path = name and m.status = 'verified'));