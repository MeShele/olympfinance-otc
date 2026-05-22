import ExchangeWidget from "./ExchangeWidget";
import ScrollReveal from "./ScrollReveal";
import { useSiteContent, defaultHero } from "@/hooks/useSiteContent";

const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const Hero = () => {
  const { data } = useSiteContent();
  const hero = data?.hero ?? defaultHero;

  return (
    <section id="exchange" className="relative min-h-screen pt-28 sm:pt-36 pb-20 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-[0.03] dark:opacity-[0.08]" />

      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] blur-3xl" style={{ background: `radial-gradient(circle, hsl(var(--primary) / 0.1), transparent)` }} />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] blur-3xl" style={{ background: `radial-gradient(circle, hsl(var(--accent) / 0.08), transparent)` }} />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-10 w-20 h-20 rounded-full bg-orb-primary-10 animate-float blur-xl" />
      <div className="absolute top-1/3 right-20 w-32 h-32 rounded-full bg-orb-accent animate-float blur-xl" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-1/4 left-1/4 w-24 h-24 rounded-full bg-orb-primary-10 animate-float blur-xl" style={{ animationDelay: '4s' }} />

      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <ScrollReveal delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-light border-brand border text-sm mb-6 text-primary">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {hero.badge}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-6">
                {hero.title}{" "}
                <span className="gradient-text">{hero.title_highlight}</span>{" "}
                {hero.subtitle}
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                {hero.description}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                {hero.trusts.map((trust, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckIcon />
                    {trust}
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Right Content - Exchange Widget */}
          <ScrollReveal variant="scale" delay={200} className="lg:col-span-5">
            <ExchangeWidget />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default Hero;
