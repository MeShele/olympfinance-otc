import { useEffect, useRef, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { useSiteContent, defaultStats } from "@/hooks/useSiteContent";

function parseStatValue(value: string): { prefix: string; num: number; suffix: string } {
  const match = value.match(/^([^0-9]*)([0-9]+(?:[.,][0-9]+)?)(.*)$/);
  if (!match) return { prefix: "", num: 0, suffix: value };
  return {
    prefix: match[1],
    num: parseFloat(match[2].replace(",", ".")),
    suffix: match[3],
  };
}

function useCountUp(target: number, duration: number, trigger: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!trigger) return;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(eased * target);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, trigger]);

  return value;
}

interface AnimatedStatProps {
  value: string;
  label: string;
}

const AnimatedStat = ({ value, label }: AnimatedStatProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { prefix, num, suffix } = parseStatValue(value);
  const animated = useCountUp(num, 2000, visible);

  const hasDecimal = value.includes(".") || value.includes(",");
  const display = hasDecimal ? animated.toFixed(1) : Math.round(animated).toString();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // If no numeric part found, show original value
  if (num === 0 && !value.match(/0/)) {
    return (
      <div ref={ref} className="text-center">
        <div className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text mb-2">{value}</div>
        <div className="text-muted-foreground">{label}</div>
      </div>
    );
  }

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text mb-2">
        {prefix}{display}{suffix}
      </div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
};

const StatsCountUp = () => {
  const { data } = useSiteContent();
  const stats = data?.stats ?? defaultStats;

  return (
    <section className="py-16 sm:py-20 border-y border-border/50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-orb-primary blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.items.map((stat, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <AnimatedStat value={stat.value} label={stat.label} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsCountUp;
