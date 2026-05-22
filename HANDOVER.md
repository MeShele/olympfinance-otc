# Handover — Olymp Finance OTC

Чеклист передачи проекта команде Olymp Finance.

## Что передаётся

| Слой | Артефакт | Где | Действие при передаче |
|---|---|---|---|
| Исходный код | `MeShele/olympfinance-otc` (private) | GitHub | `gh repo transfer` или invite collaborator |
| База + Auth | Supabase project `ggdnvpirfsobwwkglchw` | supabase.com | Settings → General → Transfer organization |
| Домен | `olympfinance.kg` | Cloudflare account `Urmatdigital@gmail.com` | Move to client's Cloudflare account |
| Хостинг | Coolify project «Olymp Finance OTC» | `c.asystem.ai` (наш VM) | (a) оставляем за абон. плату; (b) клиент через `install.sh` поднимает свой сервер |

## Доступы которые надо ротировать ПЕРЕД передачей

- [ ] **DB password** Supabase — Settings → Database → Reset password (был в setup-чате)
- [ ] **Cloudflare API token** который использовался для setup — Cloudflare → My Profile → API Tokens → Roll
- [ ] **Coolify deploy key** (`olympfinance-otc-github-deploy`) — оставить, либо клиент сгенерирует свой
- [ ] **GitHub deploy key** (та же пара что в Coolify) — оставить или ротировать вместе с Coolify

## Доступы которые надо передать клиенту

- [ ] GitHub: invite их аккаунт как Admin (`gh api repos/MeShele/olympfinance-otc/collaborators/<their-username> -X PUT -f permission=admin`) или transfer ownership
- [ ] Supabase: Settings → Team → Invite member (Owner) или transfer organization
- [ ] Cloudflare: Members → Invite (Super Administrator) или domain transfer
- [ ] (если оставляем Coolify за нами) — расшарить read-only API token чтобы они видели логи

## Production checklist (обязательно к передаче)

### База + Auth
- [x] Schema применена (`init-otc-db.sql`, 17 таблиц + 3 storage bucket'а)
- [x] Seed применён (`seed-otc.sql`: оператор + 7 валют)
- [x] PostgREST grants для anon/authenticated/authenticator/supabase_auth_admin
- [x] RLS включён на все таблицы
- [x] Создан первый `operator_admin` — `admin@olympfinance.kg` (см. «Стартовые креды» ниже)
- [x] Edge Functions задеплоены: `asystem-kyc`, `nbkr-rates`, `create-staff-member`
- [x] End-to-end smoke 2026-05-11: 12/12 публичных страниц 200, 11/11 PostgREST таблиц 200, 4/4 RPC отвечают, 3/3 edge functions живые

### Стартовые креды (ротировать после первого входа клиента)

| Что | Значение |
|---|---|
| **Сайт** | https://olympfinance.kg |
| **Админка** | https://olympfinance.kg/admin |
| **Admin login** | `admin@olympfinance.kg` |
| **Admin password** | `Olymp FinanceAdmin2026!` |
| Supabase project ref | `ggdnvpirfsobwwkglchw` |
| Supabase URL | `https://ggdnvpirfsobwwkglchw.supabase.co` |
| Supabase Dashboard | https://supabase.com/dashboard/project/ggdnvpirfsobwwkglchw |
| Operator id | `00000000-0000-0000-0000-000000000001` (Olymp Finance) |
| GitHub repo | `MeShele/olympfinance-otc` (private) |
| Cloudflare zone | `olympfinance.kg` (account `Urmatdigital@gmail.com`) |
| Хостинг (текущий) | Coolify `c.asystem.ai`, project «Olymp Finance OTC» |
| DNS A | `olympfinance.kg` + `www.olympfinance.kg` → 65.21.205.230 |
| SSL | Let's Encrypt via host Caddy (auto-renew) |

При первом входе клиент должен:
1. Сменить пароль (через UI «Профиль» или Supabase Dashboard → Authentication → Users).
2. Завести admin'а на свой корпоративный email через Дашборд.
3. Удалить `admin@olympfinance.kg` если он не нужен.
4. Заполнить реквизиты компании, юр. страницы, контент сайта.

### Что включено и работает

- ✅ Калькулятор обмена (фиат ↔ крипто, фиат ↔ фиат, крипто ↔ крипто)
- ✅ Регистрация / вход через email + password
- ✅ Личный кабинет, история ордеров, документы
- ✅ KYC верификация (manual + риск-скоринг)
- ✅ Админка: ордера, валюты, KYC очередь, отчёты Финнадзор (Excel/PDF)
- ✅ Управление валютами: «Курсы валют» → 2 таба (Список + Курсы и лимиты)
- ✅ Авто-подбор иконок валют по тикеру (CoinCap CDN + CoinGecko)
- ✅ Юр. страницы 4 типа (Оферта, Конфиденциальность, Условия, AML)
- ✅ Контент сайта (hero, features, stats — редактируется)
- ✅ Брендинг (логотип, фавикон, цвета, контакты, соцсети)
- ✅ Квиз для онбординга
- ✅ Курсы НБКР (edge function `nbkr-rates`, можно дёргать кроном)
- ✅ RBAC: роли сотрудников, granular permissions
- ✅ Светлая тема (тёмную убрали по запросу клиента)

### Frontend
- [x] Build чистый (`tsc --noEmit` 0 ошибок, `vite build` зелёный)
- [x] Routes покрыты для public + admin
- [x] OperatorContext single-tenant
- [ ] Базовый брендинг (название «Olymp Finance», контакты, цвета) — **ОЖИДАЕТ** информации от клиента
- [ ] Логотип (`public/logo.png` + `public/favicon.ico`) — **ОЖИДАЕТ**

### Хостинг + домен
- [x] Coolify deploy auto через `git push`
- [x] DNS A `olympfinance.kg` + `www.olympfinance.kg` → 65.21.205.230
- [x] Let's Encrypt SSL через host Caddy
- [ ] Cloudflare proxy mode — **по решению** (сейчас off — для Let's Encrypt)
- [ ] Email: SPF/DKIM/DMARC для рассылки auth-OTP — **зависит от Supabase SMTP**

### Юридическое
- [ ] Юр. страницы наполнены: оферта, политика конфиденциальности, AML-политика — **ОЖИДАЕТ контента от клиента**
- [ ] Лицензия криптообменника КР — **на стороне клиента**

## Канал фидбека

После передачи — клиент тестит, шлёт баги. Варианты канала:

- GitHub Issues (`MeShele/olympfinance-otc/issues`) — рекомендую, привязано к коммитам
- Telegram-чат с заранее созданным ботом-форвардом
- Email в `support@asystem.ai` или `support@olympfinance.kg`

Каждый бойко-критичный фидбек → багфикс в OTC + если применимо в основной ASystem Core (одинаковая кодовая база на 80%).

## Что мы НЕ передаём (это наш ASystem Core USP)

- Модульная система (`modules`, `operator_modules`, маркетплейс)
- api_clients (KYC Core, Payment Core, SDK)
- provision-tenant (multi-tenancy инфра)
- license-manager + OTA updates
- Comply Core (хиты ГСФР, лимиты, видео-сессии, IP-tracking, stealth quarantine)
- KYC провайдеры: SumSub, Biometric Vision, Didit
- Acquiring: Finik, crypto-acquiring, FreedomPay, ELQR, NowPayments
- AML провайдеры: Chainalysis, Elliptic, Crystal
- SuperAdmin (платформа-уровень)

Всё это — отдельные платные модули которые мы можем продавать клиенту позже как апгрейды.
