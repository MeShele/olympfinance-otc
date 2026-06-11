#!/usr/bin/env bash
# Синхронизация паролей служебных ролей Supabase = POSTGRES_PASSWORD.
# Вынесено в файл (а не inline в compose), чтобы не воевать с $-интерполяцией compose.
# Ждём, пока РЕАЛЬНЫЙ Postgres примет коннекты (supabase/postgres при init поднимает
# временный сервер → healthcheck врёт → потом рестарт). Ретраим. Best-effort: не
# валим стек, если роли уже корректны (ON_ERROR_STOP=0 + exit 0).
set -u
export PGPASSWORD="${POSTGRES_PASSWORD}"
ROLES=(supabase_admin supabase_auth_admin supabase_storage_admin authenticator supabase_functions_admin supabase_read_only_user)

echo "db-init: ожидание Postgres..."
until pg_isready -h db -U postgres -q; do sleep 2; done
sleep 4   # пережить init-рестарт реального сервера

for attempt in $(seq 1 40); do
  ok=1
  # пробный коннект
  if psql -h db -U postgres -d postgres -tAc "select 1" >/dev/null 2>&1; then
    for r in "${ROLES[@]}"; do
      if psql -h db -U postgres -d postgres -tAc "select 1 from pg_roles where rolname='$r'" 2>/dev/null | grep -q 1; then
        psql -h db -U postgres -d postgres -v ON_ERROR_STOP=0 -q \
          -c "alter role $r with password '${POSTGRES_PASSWORD}'" >/dev/null 2>&1 || ok=0
      fi
    done
    if [ "$ok" = 1 ]; then echo "db-init: пароли ролей синхронизированы"; exit 0; fi
  fi
  echo "db-init: попытка $attempt — Postgres ещё не готов"; sleep 3
done
echo "db-init: исчерпал попытки (продолжаю, стек не валю)"; exit 0
