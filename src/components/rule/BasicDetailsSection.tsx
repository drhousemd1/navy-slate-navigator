
import React from "react";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Rule {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
}

interface BasicDetailsSectionProps {
  card: Rule;
  handleChange: (field: keyof Rule, value: any) => void;
}

const BasicDetailsSection: React.FC<BasicDetailsSectionProps> = ({ card, handleChange }) => {
  return (
    <div className="space-y-4">
      <FormField
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input 
                defaultValue={card.title} 
                onChange={(e) => handleChange('title', e.target.value)} 
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea 
                defaultValue={card.description || ''} 
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
};

export default BasicDetailsSection;
