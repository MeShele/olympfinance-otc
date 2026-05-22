import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOperatorId, DEFAULT_OPERATOR_ID } from "./useOperatorId";

// ---- Section Builder Types ----

export interface SectionConfig {
  id: string;
  section: string;
  display_order: number;
  is_enabled: boolean;
  variant: string;
  content: any;
}

// Available section types with their variant options
export const SECTION_VARIANTS: Record<string, { name: string; variants: { id: string; name: string; description: string }[] }> = {
  hero: {
    name: 'Hero',
    variants: [
      { id: 'default', name: 'Классический', description: 'Градиентные орбы и обменник' },
      { id: 'particles', name: 'Частицы', description: 'Анимированные частицы на фоне' },
      { id: 'minimal', name: 'Минимальный', description: 'Чистый фон без эффектов' },
    ]
  },
  stats: {
    name: 'Статистика',
    variants: [
      { id: 'default', name: 'Сетка', description: 'Простая сетка чисел' },
      { id: 'count-up', name: 'Анимация', description: 'Числа с анимацией счёта' },
    ]
  },
  features: {
    name: 'Преимущества',
    variants: [
      { id: 'default', name: 'Стеклянные карточки', description: 'Карточки с эффектом стекла' },
      { id: 'spotlight', name: 'Прожектор', description: 'Карточки с эффектом прожектора' },
      { id: 'solid', name: 'Простые', description: 'Минималистичные карточки' },
    ]
  },
  currencies: {
    name: 'Валюты',
    variants: [
      { id: 'default', name: 'Таблица', description: 'Список поддерживаемых валют' },
    ]
  },
  cta: {
    name: 'Призыв к действию',
    variants: [
      { id: 'default', name: 'Градиент', description: 'Градиентный блок с кнопкой' },
      { id: 'minimal', name: 'Минимальный', description: 'Простой текст с кнопкой' },
    ]
  },
};

// ---- Content Types ----

export interface HeroContent {
  badge: string;
  title: string;
  title_highlight: string;
  subtitle: string;
  description: string;
  trusts: string[];
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: string;
}

export interface FeaturesContent {
  title: string;
  title_highlight: string;
  subtitle: string;
  items: FeatureItem[];
}

export interface StatItem {
  value: string;
  label: string;
}

export interface StatsContent {
  items: StatItem[];
}

export interface CTAContent {
  title: string;
  description: string;
  button_text: string;
  button_link: string;
}

export interface SectionContent {
  hero: HeroContent;
  features: FeaturesContent;
  stats: StatsContent;
  cta: CTAContent;
}

// ---- Defaults (current hardcoded values) ----

export const defaultHero: HeroContent = {
  badge: "On/Off Ramp решение",
  title: "Обменивайте",
  title_highlight: "криптовалюту",
  subtitle: "легко и быстро",
  description:
    "Покупайте и продавайте криптовалюту за фиатные деньги. Мгновенный обмен, низкие комиссии, максимальная безопасность.",
  trusts: ["Без верификации до $1000", "Комиссия от 0%", "24/7 Поддержка"],
};

export const defaultFeatures: FeaturesContent = {
  title: "Почему выбирают",
  title_highlight: "",
  subtitle: "Надёжное и быстрое решение для обмена криптовалют на фиатные деньги и обратно",
  items: [
    { title: "Безопасность", description: "Все транзакции защищены передовыми технологиями шифрования и многоуровневой верификацией", icon: "Shield" },
    { title: "Мгновенный обмен", description: "Обмен криптовалюты на фиат и обратно за считанные минуты без задержек", icon: "Zap" },
    { title: "24/7 Доступность", description: "Платформа работает круглосуточно, обмен доступен в любое время", icon: "Clock" },
    { title: "Низкие комиссии", description: "Минимальные комиссии на рынке и прозрачное ценообразование без скрытых платежей", icon: "Wallet" },
    { title: "Глобальный охват", description: "Поддержка множества фиатных валют и криптовалют со всего мира", icon: "Globe" },
    { title: "Поддержка 24/7", description: "Команда экспертов всегда готова помочь с любыми вопросами", icon: "Headphones" },
  ],
};

export const defaultStats: StatsContent = {
  items: [
    { value: "$50M+", label: "Объём обмена" },
    { value: "50K+", label: "Пользователей" },
    { value: "99.9%", label: "Uptime" },
    { value: "<2 мин", label: "Время обмена" },
  ],
};

export const defaultCTA: CTAContent = {
  title: "Начните обмен прямо сейчас",
  description: "Безопасно, быстро и по лучшему курсу. Присоединяйтесь к тысячам довольных клиентов.",
  button_text: "Начать обмен",
  button_link: "#exchange",
};

// ---- Public hook (frontend) ----

