import { useState, useCallback } from "react";
import { Shield, Zap, Clock, Wallet, Globe, Headphones, Lock, Star, Heart, Award, TrendingUp, Users, type LucideIcon } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { useBrandingContext } from "@/contexts/BrandingContext";
import { useSiteContent, defaultFeatures } from "@/hooks/useSiteContent";

const iconMap: Record<string, LucideIcon> = {
  Shield, Zap, Clock, Wallet, Globe, Headphones,
  Lock, Star, Heart, Award, TrendingUp, Users,
};

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

const SpotlightCard = ({ children, className = "" }: SpotlightCardProps) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      className={`relative rounded-2xl border border-border/60 bg-card p-8 overflow-hidden transition-colors ${className}`}
      onMouseMove={handleMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      {active && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${pos.x}px ${pos.y}px, hsl(var(--primary) / 0.12), transparent 60%)`,
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
};

const FeaturesSpotlight = () => {
  const branding = useBrandingContext();
  const { data } = useSiteContent();
  const features = data?.features ?? defaultFeatures;
  const highlightText = features.title_highlight || branding.company_name;

  return (
    <section id="features" className="py-20 sm:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              {features.title}{" "}
              <span className="gradient-text">{highlightText}</span>
            </h2>
            <p className="text-lg text-muted-foreground">{features.subtitle}</p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.items.map((feature, index) => {
            const Icon = iconMap[feature.icon] || Shield;
            return (
              <ScrollReveal key={index} delay={index * 100}>
                <SpotlightCard className="h-full group">
                  <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </SpotlightCard>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSpotlight;
