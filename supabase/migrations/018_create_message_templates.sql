-- Create message_templates table for WhatsApp/message templates
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.message_templates enable row level security;

-- Each authenticated user manages only their own templates
create policy "Users can view own templates"
  on public.message_templates
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own templates"
  on public.message_templates
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own templates"
  on public.message_templates
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own templates"
  on public.message_templates
  for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete
  on public.message_templates
  to authenticated;

-- keep updated_at in sync
create or replace function public.set_message_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_message_templates_updated_at on public.message_templates;

create trigger set_message_templates_updated_at
before update on public.message_templates
for each row
execute procedure public.set_message_templates_updated_at();

