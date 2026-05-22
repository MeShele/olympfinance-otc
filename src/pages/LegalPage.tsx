import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLegalPage } from "@/hooks/useLegalPages";

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading } = useLegalPage(slug);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : page ? (
            <>
              <h1 className="text-3xl font-bold mb-8">{page.title}</h1>
              <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
                {page.content.split(/\n\s*\n/).map((paragraph, i) => (
                  <p key={i} className="whitespace-pre-wrap">{paragraph.trim()}</p>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              Страница не найдена
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
