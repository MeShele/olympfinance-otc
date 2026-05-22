import { useState, useEffect } from "react";
import { Loader2, Save, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOperatorId } from "@/hooks/useOperatorId";
import { useLegalPages, useSaveLegalPage, type LegalPage } from "@/hooks/useLegalPages";
import { RequirePermission } from "@/components/admin/RequirePermission";

const SLUGS = [
  { slug: "offer", label: "Оферта" },
  { slug: "privacy", label: "Конфиденциальность" },
  { slug: "terms", label: "Условия" },
  { slug: "aml", label: "AML политика" },
] as const;

type PageForm = { title: string; content: string; is_published: boolean };
type FormsState = Record<string, PageForm>;

const emptyForm: PageForm = { title: "", content: "", is_published: false };

export default function AdminLegalPages() {
  const operatorId = useOperatorId();
  const { data: pages, isLoading } = useLegalPages(operatorId);
  const { mutate: savePage, isPending } = useSaveLegalPage();
  const [forms, setForms] = useState<FormsState>({});
  const [activeTab, setActiveTab] = useState(SLUGS[0].slug);

  useEffect(() => {
    if (!pages) return;
    const state: FormsState = {};
    for (const { slug } of SLUGS) {
      const existing = pages.find((p) => p.slug === slug);
      state[slug] = existing
        ? { title: existing.title, content: existing.content, is_published: existing.is_published }
        : { ...emptyForm };
    }
    setForms(state);
  }, [pages]);

  const updateField = (slug: string, field: keyof PageForm, value: string | boolean) => {
    setForms((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], [field]: value },
    }));
  };

  const handleSave = (slug: string) => {
    const form = forms[slug];
    if (!form) return;
    savePage({ operator_id: operatorId, slug, ...form });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RequirePermission section="company">
    <div className="max-w-3xl">
      <div className="admin-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Scale className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Юридические страницы</h3>
            <p className="text-sm text-muted-foreground">Оферта, конфиденциальность, условия</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {SLUGS.map(({ slug, label }) => (
              <TabsTrigger key={slug} value={slug}>{label}</TabsTrigger>
            ))}
          </TabsList>

          {SLUGS.map(({ slug }) => {
            const form = forms[slug] ?? emptyForm;
            return (
              <TabsContent key={slug} value={slug} className="space-y-4">
                <div>
                  <Label htmlFor={`title-${slug}`}>Заголовок</Label>
                  <Input
                    id={`title-${slug}`}
                    value={form.title}
                    onChange={(e) => updateField(slug, "title", e.target.value)}
                    placeholder="Заголовок страницы"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={`content-${slug}`}>Содержание</Label>
                  <Textarea
                    id={`content-${slug}`}
                    value={form.content}
                    onChange={(e) => updateField(slug, "content", e.target.value)}
                    placeholder="Текст страницы..."
                    rows={16}
                    className="mt-1 font-mono text-sm"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-medium">Опубликовать</p>
                    <p className="text-sm text-muted-foreground">
                      {form.is_published ? "Страница видна всем пользователям" : "Страница скрыта"}
                    </p>
                  </div>
                  <Switch
                    checked={form.is_published}
                    onCheckedChange={(v) => updateField(slug, "is_published", v)}
                  />
                </div>

                <Button
                  variant="gradient"
                  className="w-full"
                  disabled={isPending}
                  onClick={() => handleSave(slug)}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Сохранить
                    </>
                  )}
                </Button>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
    </RequirePermission>
  );
}
