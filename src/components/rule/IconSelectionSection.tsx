
import React from "react";
import { FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface Rule {
  id: string;
  icon_name?: string | null;
  icon_url?: string | null;
}

interface IconSelectionSectionProps {
  card: Rule;
  handleChange: (field: keyof Rule, value: any) => void;
}

const IconSelectionSection: React.FC<IconSelectionSectionProps> = ({ card, handleChange }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      handleChange('icon_url', reader.result as string);
      handleChange('icon_name', null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <FormLabel>Icon</FormLabel>
      <div className="flex justify-between">
        <div className="border rounded p-4 flex items-center justify-center h-20 w-20">
          {card.icon_url ? (
            <img src={card.icon_url} alt="Icon" className="w-12 h-12" />
          ) : (
            <span className="text-sm text-muted-foreground">No icon</span>
          )}
        </div>
        <div className="space-y-2">
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            variant="outline" 
            size="sm"
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Icon
          </Button>
          <Button 
            onClick={() => {
              handleChange('icon_url', null);
              handleChange('icon_name', null);
            }} 
            variant="outline" 
            size="sm"
            className="w-full"
          >
            Remove Icon
          </Button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleIconUpload}
        hidden
      />
    </div>
  );
};

export default IconSelectionSection;
