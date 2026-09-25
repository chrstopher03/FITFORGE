-- Ejecuta este SQL en el SQL Editor de Supabase.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  weight numeric,
  height numeric,
  goal text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid()=id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid()=id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);

drop policy if exists "user_state_select_own" on public.user_state;
create policy "user_state_select_own" on public.user_state for select using (auth.uid()=user_id);
drop policy if exists "user_state_insert_own" on public.user_state;
create policy "user_state_insert_own" on public.user_state for insert with check (auth.uid()=user_id);
drop policy if exists "user_state_update_own" on public.user_state;
create policy "user_state_update_own" on public.user_state for update using (auth.uid()=user_id) with check (auth.uid()=user_id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,name) values(new.id,coalesce(new.raw_user_meta_data->>'name','Usuario FITFORGE')) on conflict(id) do nothing;
  insert into public.user_state(user_id,state_json) values(new.id,'{}'::jsonb) on conflict(user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Para la foto de perfil, crea en Storage un bucket llamado "avatars" y configúralo como privado o público según tu política.
-- Si lo haces público, limita las políticas de subida a la carpeta del usuario.