export function useSiteContent() {
  const operatorId = useOperatorId();

  return useQuery({
    queryKey: ["site-content", operatorId],
    queryFn: async (): Promise<SectionContent> => {
      const { data, error } = await supabase
        .from("site_content")
        .select("section, content")
        .eq("operator_id", operatorId);

      if (error) throw error;

      const map: Record<string, unknown> = {};
      for (const row of data ?? []) {
        map[row.section] = row.content;
      }

      return {
        hero: { ...defaultHero, ...(map.hero as Partial<HeroContent>) },
        features: { ...defaultFeatures, ...(map.features as Partial<FeaturesContent>) },
        stats: { ...defaultStats, ...(map.stats as Partial<StatsContent>) },
        cta: { ...defaultCTA, ...(map.cta as Partial<CTAContent>) },
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---- Admin hook ----

export function useSiteContentAdmin(operatorId: string) {
  return useQuery({
    queryKey: ["site-content-admin", operatorId],
    queryFn: async (): Promise<SectionContent> => {
      const { data, error } = await supabase
        .from("site_content")
        .select("section, content")
        .eq("operator_id", operatorId);

      if (error) throw error;

      const map: Record<string, unknown> = {};
      for (const row of data ?? []) {
        map[row.section] = row.content;
      }

      return {
        hero: { ...defaultHero, ...(map.hero as Partial<HeroContent>) },
        features: { ...defaultFeatures, ...(map.features as Partial<FeaturesContent>) },
        stats: { ...defaultStats, ...(map.stats as Partial<StatsContent>) },
        cta: { ...defaultCTA, ...(map.cta as Partial<CTAContent>) },
      };
    },
    enabled: !!operatorId,
  });
}

// ---- Save mutation ----

export function useSaveSiteContent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      operator_id,
      section,
      content,
    }: {
      operator_id: string;
      section: string;
      content: unknown;
    }) => {
      const { error } = await supabase.from("site_content").upsert(
        { operator_id, section, content: content as Record<string, unknown>, updated_at: new Date().toISOString() },
        { onConflict: "operator_id,section" }
      );
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success("Сохранено");
      qc.invalidateQueries({ queryKey: ["site-content"] });
      qc.invalidateQueries({ queryKey: ["site-content-admin", vars.operator_id] });
    },
    onError: () => {
      toast.error("Ошибка сохранения");
    },
  });
}

// ---- Section Builder Hooks ----

function getDefaultSections(): SectionConfig[] {
  return [
    { id: 'default-hero', section: 'hero', display_order: 1, is_enabled: true, variant: 'default', content: {} },
    { id: 'default-stats', section: 'stats', display_order: 2, is_enabled: true, variant: 'default', content: {} },
    { id: 'default-features', section: 'features', display_order: 3, is_enabled: true, variant: 'default', content: {} },
    { id: 'default-currencies', section: 'currencies', display_order: 4, is_enabled: true, variant: 'default', content: {} },
    { id: 'default-cta', section: 'cta', display_order: 5, is_enabled: true, variant: 'default', content: {} },
  ];
}

export const useSections = (operatorId?: string) => {
  return useQuery({
    queryKey: ["site-sections", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("*")
        .eq("operator_id", operatorId!)
        .order("display_order", { ascending: true });

      if (error) throw error;

      const defaults = getDefaultSections();
      const existing = data ?? [];

      // If no sections in DB, return defaults (no write — anon can't insert)
      if (existing.length === 0) {
        return defaults;
      }

      // Merge: DB sections + defaults for any missing
      const existingSections = new Set(existing.map(r => r.section));
      const merged = [
        ...existing.map(row => ({
          id: row.id,
          section: row.section,
          display_order: row.display_order ?? defaults.find(d => d.section === row.section)?.display_order ?? 0,
          is_enabled: row.is_enabled ?? true,
          variant: row.variant ?? 'default',
          content: row.content ?? {},
        })),
        ...defaults.filter(d => !existingSections.has(d.section)),
      ];

      return merged.sort((a, b) => a.display_order - b.display_order) as SectionConfig[];
    },
    enabled: !!operatorId,
    staleTime: 5 * 60 * 1000,
  });
};

export function useUpdateSectionOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (sections: { id: string; display_order: number }[]) => {
      const updates = sections.map(s =>
        supabase
          .from("site_content")
          .update({ display_order: s.display_order })
          .eq("id", s.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      toast.success("Порядок обновлён");
      qc.invalidateQueries({ queryKey: ["site-sections"] });
    },
    onError: () => {
      toast.error("Ошибка обновления порядка");
    },
  });
}

export function useToggleSection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from("site_content")
        .update({ is_enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Видимость обновлена");
      qc.invalidateQueries({ queryKey: ["site-sections"] });
    },
    onError: () => {
      toast.error("Ошибка обновления видимости");
    },
  });
}

export function useUpdateSectionVariant() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, variant }: { id: string; variant: string }) => {
      const { error } = await supabase
        .from("site_content")
        .update({ variant })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Вариант обновлён");
      qc.invalidateQueries({ queryKey: ["site-sections"] });
    },
    onError: () => {
      toast.error("Ошибка обновления варианта");
    },
  });
}
