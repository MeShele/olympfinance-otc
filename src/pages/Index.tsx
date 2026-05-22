import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Features from "@/components/Features";
import Currencies from "@/components/Currencies";
import Footer from "@/components/Footer";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { useSections } from "@/hooks/useSiteContent";
import { useOperatorId } from "@/hooks/useOperatorId";

const Index = () => {
  const operatorId = useOperatorId();
  const { data: sections, isLoading } = useSections(operatorId);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {sections && !isLoading ? (
          <SectionRenderer sections={sections} />
        ) : (
          <>
            <Hero />
            <Stats />
            <Features />
            <Currencies />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
