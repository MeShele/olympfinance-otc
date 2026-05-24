-- QuizGate использует profiles.quiz_passed чтобы решить, показывать ли
-- модалку с тестом знаний. Без этой колонки query падает 400 и гейт не
-- срабатывает. NOT NULL DEFAULT false — существующие юзеры считаются «не
-- прошёл» и получат тест при следующем входе.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quiz_passed boolean NOT NULL DEFAULT false;
