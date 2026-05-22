import { Shield, Zap, Clock, Wallet, Globe, Headphones, Lock, Star, Heart, Award, TrendingUp, Users, type LucideIcon } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import { useBrandingContext } from "@/contexts/BrandingContext";
import { useSiteContent, defaultFeatures } from "@/hooks/useSiteContent";

const iconMap: Record<string, LucideIcon> = {
  Shield, Zap, Clock, Wallet, Globe, Headphones,
  Lock, Star, Heart, Award, TrendingUp, Users,
};

// First two items span 2 cols, then alternating single cols
const getSpan = (index: number, total: number) => {
  if (total <= 3) return "";
  if (index === 0 || index === 3) return "md:col-span-2";
  return "";
};

const Features = () => {
  const branding = useBrandingContext();
  const { data } = useSiteContent();
  const features = data?.features ?? defaultFeatures;

  const highlightText = features.title_highlight || branding.company_name;

  return (
    <section id="features" className="py-20 sm:py-32 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-orb-primary rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orb-accent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              {features.title}{" "}
              <span className="gradient-text">{highlightText}</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              {features.subtitle}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.items.map((feature, index) => {
            const Icon = iconMap[feature.icon] || Shield;
            return (
              <ScrollReveal key={index} delay={index * 100}>
                <div className={`glass-panel rounded-3xl p-8 group h-full relative overflow-hidden ${getSpan(index, features.items.length)}`}>
                  <div className="absolute inset-0 feature-card-overlay" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg transition-all duration-500">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
