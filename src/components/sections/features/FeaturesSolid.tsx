import { Shield, Zap, Clock, Wallet, Globe, Headphones, Lock, Star, Heart, Award, TrendingUp, Users, type LucideIcon } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { useBrandingContext } from "@/contexts/BrandingContext";
import { useSiteContent, defaultFeatures } from "@/hooks/useSiteContent";

const iconMap: Record<string, LucideIcon> = {
  Shield, Zap, Clock, Wallet, Globe, Headphones,
  Lock, Star, Heart, Award, TrendingUp, Users,
};

const FeaturesSolid = () => {
  const branding = useBrandingContext();
  const { data } = useSiteContent();
  const features = data?.features ?? defaultFeatures;
  const highlightText = features.title_highlight || branding.company_name;

  return (
    <section id="features" className="py-20 sm:py-32">
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
                <div className="rounded-lg border border-border bg-card p-10 h-full transition-shadow hover:shadow-md">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSolid;
