#!/bin/bash
# Bootstrap служебных ролей Supabase — bare-образ supabase/postgres их НЕ создаёт
# (в официальном self-host это делает volumes/db/roles.sql). .sh, а не .sql —
# чтобы подставить ${POSTGRES_PASSWORD} из env во время init.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- JWT-роли (NOLOGIN, используются через authenticator по claim'у role)
  do \$\$ begin
    if not exists (select from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
    if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
    if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  end \$\$;

  -- LOGIN-роли служб (пароль = POSTGRES_PASSWORD; совпадает с тем, что в env сервисов)
  do \$\$ begin
    if not exists (select from pg_roles where rolname='authenticator') then
      create role authenticator noinherit login password '${POSTGRES_PASSWORD}';
    end if;
    if not exists (select from pg_roles where rolname='supabase_admin') then
      create role supabase_admin login createrole createdb replication bypassrls superuser password '${POSTGRES_PASSWORD}';
    end if;
    if not exists (select from pg_roles where rolname='supabase_auth_admin') then
      create role supabase_auth_admin login createrole password '${POSTGRES_PASSWORD}';
    end if;
    if not exists (select from pg_roles where rolname='supabase_storage_admin') then
      create role supabase_storage_admin login createrole password '${POSTGRES_PASSWORD}';
    end if;
    if not exists (select from pg_roles where rolname='supabase_functions_admin') then
      create role supabase_functions_admin login createrole password '${POSTGRES_PASSWORD}';
    end if;
    if not exists (select from pg_roles where rolname='supabase_read_only_user') then
      create role supabase_read_only_user login bypassrls password '${POSTGRES_PASSWORD}';
    end if;
  end \$\$;

  grant anon, authenticated, service_role to authenticator;
  grant anon, authenticated, service_role to postgres;
  grant all privileges on database postgres to supabase_admin, supabase_auth_admin, supabase_storage_admin, supabase_functions_admin;
  grant connect on database postgres to anon, authenticated, service_role, supabase_read_only_user;

  -- Схемы под админов служб (GoTrue/Storage домигрируют внутри)
  create schema if not exists auth authorization supabase_auth_admin;
  create schema if not exists storage authorization supabase_storage_admin;
  alter role supabase_auth_admin set search_path = auth;
  alter role supabase_storage_admin set search_path = storage;

  -- Storage-гранты (bare-init их НЕ выдаёт → upload падал: сперва 403 "permission
  -- denied to set role service_role", потом 42P01 на storage.buckets). На managed:
  -- (1) supabase_storage_admin — член authenticator → storage-api по JWT-claim делает
  --     SET ROLE service_role/authenticated/anon через цепочку членства;
  grant authenticator to supabase_storage_admin;
  -- (2) JWT-роли видят схему storage и её таблицы. Таблицы (buckets/objects/...)
  --     создаёт storage-api ПОЗЖE под supabase_storage_admin, поэтому дефолт-привилегии
  --     вешаем на ЕГО роль — иначе будущие таблицы останутся без грантов.
  grant usage on schema storage to anon, authenticated, service_role;
  alter default privileges for role supabase_storage_admin in schema storage
    grant all on tables to anon, authenticated, service_role;
  alter default privileges for role supabase_storage_admin in schema storage
    grant all on sequences to anon, authenticated, service_role;

  -- Безопасные расширения (без shared_preload). pg_cron/pg_net создадут миграции.
  create extension if not exists "uuid-ossp";
  create extension if not exists pgcrypto;
  create extension if not exists pgjwt cascade;

  -- JWT-настройки для PostgREST/pgjwt
  alter database postgres set "app.settings.jwt_secret" to '${JWT_SECRET}';
  alter database postgres set "app.settings.jwt_exp" to '3600';
EOSQL

echo "01-roles.sh: служебные роли Supabase созданы"
