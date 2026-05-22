import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

interface MultiLineFieldProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  warning?: React.ReactNode;
}

const MultiLineField = ({ label, values, onChange, placeholder, warning }: MultiLineFieldProps) => {
  const handleChange = (index: number, value: string) => {
    const updated = [...values];
    updated[index] = value;
    onChange(updated);
  };

  const addLine = () => onChange([...values, ""]);

  const removeLine = (index: number) => {
    const updated = values.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated : [""]);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder={placeholder ? `${placeholder} ${index + 1}` : `Запись ${index + 1}`}
            className="flex-1"
          />
          {values.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLine(index)}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1">
        <Plus className="w-4 h-4" />
        Добавить ещё
      </Button>
      {warning}
    </div>
  );
};

export default MultiLineField;
