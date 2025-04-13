
import React, { useState } from 'react';
import { useForm, useFormContext } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ColorPickerField from '../task-editor/ColorPickerField';
import PrioritySelector from '../task-editor/PrioritySelector';
import IconSelector from '../task-editor/IconSelector';
import PredefinedIconsGrid from '../task-editor/PredefinedIconsGrid';
import DeleteRuleDialog from './DeleteRuleDialog';

interface Rule {
  id?: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string | null;
  background_opacity: number;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  usage_data?: number[];
}

interface RuleFormValues {
  title: string;
  description: string;
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  icon_name?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  priority: 'low' | 'medium' | 'high';
  frequency: 'daily' | 'weekly';
  frequency_count: number;
}

interface RuleEditorFormProps {
  ruleData?: Partial<Rule>;
  onDelete?: (ruleId: string) => void;
  onCancel: () => void;
}

const RuleEditorForm: React.FC<RuleEditorFormProps> = ({ 
  ruleData,
  onDelete,
  onCancel
}) => {
  const [iconPreview, setIconPreview] = useState<string | null>(ruleData?.icon_url || null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(ruleData?.icon_name || null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { control } = useFormContext();

  const handleIconUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      if (e.target instanceof HTMLInputElement && e.target.files) {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setIconPreview(base64String);
            setSelectedIconName(null);
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const handleIconSelect = (iconName: string) => {
    if (iconName.startsWith('custom:')) {
      const iconUrl = iconName.substring(7);
      setIconPreview(iconUrl);
      setSelectedIconName(null);
      
      toast({
        title: "Custom icon selected",
        description: "Custom icon has been applied to the rule",
      });
    } else {
      setSelectedIconName(iconName);
      setIconPreview(null);
      
      toast({
        title: "Icon selected",
        description: `${iconName} icon selected`,
      });
    }
  };

  const handleDelete = () => {
    if (ruleData?.id && onDelete) {
      onDelete(ruleData.id);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Title</FormLabel>
            <FormControl>
              <Input 
                placeholder="Rule title" 
                className="bg-dark-navy border-light-navy text-white" 
                {...field} 
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Rule description" 
                className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                {...field} 
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PrioritySelector control={control} />
      </div>
      
      <div className="space-y-4">
        <FormLabel className="text-white text-lg">Rule Icon</FormLabel>
        <div className="grid grid-cols-2 gap-4">
          <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
            <IconSelector
              selectedIconName={selectedIconName}
              iconPreview={iconPreview}
              iconColor={"#FFFFFF"}  // Default color
              onSelectIcon={handleIconSelect}
              onUploadIcon={handleIconUpload}
              onRemoveIcon={() => {
                setIconPreview(null);
                setSelectedIconName(null);
              }}
            />
          </div>
          
          <PredefinedIconsGrid
            selectedIconName={selectedIconName}
            iconColor={"#FFFFFF"}  // Default color
            onSelectIcon={handleIconSelect}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ColorPickerField 
          control={control} 
          name="title_color" 
          label="Title Color" 
        />
        
        <ColorPickerField 
          control={control} 
          name="subtext_color" 
          label="Subtext Color" 
        />
        
        <ColorPickerField 
          control={control} 
          name="calendar_color" 
          label="Calendar Color" 
        />
        
        <ColorPickerField 
          control={control} 
          name="icon_color" 
          label="Icon Color" 
        />
      </div>
      
      <div className="pt-4 w-full flex items-center justify-end gap-3">
        {ruleData?.id && onDelete && (
          <DeleteRuleDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onDelete={handleDelete}
          />
        )}
        <Button 
          type="button" 
          variant="destructive" 
          onClick={onCancel}
          className="bg-red-700 border-light-navy text-white hover:bg-red-600"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="bg-nav-active text-white hover:bg-nav-active/90 flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default RuleEditorForm;
