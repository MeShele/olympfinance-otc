export interface ThemeColors {
  primary: string;
  primary_foreground: string;
  accent: string;
  accent_foreground: string;
  background: string;
  foreground: string;
  card: string;
  card_foreground: string;
  secondary: string;
  secondary_foreground: string;
  muted: string;
  muted_foreground: string;
  border: string;
  input: string;
  ring: string;
  // Extended
  gradient_primary: string;
  gradient_accent: string;
  glass_bg: string;
  glass_border: string;
  glow_primary: string;
  glow_accent: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  font_heading: string;
  font_body: string;
  font_mono: string;
  border_radius: string;
  glass_intensity: number;
  force_dark: boolean;
  hero_background: 'particles' | 'waves' | 'aurora' | 'hyperspeed' | null;
  hero_text_animation: 'blur' | 'split' | 'glitch' | 'shiny' | 'decrypt' | null;
  card_style: 'glass' | 'solid' | 'gradient-border' | 'spotlight';
}

export const themePresets: Record<string, ThemePreset> = {
  classic: {
    id: "classic",
    name: "Классический",
    description: "Элегантный синий дизайн со стеклянными карточками",
    colors: {
      light: {
        primary: "217 91% 60%",
        primary_foreground: "0 0% 100%",
        accent: "199 89% 48%",
        accent_foreground: "0 0% 100%",
        background: "210 20% 98%",
        foreground: "222 47% 11%",
        card: "0 0% 100%",
        card_foreground: "222 47% 11%",
        secondary: "210 40% 96%",
        secondary_foreground: "222 47% 11%",
        muted: "210 40% 96%",
        muted_foreground: "215 16% 47%",
        border: "214 32% 91%",
        input: "214 32% 91%",
        ring: "217 91% 60%",
        gradient_primary: "217 91% 60%",
        gradient_accent: "199 89% 48%",
        glass_bg: "0 0% 100% / 0.7",
        glass_border: "214 32% 91% / 0.3",
        glow_primary: "217 91% 60% / 0.3",
        glow_accent: "199 89% 48% / 0.3",
      },
      dark: {
        primary: "217 91% 60%",
        primary_foreground: "0 0% 100%",
        accent: "199 89% 48%",
        accent_foreground: "0 0% 100%",
        background: "222 47% 6%",
        foreground: "210 40% 98%",
        card: "222 47% 9%",
        card_foreground: "210 40% 98%",
        secondary: "217 33% 14%",
        secondary_foreground: "210 40% 98%",
        muted: "217 33% 14%",
        muted_foreground: "215 20% 55%",
        border: "217 33% 17%",
        input: "217 33% 17%",
        ring: "217 91% 60%",
        gradient_primary: "217 91% 60%",
        gradient_accent: "199 89% 48%",
        glass_bg: "222 47% 9% / 0.5",
        glass_border: "0 0% 100% / 0.06",
        glow_primary: "217 91% 60% / 0.2",
        glow_accent: "199 89% 48% / 0.2",
      },
    },
    font_heading: "Inter",
    font_body: "Inter",
    font_mono: "JetBrains Mono",
    border_radius: "0.75rem",
    glass_intensity: 0.6,
    force_dark: false,
    hero_background: "waves",
    hero_text_animation: "blur",
    card_style: "glass",
  },

  "dark-pro": {
    id: "dark-pro",
    name: "Тёмный Pro",
    description: "Киберпанк-стиль с неоновым свечением",
    colors: {
      light: {
        primary: "187 96% 42%",
        primary_foreground: "0 0% 100%",
        accent: "262 83% 58%",
        accent_foreground: "0 0% 100%",
        background: "240 10% 4%",
        foreground: "0 0% 95%",
        card: "240 6% 8%",
        card_foreground: "0 0% 95%",
        secondary: "240 5% 13%",
        secondary_foreground: "0 0% 95%",
        muted: "240 4% 16%",
        muted_foreground: "240 5% 55%",
        border: "240 4% 16%",
        input: "240 4% 16%",
        ring: "187 96% 42%",
        gradient_primary: "187 96% 42%",
        gradient_accent: "262 83% 58%",
        glass_bg: "240 6% 8% / 0.85",
        glass_border: "187 96% 42% / 0.15",
        glow_primary: "187 96% 42% / 0.4",
        glow_accent: "262 83% 58% / 0.3",
      },
      dark: {
        primary: "187 96% 42%",
        primary_foreground: "0 0% 100%",
        accent: "262 83% 58%",
        accent_foreground: "0 0% 100%",
        background: "240 10% 4%",
        foreground: "0 0% 95%",
        card: "240 6% 8%",
        card_foreground: "0 0% 95%",
        secondary: "240 5% 13%",
        secondary_foreground: "0 0% 95%",
        muted: "240 4% 16%",
        muted_foreground: "240 5% 55%",
        border: "240 4% 16%",
        input: "240 4% 16%",
        ring: "187 96% 42%",
        gradient_primary: "187 96% 42%",
        gradient_accent: "262 83% 58%",
        glass_bg: "240 6% 8% / 0.85",
        glass_border: "187 96% 42% / 0.15",
        glow_primary: "187 96% 42% / 0.4",
        glow_accent: "262 83% 58% / 0.3",
      },
    },
    font_heading: "Inter",
    font_body: "Inter",
    font_mono: "JetBrains Mono",
    border_radius: "0.75rem",
    glass_intensity: 0.85,
    force_dark: true,
    hero_background: "particles",
    hero_text_animation: "decrypt",
    card_style: "glass",
  },

  "minimal-light": {
    id: "minimal-light",
    name: "Минимализм",
    description: "Чистый и строгий дизайн без лишних эффектов",
    colors: {
      light: {
        primary: "220 9% 14%",
        primary_foreground: "0 0% 100%",
        accent: "217 91% 60%",
        accent_foreground: "0 0% 100%",
        background: "0 0% 100%",
        foreground: "220 9% 14%",
        card: "0 0% 100%",
        card_foreground: "220 9% 14%",
        secondary: "220 14% 96%",
        secondary_foreground: "220 9% 14%",
        muted: "220 14% 96%",
        muted_foreground: "220 9% 46%",
        border: "220 13% 91%",
        input: "220 13% 91%",
        ring: "217 91% 60%",
        gradient_primary: "220 9% 14%",
        gradient_accent: "217 91% 60%",
        glass_bg: "0 0% 100% / 1",
        glass_border: "220 13% 91% / 1",
        glow_primary: "220 9% 14% / 0",
        glow_accent: "217 91% 60% / 0",
      },
      dark: {
        primary: "0 0% 98%",
        primary_foreground: "220 9% 14%",
        accent: "217 91% 60%",
        accent_foreground: "0 0% 100%",
        background: "220 9% 7%",
        foreground: "0 0% 98%",
        card: "220 9% 10%",
        card_foreground: "0 0% 98%",
        secondary: "220 9% 14%",
        secondary_foreground: "0 0% 98%",
        muted: "220 9% 14%",
        muted_foreground: "220 9% 55%",
        border: "220 9% 18%",
        input: "220 9% 18%",
        ring: "217 91% 60%",
        gradient_primary: "0 0% 98%",
        gradient_accent: "217 91% 60%",
        glass_bg: "220 9% 10% / 1",
        glass_border: "220 9% 18% / 1",
        glow_primary: "0 0% 98% / 0",
        glow_accent: "217 91% 60% / 0",
      },
    },
    font_heading: "DM Sans",
    font_body: "DM Sans",
    font_mono: "JetBrains Mono",
    border_radius: "0.5rem",
    glass_intensity: 0,
    force_dark: false,
    hero_background: null,
    hero_text_animation: "split",
    card_style: "solid",
  },

  "bold-gradient": {
    id: "bold-gradient",
    name: "Яркий градиент",
    description: "Смелый дизайн с фиолетово-розовыми акцентами",
    colors: {
      light: {
        primary: "271 81% 56%",
        primary_foreground: "0 0% 100%",
        accent: "330 81% 60%",
        accent_foreground: "0 0% 100%",
        background: "270 20% 98%",
        foreground: "271 51% 10%",
        card: "0 0% 100%",
        card_foreground: "271 51% 10%",
        secondary: "270 30% 95%",
        secondary_foreground: "271 51% 10%",
        muted: "270 30% 95%",
        muted_foreground: "271 20% 46%",
        border: "270 25% 90%",
        input: "270 25% 90%",
        ring: "271 81% 56%",
        gradient_primary: "271 81% 56%",
        gradient_accent: "330 81% 60%",
        glass_bg: "0 0% 100% / 0.6",
        glass_border: "271 81% 56% / 0.2",
        glow_primary: "271 81% 56% / 0.35",
        glow_accent: "330 81% 60% / 0.35",
      },
      dark: {
        primary: "271 81% 56%",
        primary_foreground: "0 0% 100%",
        accent: "330 81% 60%",
        accent_foreground: "0 0% 100%",
        background: "271 40% 5%",
        foreground: "270 20% 98%",
        card: "271 30% 9%",
        card_foreground: "270 20% 98%",
        secondary: "271 25% 14%",
        secondary_foreground: "270 20% 98%",
        muted: "271 25% 14%",
        muted_foreground: "271 15% 55%",
        border: "271 20% 18%",
        input: "271 20% 18%",
        ring: "271 81% 56%",
        gradient_primary: "271 81% 56%",
        gradient_accent: "330 81% 60%",
        glass_bg: "271 30% 9% / 0.7",
        glass_border: "271 81% 56% / 0.15",
        glow_primary: "271 81% 56% / 0.3",
        glow_accent: "330 81% 60% / 0.3",
      },
    },
    font_heading: "Space Grotesk",
    font_body: "Space Grotesk",
    font_mono: "JetBrains Mono",
    border_radius: "1rem",
    glass_intensity: 0.5,
    force_dark: false,
    hero_background: "hyperspeed",
    hero_text_animation: "shiny",
    card_style: "gradient-border",
  },
};

export const themePresetIds = Object.keys(themePresets) as Array<keyof typeof themePresets>;

export function getThemePreset(id: string): ThemePreset {
  return themePresets[id] ?? themePresets.classic;
}
