# Olymp Finance OTC

Базовый обменник для OTC-направления — фронт-энд + Supabase backend.

## Стек

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + lucide-react
- **Backend:** Supabase (Postgres + Auth + Edge Functions + Storage)
- **Auth:** email + OTP (Supabase Auth / GoTrue)
- **Деплой:** Docker (nginx-alpine) + Caddy reverse proxy с автоматическим Let's Encrypt SSL

## Что внутри

**Клиентский фронт:**
- Калькулятор обмена (фиат ↔ крипто, фиат ↔ фиат, крипто ↔ крипто)
- История ордеров + детальная карточка
- Личный кабинет, KYC (загрузка документов руками)
- Юр. страницы (политика конфиденциальности, оферта)

**Админка** (`/admin`):
- Ордера: фильтры, статусы, ручное проведение
- Валюты: курсы, комиссии, лимиты, банковские реквизиты, сети крипты
- KYC верификация: очередь заявок, просмотр документов, approve / reject
- Отчёты Финнадзора (Excel + PDF)
- Контент сайта (баннеры, секции, юр. страницы)
- RBAC сотрудников: кастомные роли + permissions

## Локальная разработка

```bash
cp .env.example .env.local
# заполнить VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY из Supabase dashboard
npm install
npm run dev   # http://localhost:8080
```

## Применение БД-схемы

Свежий Supabase проект — выполнить в SQL Editor:

1. `init-otc-db.sql` — создаёт таблицы, ENUMы, RLS политики, триггеры, GRANTы (включая `documents`, `legal_pages`, `quiz_questions`, `site_content`, storage buckets, RPC)
2. `seed-otc.sql` — добавляет дефолтного оператора + 7 стартовых валют (KGS/USD/RUB + USDT/USDC/BTC/ETH)
3. `seed-olympfinance-content.sql` *(опционально)* — реквизиты ЗАО «Фиатэкс», юр. страницы (оферта/политика/условия/AML), контент сайта (hero/features/stats), 5 вопросов KYC-квиза. Применить если разворачиваешь продакшен Olymp Finance; для свежей установки под другого оператора — пропустить.

После применения — обновить TypeScript типы:
```bash
npx supabase gen types typescript --project-id <YOUR-PROJECT-REF> > src/integrations/supabase/types.ts
```

## Production-деплой (self-hosted)

Один сервер, single-tenant. Cloud Supabase — отдельно.

```bash
# 1. Поднять Cloud Supabase проект, применить init-otc-db.sql + seed-otc.sql
# 2. На целевом сервере:
curl -fsSL https://olympfinance.kg/install.sh | bash
# Скрипт спросит: домен, email админа, Supabase URL, Supabase publishable key
```

`install.sh` поднимает Docker + Caddy с auto-SSL и наш фронт-контейнер. Backend — это ваш Cloud Supabase проект.

**Не-интерактивный (CI):**
```bash
DOMAIN=olympfinance.kg \
ADMIN_EMAIL=ops@olympfinance.kg \
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_KEY=eyJ... \
bash install.sh --yes
```

## Обновление

Push в `main` → CI/CD ребилдит образ → docker compose pull → restart. Если используется install.sh — на сервере:

```bash
cd /opt/olympfinance
docker compose pull
docker compose up -d
```

## Структура проекта

```
src/
  components/         React-компоненты (UI / exchange / order / admin / kyc)
  contexts/           OperatorContext, BrandingContext, ApprovalContext
  hooks/              useAuth, useOperatorId, useStaffPermissions, ...
  pages/              public + /admin/*
  integrations/supabase/  Supabase client + сгенерированные типы

supabase/
  functions/
    asystem-kyc/      Manual KYC review с risk-scoring (legacy slug)
    create-staff-member/  Создание сотрудника в admin RBAC
    nbkr-rates/       Парсер курсов НБКР (cron-friendly)
  migrations/         Postgres-миграции (применять через init-otc-db.sql)

install.sh            One-click self-host installer
docker-compose.yaml   Production compose: фронт + Caddy
Dockerfile            Multi-stage build: Vite → nginx-alpine
```

## Переменные окружения

| Имя | Откуда | Пример |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → anon JWT | `eyJhbGc...` |

## См. также

- [`HANDOVER.md`](./HANDOVER.md) — пошаговая передача проекта (доступы, ownership, контакты).

## Лицензия

Proprietary.
