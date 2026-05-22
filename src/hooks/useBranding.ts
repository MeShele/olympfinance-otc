import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorId } from "./useOperatorId";

export interface BrandingData {
  company_name: string;
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  tagline: string;
  email: string;
  phone: string;
  primary_color: string;
  accent_color: string;
  background_color: string | null;
  card_color: string | null;
  border_radius: string | null;
  social_telegram: string;
  social_twitter: string;
  social_instagram: string;
  theme_preset: string;
}

const defaults: BrandingData = {
  company_name: "Olymp Finance",
  logo_url: "/logo-light.svg",
  logo_dark_url: "/logo-dark.svg",
  favicon_url: "",
  tagline: "Быстрый и надёжный обмен криптовалют на фиатные деньги и обратно.",
  email: "",
  phone: "",
  primary_color: "",
  accent_color: "",
  background_color: null,
  card_color: null,
  border_radius: null,
  social_telegram: "",
  social_twitter: "",
  social_instagram: "",
  theme_preset: "classic",
};

/** Return val if it's a non-empty string, otherwise fallback */
const or = (val: unknown, fallback: string): string =>
  typeof val === "string" && val.length > 0 ? val : fallback;

export const useBranding = () => {
  const operatorId = useOperatorId();

  return useQuery({
    queryKey: ["branding", operatorId],
    queryFn: async (): Promise<BrandingData> => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("company_name, logo_url, logo_dark_url, favicon_url, tagline, email, phone, primary_color, accent_color, background_color, card_color, border_radius, social_telegram, social_twitter, social_instagram, theme_preset")
        .eq("operator_id", operatorId)
        .limit(1)
        .maybeSingle();

      if (error || !data) return defaults;

      return {
        company_name: or(data.company_name, defaults.company_name),
        logo_url: or(data.logo_url, defaults.logo_url),
        logo_dark_url: or(data.logo_dark_url, defaults.logo_dark_url),
        favicon_url: or(data.favicon_url, defaults.favicon_url),
        tagline: or(data.tagline, defaults.tagline),
        email: data.email ?? "",
        phone: data.phone ?? "",
        primary_color: data.primary_color ?? "",
        accent_color: data.accent_color ?? "",
        background_color: data.background_color ?? null,
        card_color: data.card_color ?? null,
        border_radius: data.border_radius ?? null,
        social_telegram: data.social_telegram ?? "",
        social_twitter: data.social_twitter ?? "",
        social_instagram: data.social_instagram ?? "",
        theme_preset: data.theme_preset ?? "classic",
      };
    },
    staleTime: 60 * 1000,
  });
};
