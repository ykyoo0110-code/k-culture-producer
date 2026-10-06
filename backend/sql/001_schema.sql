-- Supabase SQL Editor에서 실행합니다.
create extension if not exists pgcrypto;

create table if not exists experience_sessions (
  id uuid primary key default gen_random_uuid(),
  language text not null default 'ja',
  nickname text not null default '',
  current_step integer not null default 0,
  current_scene text not null default 'V01',
  last_decision jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists connect_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  nickname text not null default 'ANONYMOUS',
  country text not null default '',
  language text not null default 'ja',
  message text not null check (char_length(message) between 1 and 120),
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  moderation_reason text,
  created_at timestamptz not null default now()
);

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_no text unique not null,
  session_id uuid,
  nickname text not null,
  producer_type text not null,
  score integer not null,
  language text not null default 'ja',
  created_at timestamptz not null default now()
);

create table if not exists media_contents (
  id uuid primary key default gen_random_uuid(),
  scene text not null,
  kind text not null check (kind in ('video','image','poster','thumbnail','audio')),
  title text,
  file_url text not null,
  thumbnail_url text,
  language text not null default 'common',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 수업용 초기 구성에서는 FastAPI의 service role key를 통해서만 쓰기를 수행합니다.
-- 운영 배포 전에는 RLS/관리자 인증 정책을 별도로 설정하세요.


create table if not exists user_characters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  nickname text not null default 'PARTICIPANT',
  language text not null default 'ja',
  mode text not null default 'basic' check (mode in ('basic','prompt','photo')),
  character_key text not null default 'mina',
  prompt_text text not null default '',
  image_url text not null default '',
  provider text not null default 'project-original',
  created_at timestamptz not null default now()
);

-- 기존 DB에도 오디오 등록을 허용합니다. 파일·미디어 기록은 삭제하지 않습니다.
-- CREATE TABLE IF NOT EXISTS만으로는 기존 CHECK 제약이 갱신되지 않으므로 별도 적용합니다.
alter table media_contents drop constraint if exists media_contents_kind_check;
alter table media_contents add constraint media_contents_kind_check
  check (kind in ('video','image','poster','thumbnail','audio'));
