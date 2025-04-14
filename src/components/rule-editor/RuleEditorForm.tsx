
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DeleteRuleDialog from './DeleteRuleDialog';
import { Toggle } from '@/components/ui/toggle';
import { Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import RuleImageSelectionSection from './RuleImageSelectionSection';
import { useRuleCarousel } from '@/contexts/RuleCarouselContext';

// Define form schema using zod
const formSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  frequency_count: z.coerce.number().min(1).default(1),
  background_opacity: z.coerce.number().min(0).max(100).default(100),
  title_color: z.string().default('#FFFFFF'),
  subtext_color: z.string().default('#CCCCCC'),
  calendar_color: z.string().default('#9c7abb'),
  icon_color: z.string().default('#FFFFFF'),
  highlight_effect: z.boolean().default(false),
  focal_point_x: z.coerce.number().default(50),
  focal_point_y: z.coerce.number().default(50),
});

interface RuleEditorFormProps {
  ruleData: {
    id?: string;
    title?: string;
    description?: string | null;
    priority?: 'low' | 'medium' | 'high';
    background_image_url?: string | null;
    background_images?: string[];
    background_opacity?: number;
    icon_url?: string | null;
    icon_name?: string | null;
    title_color?: string;
    subtext_color?: string;
    calendar_color?: string;
    icon_color?: string;
    highlight_effect?: boolean;
    focal_point_x?: number;
    focal_point_y?: number;
    frequency?: 'daily' | 'weekly';
    frequency_count?: number;
    usage_data?: number[];
    carousel_timer?: number;
  };
  onSave: (ruleData: any) => void;
  onDelete?: (ruleId: string) => void;
  onCancel: () => void;
}

const RuleEditorForm: React.FC<RuleEditorFormProps> = ({
  ruleData,
  onSave,
  onDelete,
  onCancel,
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [backgroundImages, setBackgroundImages] = useState<string[]>(
    ruleData.background_images || []
  );
  const { carouselTimer, setCarouselTimer, globalCarouselIndex, setGlobalCarouselIndex } = useRuleCarousel();
  const [localCarouselTimer, setLocalCarouselTimer] = useState(
    ruleData.carousel_timer || carouselTimer
  );

  // Initialize form with rule data
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: ruleData.title || '',
      description: ruleData.description || '',
      priority: ruleData.priority || 'medium',
      frequency: ruleData.frequency || 'daily',
      frequency_count: ruleData.frequency_count || 1,
      background_opacity: ruleData.background_opacity || 100,
      title_color: ruleData.title_color || '#FFFFFF',
      subtext_color: ruleData.subtext_color || '#CCCCCC',
      calendar_color: ruleData.calendar_color || '#9c7abb',
      icon_color: ruleData.icon_color || '#FFFFFF',
      highlight_effect: ruleData.highlight_effect || false,
      focal_point_x: ruleData.focal_point_x || 50,
      focal_point_y: ruleData.focal_point_y || 50,
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    // Combine form values with other rule data
    const updatedRuleData = {
      ...ruleData,
      ...values,
      background_images: backgroundImages,
      carousel_timer: localCarouselTimer,
    };
    onSave(updatedRuleData);
  };

  const handleDelete = () => {
    if (ruleData.id && onDelete) {
      onDelete(ruleData.id);
    }
  };

  const handleImagesChange = (images: string[]) => {
    setBackgroundImages(images);
  };

  const handleCarouselTimerChange = (seconds: number) => {
    setLocalCarouselTimer(seconds);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Details Section */}
        <div className="space-y-4">
          <FormField
            control={form.control}
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Rule description"
                    className="bg-dark-navy border-light-navy text-white min-h-24"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Priority and Frequency Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-dark-navy border-light-navy text-white">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-dark-navy border-light-navy text-white">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Frequency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-dark-navy border-light-navy text-white">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-dark-navy border-light-navy text-white">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Max Attempts</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      className="bg-dark-navy border-light-navy text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="highlight_effect"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Highlight Effect</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <Toggle
                        pressed={field.value}
                        onPressedChange={field.onChange}
                        className={cn(
                          "data-[state=on]:bg-blue-500",
                          "bg-dark-navy border-light-navy"
                        )}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        {field.value ? 'Enabled' : 'Disabled'}
                      </Toggle>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Color Settings Section */}
          <div className="space-y-4">
            <h3 className="text-white text-lg font-medium">Color Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Title Color</FormLabel>
                    <FormControl>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1 bg-transparent border-light-navy"
                          {...field}
                        />
                        <Input
                          type="text"
                          className="flex-1 bg-dark-navy border-light-navy text-white"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtext_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Description Color</FormLabel>
                    <FormControl>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1 bg-transparent border-light-navy"
                          {...field}
                        />
                        <Input
                          type="text"
                          className="flex-1 bg-dark-navy border-light-navy text-white"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="calendar_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Calendar Color</FormLabel>
                    <FormControl>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1 bg-transparent border-light-navy"
                          {...field}
                        />
                        <Input
                          type="text"
                          className="flex-1 bg-dark-navy border-light-navy text-white"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Icon Color</FormLabel>
                    <FormControl>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1 bg-transparent border-light-navy"
                          {...field}
                        />
                        <Input
                          type="text"
                          className="flex-1 bg-dark-navy border-light-navy text-white"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Background Image Section */}
          <div>
            <h3 className="text-white text-lg font-medium mb-2">Background Settings</h3>
            <FormField
              control={form.control}
              name="background_opacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Background Opacity ({field.value}%)</FormLabel>
                  <FormControl>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="w-full"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <RuleImageSelectionSection
              backgroundImages={backgroundImages}
              onImagesChange={handleImagesChange}
              carouselTimer={localCarouselTimer}
              onCarouselTimerChange={handleCarouselTimerChange}
              focalPointX={form.getValues().focal_point_x}
              focalPointY={form.getValues().focal_point_y}
              setGlobalCarouselIndex={setGlobalCarouselIndex}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {ruleData.id ? 'Update Rule' : 'Create Rule'}
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="border-light-navy text-white hover:bg-light-navy"
            >
              Cancel
            </Button>
          </div>
          
          {ruleData.id && onDelete && (
            <DeleteRuleDialog
              isOpen={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              onDelete={handleDelete}
            />
          )}
        </div>
      </form>
    </Form>
  );
};

export default RuleEditorForm;
