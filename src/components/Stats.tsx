import ScrollReveal from "./ScrollReveal";
import { useSiteContent, defaultStats } from "@/hooks/useSiteContent";

const Stats = () => {
  const { data } = useSiteContent();
  const stats = data?.stats ?? defaultStats;

  return (
    <section className="py-16 sm:py-20 border-y border-border/50 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-orb-primary blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.items.map((stat, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
