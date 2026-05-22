import ScrollReveal from "../ScrollReveal";
import { useSiteContent } from "@/hooks/useSiteContent";
import { Button } from "@/components/ui/button";

interface CTAContent {
  title: string;
  description: string;
  button_text: string;
}

const defaultCTA: CTAContent = {
  title: "Начните обмен прямо сейчас",
  description: "Безопасно, быстро и по лучшему курсу. Присоединяйтесь к тысячам довольных клиентов.",
  button_text: "Начать обмен",
};

const CTASection = () => {
  const { data } = useSiteContent();
  const cta: CTAContent = {
    ...defaultCTA,
    ...((data as any)?.cta ?? {}),
  };

  const handleClick = () => {
    const widget = document.getElementById("exchange-widget");
    if (widget) {
      widget.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <section className="relative py-20">
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {cta.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {cta.description}
            </p>
            <Button
              size="lg"
              onClick={handleClick}
              className="px-8 py-3 rounded-xl text-lg font-semibold"
            >
              {cta.button_text}
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default CTASection;
