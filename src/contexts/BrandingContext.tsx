import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useBranding, type BrandingData } from "@/hooks/useBranding";
import { getThemePreset, type ThemePreset, type ThemeColors } from "@/constants/themePresets";

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
  social_telegram: "",
  social_twitter: "",
  social_instagram: "",
  theme_preset: "classic",
};

/** Convert HEX (#rrggbb) to HSL string "H S% L%" for CSS variables */
function hexToHsl(hex: string): string {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Convert color value (HEX or HSL) to HSL string for CSS vars */
function colorToHsl(value: string): string {
  if (!value) return "";
  if (value.startsWith("#")) return hexToHsl(value);
  return value; // already HSL
}

/** Convert HSL string "H S% L%" to HEX for color picker. Exported for use in admin. */
export function hslStringToHex(hsl: string): string {
  if (!hsl) return "#06b6d4"; // default cyan
  if (hsl.startsWith("#")) return hsl; // already hex
  const match = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%/);
  if (!match) return "#06b6d4";
  const hue = parseFloat(match[1]) / 360;
  const sat = parseFloat(match[2]) / 100;
  const lig = parseFloat(match[3]) / 100;
  let r: number, g: number, b: number;
  if (sat === 0) {
    r = g = b = lig;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
    const p = 2 * lig - q;
    r = hue2rgb(p, q, hue + 1 / 3);
    g = hue2rgb(p, q, hue);
    b = hue2rgb(p, q, hue - 1 / 3);
  }
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Apply all theme colors as CSS variables */
function applyThemeColors(colors: ThemeColors) {
  const el = document.documentElement;
  const vars: Record<string, string> = {
    "--primary": colors.primary,
    "--primary-foreground": colors.primary_foreground,
    "--accent": colors.accent,
    "--accent-foreground": colors.accent_foreground,
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--card": colors.card,
    "--card-foreground": colors.card_foreground,
    "--secondary": colors.secondary,
    "--secondary-foreground": colors.secondary_foreground,
    "--muted": colors.muted,
    "--muted-foreground": colors.muted_foreground,
    "--border": colors.border,
    "--input": colors.input,
    "--ring": colors.ring,
    "--gradient-primary": `linear-gradient(135deg, hsl(${colors.primary}), hsl(${colors.accent}))`,
    "--gradient-accent": `linear-gradient(135deg, hsl(${colors.accent}), hsl(${colors.primary}))`,
    "--glass-bg": `hsl(${colors.glass_bg})`,
    "--glass-border": `hsl(${colors.glass_border})`,
    "--glow-primary": `0 0 40px hsl(${colors.glow_primary})`,
    "--glow-accent": `0 0 40px hsl(${colors.glow_accent})`,
  };
  for (const [key, value] of Object.entries(vars)) {
    el.style.setProperty(key, value);
  }
}

/** Remove all theme-set CSS variables */
function removeThemeColors() {
  const el = document.documentElement;
  const vars = [
    "--primary", "--primary-foreground", "--accent", "--accent-foreground",
    "--background", "--foreground", "--card", "--card-foreground",
    "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
    "--border", "--input", "--ring",
    "--gradient-primary", "--gradient-accent", "--glass-bg", "--glass-border",
    "--glow-primary", "--glow-accent", "--radius",
  ];
  for (const v of vars) {
    el.style.removeProperty(v);
  }
}

/** Load Google Fonts by injecting a <link> tag */
function loadGoogleFonts(fonts: string[]) {
  const uniqueFonts = [...new Set(fonts.filter(Boolean))];
  if (uniqueFonts.length === 0) return;

  const existingLink = document.getElementById("theme-google-fonts") as HTMLLinkElement | null;
  const families = uniqueFonts.map(f => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700`).join("&");
  const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;

  if (existingLink) {
    if (existingLink.href !== href) {
      existingLink.href = href;
    }
  } else {
    const link = document.createElement("link");
    link.id = "theme-google-fonts";
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

interface BrandingContextValue extends BrandingData {
  currentTheme: ThemePreset;
}

const BrandingContext = createContext<BrandingContextValue>({
  ...defaults,
  currentTheme: getThemePreset("classic"),
});

export const useBrandingContext = () => useContext(BrandingContext);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data } = useBranding();
  const branding = data ?? defaults;
  // Always use classic theme — operator customizes via primary/accent colors only
  const currentTheme = getThemePreset("classic");

  // Dynamic page title
  useEffect(() => {
    if (branding.company_name) {
      const suffix = branding.tagline || "Обмен криптовалют";
      document.title = `${branding.company_name} — ${suffix}`;
    }
  }, [branding.company_name, branding.tagline]);

  // Theme preset + operator color overrides
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    const colors = isDark ? currentTheme.colors.dark : currentTheme.colors.light;

    // Step 1: Apply all theme preset colors
    applyThemeColors(colors);

    // Step 2: Set border-radius from preset
    document.documentElement.style.setProperty("--radius", currentTheme.border_radius);

    // Step 3: Override colors if operator has custom values
    if (branding.primary_color) {
      const hsl = colorToHsl(branding.primary_color);
      document.documentElement.style.setProperty("--primary", hsl);
      document.documentElement.style.setProperty("--ring", hsl);
    }
    if (branding.accent_color) {
      document.documentElement.style.setProperty("--accent", colorToHsl(branding.accent_color));
    }
    if (branding.background_color) {
      const hsl = colorToHsl(branding.background_color);
      document.documentElement.style.setProperty("--background", hsl);
    }
    if (branding.card_color) {
      const hsl = colorToHsl(branding.card_color);
      document.documentElement.style.setProperty("--card", hsl);
    }
    if (branding.border_radius) {
      document.documentElement.style.setProperty("--radius", `${branding.border_radius}px`);
    }

    // Step 4: Load Google Fonts
    loadGoogleFonts([currentTheme.font_heading, currentTheme.font_body, currentTheme.font_mono]);

    // Step 5: Force dark mode if theme requires it
    if (currentTheme.force_dark) {
      document.documentElement.classList.add("dark");
    }

    // Reveal app after colors are set (prevents FOUC)
    document.getElementById("root")?.classList.add("ready");

    // No cleanup — colors persist across route changes to prevent flash
  }, [branding.primary_color, branding.accent_color, branding.background_color, branding.card_color, branding.border_radius, currentTheme]);

  // Re-apply colors when dark mode toggles (observe class changes)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      const colors = isDark ? currentTheme.colors.dark : currentTheme.colors.light;
      applyThemeColors(colors);

      // Re-apply operator overrides
      if (branding.primary_color) {
        const hsl = colorToHsl(branding.primary_color);
        document.documentElement.style.setProperty("--primary", hsl);
        document.documentElement.style.setProperty("--ring", hsl);
      }
      if (branding.accent_color) {
        document.documentElement.style.setProperty("--accent", colorToHsl(branding.accent_color));
      }
      if (branding.background_color) {
        document.documentElement.style.setProperty("--background", colorToHsl(branding.background_color));
      }
      if (branding.card_color) {
        document.documentElement.style.setProperty("--card", colorToHsl(branding.card_color));
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [currentTheme, branding.primary_color, branding.accent_color]);

  // Favicon injection
  useEffect(() => {
    if (!branding.favicon_url) return;
    const href = branding.favicon_url.includes("?v=")
      ? branding.favicon_url
      : `${branding.favicon_url}${branding.favicon_url.includes("?") ? "&" : "?"}v=${Date.now()}`;
    let link = document.getElementById("dynamic-favicon") as HTMLLinkElement | null;
    if (!link) {
      link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    }
    if (link) {
      link.href = href;
    } else {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.id = "dynamic-favicon";
      newLink.href = href;
      document.head.appendChild(newLink);
    }
  }, [branding.favicon_url]);

  const contextValue: BrandingContextValue = {
    ...branding,
    currentTheme,
  };

  return (
    <BrandingContext.Provider value={contextValue}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useThemeLogo() {
  const branding = useBrandingContext();
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark && branding.logo_dark_url ? branding.logo_dark_url : branding.logo_url;
}
