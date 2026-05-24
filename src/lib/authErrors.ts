/**
 * Перевод сообщений ошибок Supabase Auth на русский.
 *
 * Supabase возвращает английские строки в `error.message`. Чтобы клиент не
 * видел «Email not confirmed» — пропускаем все ошибки через `translateAuthError`.
 *
 * Сюда же добавляются новые маппинги при появлении неизвестных текстов.
 */

type ErrorLike = { message?: string; code?: string } | null | undefined;

const RULES: Array<{ match: RegExp; ru: string }> = [
  // signIn
  { match: /invalid login credentials/i, ru: "Неверный email или пароль" },
  { match: /email not confirmed/i, ru: "Email не подтверждён. Проверьте почту и перейдите по ссылке из письма." },
  { match: /email link is invalid or has expired/i, ru: "Ссылка из письма устарела. Запросите новую." },

  // signUp
  { match: /user already (registered|exists)/i, ru: "Пользователь с таким email уже зарегистрирован" },
  { match: /signups? (is )?(not allowed|disabled)/i, ru: "Регистрация временно отключена. Попробуйте позже." },
  { match: /password should be at least/i, ru: "Пароль должен содержать минимум 6 символов" },
  { match: /password is too (weak|short)/i, ru: "Пароль слишком слабый — добавьте цифры и заглавные буквы" },
  { match: /password.* compromised|pwned/i, ru: "Этот пароль засветился в утечках. Придумайте другой." },

  // email validation
  { match: /unable to validate email|invalid email/i, ru: "Неверный формат email" },
  { match: /email address.*invalid/i, ru: "Неверный формат email" },

  // OTP
  { match: /(otp|token|code).*expired/i, ru: "Код истёк. Запросите новый." },
  { match: /(otp|token|code).*invalid|invalid (otp|token|code)/i, ru: "Неверный код. Попробуйте снова." },

  // rate limits
  { match: /email rate limit exceeded/i, ru: "Слишком много запросов на этот email. Попробуйте через минуту." },
  { match: /rate limit exceeded|too many requests/i, ru: "Слишком много запросов. Попробуйте через минуту." },

  // network / server
  { match: /network|failed to fetch/i, ru: "Ошибка сети. Проверьте подключение и попробуйте снова." },
  { match: /database error|internal server error/i, ru: "Сервис временно недоступен. Попробуйте через минуту." },

  // session
  { match: /jwt expired|session.*expired/i, ru: "Сессия истекла. Войдите снова." },
  { match: /refresh token .* not found|invalid refresh token/i, ru: "Сессия истекла. Войдите снова." },
];

export function translateAuthError(error: ErrorLike): string {
  if (!error) return "Произошла непредвиденная ошибка";
  const msg = error.message ?? "";
  if (!msg) return "Произошла непредвиденная ошибка";

  for (const rule of RULES) {
    if (rule.match.test(msg)) return rule.ru;
  }

  // Fallback — оригинальное сообщение, но без шанса испугать клиента английским
  return msg;
}
