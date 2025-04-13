
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';

interface RuleEditorFormProps {
  onCancel?: () => void;
  carouselTimer?: number;
  onCarouselTimerChange?: (value: number) => void;
}

const RuleEditorForm: React.FC<RuleEditorFormProps> = ({ 
  onCancel,
  carouselTimer,
  onCarouselTimerChange
}) => {
  const { register, control, watch } = useFormContext();
  const background_opacity = watch('background_opacity');

  return (
    <div className="grid gap-4">
      <div>
        <Label className="text-white">Title</Label>
        <Input {...register('title')} className="bg-dark-navy border-light-navy text-white" />
      </div>
      
      <div>
        <Label className="text-white">Description</Label>
        <Textarea {...register('description')} className="bg-dark-navy border-light-navy text-white min-h-[100px]" />
      </div>
      
      <div>
        <Label className="text-white">Icon URL</Label>
        <Input {...register('icon_url')} className="bg-dark-navy border-light-navy text-white" />
      </div>
      
      <FormField
        control={control}
        name="background_opacity"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Background Opacity ({background_opacity}%)</FormLabel>
            <FormControl>
              <Slider
                value={[field.value]}
                min={0}
                max={100}
                step={1}
                onValueChange={(values) => field.onChange(values[0])}
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      {carouselTimer !== undefined && onCarouselTimerChange && (
        <div className="flex items-center gap-2">
          <Label className="text-white">Carousel Timer</Label>
          <Button 
            type="button" 
            onClick={() => onCarouselTimerChange(Math.max(1, carouselTimer - 1))} 
            className="px-2 py-1 border-light-navy rounded bg-dark-navy"
            size="sm"
          >
            -
          </Button>
          <span className="text-white">{carouselTimer}s</span>
          <Button 
            type="button" 
            onClick={() => onCarouselTimerChange(carouselTimer + 1)} 
            className="px-2 py-1 border-light-navy rounded bg-dark-navy"
            size="sm"
          >
            +
          </Button>
        </div>
      )}
    </div>
  );
};

export default RuleEditorForm;
