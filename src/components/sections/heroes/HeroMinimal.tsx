import ExchangeWidget from "@/components/ExchangeWidget";
import ScrollReveal from "@/components/ScrollReveal";
import { useSiteContent, defaultHero } from "@/hooks/useSiteContent";

const HeroMinimal = () => {
  const { data } = useSiteContent();
  const hero = data?.hero ?? defaultHero;

  return (
    <section id="exchange" className="relative min-h-screen pt-32 sm:pt-40 pb-24 border-b border-border/50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <ScrollReveal delay={0}>
            <span className="text-sm font-medium text-primary mb-4 block tracking-wide uppercase">
              {hero.badge}
            </span>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.05] mb-8 tracking-tight">
              {hero.title}{" "}
              <span className="gradient-text">{hero.title_highlight}</span>{" "}
              {hero.subtitle}
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-6">
              {hero.description}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              {hero.trusts.map((trust, i) => (
                <span key={i} className="px-3 py-1 rounded-full border border-border/60 bg-muted/30">
                  {trust}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal variant="scale" delay={300}>
          <div className="max-w-md mx-auto">
            <ExchangeWidget />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default HeroMinimal;
