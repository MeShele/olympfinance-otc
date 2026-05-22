import { useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, Loader2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  useSections,
  useUpdateSectionOrder,
  useToggleSection,
  useUpdateSectionVariant,
  SECTION_VARIANTS,
  type SectionConfig,
} from "@/hooks/useSiteContent";
import { useOperatorId } from "@/hooks/useOperatorId";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function AdminSectionManager() {
  const operatorId = useOperatorId();
  const { data: sections, isLoading } = useSections(operatorId);
  const qc = useQueryClient();
  const seeded = useRef(false);

  // Auto-seed sections in DB when admin opens this page (authenticated user can insert)
  useEffect(() => {
    if (!operatorId || !sections || seeded.current) return;
    const hasDefaults = sections.some(s => s.id.startsWith("default-"));
    if (!hasDefaults) return;
    seeded.current = true;

    const realSections = sections.filter(s => !s.id.startsWith("default-"));
    const existingNames = new Set(realSections.map(s => s.section));
    const toInsert = sections
      .filter(s => s.id.startsWith("default-") && !existingNames.has(s.section))
      .map(s => ({
        operator_id: operatorId,
        section: s.section,
        content: s.content as Record<string, unknown>,
        display_order: s.display_order,
        is_enabled: s.is_enabled,
        variant: s.variant,
      }));

    if (toInsert.length > 0) {
      supabase.from("site_content").insert(toInsert as any).then(() => {
        qc.invalidateQueries({ queryKey: ["site-sections"] });
      });
    }
  }, [operatorId, sections, qc]);
  const { mutate: updateOrder, isPending: isReordering } = useUpdateSectionOrder();
  const { mutate: toggleSection } = useToggleSection();
  const { mutate: updateVariant } = useUpdateSectionVariant();

  const handleMoveUp = (index: number) => {
    if (!sections || index === 0) return;
    const current = sections[index];
    const above = sections[index - 1];
    updateOrder([
      { id: current.id, display_order: above.display_order },
      { id: above.id, display_order: current.display_order },
    ]);
  };

  const handleMoveDown = (index: number) => {
    if (!sections || index === sections.length - 1) return;
    const current = sections[index];
    const below = sections[index + 1];
    updateOrder([
      { id: current.id, display_order: below.display_order },
      { id: below.id, display_order: current.display_order },
    ]);
  };

  const handleToggle = (section: SectionConfig) => {
    toggleSection({ id: section.id, is_enabled: !section.is_enabled });
  };

  const handleVariantChange = (section: SectionConfig, variant: string) => {
    updateVariant({ id: section.id, variant });
  };

  if (isLoading) {
    return (
      <div className="admin-card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!sections || sections.length === 0) return null;

  return (
    <div className="admin-card">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <LayoutGrid className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Секции страницы</h3>
          <p className="text-xs text-muted-foreground">Порядок, видимость и стиль</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {sections.map((section, index) => {
          const sectionMeta = SECTION_VARIANTS[section.section];
          if (!sectionMeta) return null;
          const currentVariant = sectionMeta.variants.find(v => v.id === section.variant);
          const isDefault = section.id.startsWith("default-");

          return (
            <div
              key={section.id}
              className={`grid grid-cols-[100px_1fr_auto_auto] items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                section.is_enabled
                  ? "border-border/40 bg-card/50"
                  : "border-border/20 bg-card/20 opacity-40"
              }`}
            >
              <span className="text-sm font-medium truncate">
                {sectionMeta.name}
              </span>

              <Select
                value={section.variant}
                onValueChange={(v) => handleVariantChange(section, v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <span className="truncate">{currentVariant?.name || section.variant}</span>
                </SelectTrigger>
                <SelectContent>
                  {sectionMeta.variants.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Switch
                checked={section.is_enabled}
                onCheckedChange={() => handleToggle(section)}
                disabled={isDefault}
                className="data-[state=checked]:bg-primary"
              />

              <div className="flex gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === 0 || isReordering || isDefault}
                  onClick={() => handleMoveUp(index)}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === sections.length - 1 || isReordering || isDefault}
                  onClick={() => handleMoveDown(index)}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
