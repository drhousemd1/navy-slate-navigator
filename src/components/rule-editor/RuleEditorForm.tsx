
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save, Image, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import DeleteRuleDialog from './DeleteRuleDialog';
import { useRuleCarousel } from '@/contexts/RuleCarouselContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    background_images: string[];
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
  onCancel
}) => {
  const { carouselTimer, setCarouselTimer, globalCarouselIndex, setGlobalCarouselIndex } = useRuleCarousel();
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Initialize backgroundImages with empty array if not provided
  const [backgroundImages, setBackgroundImages] = useState<string[]>(
    ruleData.background_images || []
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [localCarouselTimer, setLocalCarouselTimer] = useState(
    ruleData.carousel_timer || carouselTimer
  );
  
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

  useEffect(() => {
    setIconPreview(ruleData.icon_url || null);
    setSelectedIconName(ruleData.icon_name || null);
    
    if (ruleData.background_images && ruleData.background_images.length > 0) {
      setBackgroundImages(ruleData.background_images);
    } else if (ruleData.background_image_url) {
      setBackgroundImages([ruleData.background_image_url]);
    } else {
      setBackgroundImages([]);
    }
    
    setSelectedImageIndex(0);
    
    const previewImage = ruleData.background_images?.[0] || ruleData.background_image_url || null;
    setImagePreview(previewImage);
  }, [ruleData]);

  useEffect(() => {
    if (!ruleData) {
      setSelectedImageIndex(0);
      setBackgroundImages([]);
    }
  }, [ruleData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        
        const newImages = [...backgroundImages];
        if (selectedImageIndex < newImages.length) {
          newImages[selectedImageIndex] = base64String;
        } else {
          newImages.push(base64String);
        }
        
        setBackgroundImages(newImages);
        form.setValue('background_opacity', form.getValues('background_opacity'));
        
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectThumbnail = (index: number) => {
    setSelectedImageIndex(index);
    setGlobalCarouselIndex(index);
    
    if (index < backgroundImages.length) {
      setImagePreview(backgroundImages[index]);
    } else {
      setImagePreview(null);
    }
  };

  const handleRemoveCurrentImage = () => {
    const newImages = [...backgroundImages];
    
    if (selectedImageIndex < newImages.length) {
      newImages.splice(selectedImageIndex, 1);
      setBackgroundImages(newImages);
      
      if (newImages.length > 0) {
        const newIndex = Math.min(selectedImageIndex, newImages.length - 1);
        setSelectedImageIndex(newIndex);
        setGlobalCarouselIndex(newIndex);
        setImagePreview(newImages[newIndex]);
      } else {
        setSelectedImageIndex(0);
        setGlobalCarouselIndex(0);
        setImagePreview(null);
      }
    }
  };

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
            form.setValue('icon_color', form.getValues('icon_color'));
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

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    try {
      const ruleToSave = {
        ...ruleData,
        ...values,
        background_images: backgroundImages,
        icon_name: selectedIconName,
        icon_url: iconPreview,
        carousel_timer: localCarouselTimer,
      };
      
      await onSave(ruleToSave);
    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        title: "Error",
        description: "Failed to save rule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const incrementFrequencyCount = () => {
    const currentCount = form.getValues('frequency_count');
    form.setValue('frequency_count', currentCount + 1);
  };

  const decrementFrequencyCount = () => {
    const currentCount = form.getValues('frequency_count');
    if (currentCount > 1) {
      form.setValue('frequency_count', currentCount - 1);
    }
  };

  const handleCarouselTimerChange = (newValue: number) => {
    setLocalCarouselTimer(newValue);
  };

  const handleDelete = () => {
    if (ruleData.id && onDelete) {
      onDelete(ruleData.id);
      setIsDeleteDialogOpen(false);
    }
  };

  const renderColorPickerField = (name: 'title_color' | 'subtext_color' | 'calendar_color' | 'icon_color', label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">{label}</FormLabel>
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
  );

  const renderNumberField = (
    name: 'frequency_count',
    label: string,
    onIncrement: () => void,
    onDecrement: () => void,
    minValue: number
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">{label}</FormLabel>
          <FormControl>
            <div className="flex items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-light-navy text-white"
                onClick={onDecrement}
                disabled={field.value <= minValue}
              >
                -
              </Button>
              <Input
                {...field}
                type="number"
                className="h-8 w-14 mx-2 text-center bg-dark-navy border-light-navy text-white"
                disabled
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-light-navy text-white"
                onClick={onIncrement}
              >
                +
              </Button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                  className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
          
          {/* Frequency Field */}
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="frequency_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Times per period</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-light-navy text-white"
                      onClick={decrementFrequencyCount}
                      disabled={field.value <= 1}
                    >
                      -
                    </Button>
                    <Input
                      {...field}
                      type="number"
                      className="h-8 w-14 mx-2 text-center bg-dark-navy border-light-navy text-white"
                      disabled
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-light-navy text-white"
                      onClick={incrementFrequencyCount}
                    >
                      +
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="highlight_effect"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-white">Highlight Effect</FormLabel>
                  <p className="text-sm text-white">Apply a yellow highlight behind title and description</p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <div className="space-y-4">
          <FormLabel className="text-white text-lg">Background Images</FormLabel>
          
          <div className="flex justify-between items-end mb-4">
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((index) => {
                const imageUrl = backgroundImages[index] || '';
                return (
                  <div
                    key={index}
                    onClick={() => handleSelectThumbnail(index)}
                    className={`w-12 h-12 rounded-md cursor-pointer transition-all
                      ${selectedImageIndex === index
                        ? 'border-[2px] border-[#FEF7CD] shadow-[0_0_8px_2px_rgba(254,247,205,0.6)]'
                        : 'bg-dark-navy border border-light-navy hover:border-white'}
                    `}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        className="w-full h-full object-cover rounded-md"
                        alt="Background thumbnail"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgNEg4LjhDNy4xMTk4NCA0IDUuNzM5NjggNC44Mi40LjJWMjBIMTZWMTVIMjAuNkMyMS45MjU1IDE1IDIzIDE2LjA3NDUgMjMgMTcuNFYyMEg0VjE3LjRDNyAxNi4wNzQ1IDguMDc0NTIgMTUgOS40IDE1SDEzVjRaIiBzdHJva2U9IiM0QjU1NjMiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xOSA4QzE5IDkuMTA0NTcgMTguMTA0NiAxMCAxNyAxMEMxNS44OTU0IDEwIDE1IDkuMTA0NTcgMTUgOEMxNSA2Ljg5NTQzIDE1Ljg5NTQgNiAxNyA2QzE4LjEwNDYgNiAxOSA2Ljg5NTQzIDE5IDhaIiBmaWxsPSIjNEI1NTYzIi8+PC9zdmc+';
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full text-light-navy">
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex flex-col items-start ml-4">
              <label className="text-sm text-white mb-1">
                Carousel Timer
                <span className="block text-xs text-muted-foreground">
                  (Time between image transitions)
                </span>
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const newTime = Math.max(3, localCarouselTimer - 1);
                    handleCarouselTimerChange(newTime);
                  }}
                  className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy w-8 h-8 flex items-center justify-center rounded-md"
                >
                  –
                </button>

                <div className="w-12 text-center text-white">
                  {localCarouselTimer}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newTime = Math.min(20, localCarouselTimer + 1);
                    handleCarouselTimerChange(newTime);
                  }}
                  className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy w-8 h-8 flex items-center justify-center rounded-md"
                >
                  +
                </button>

                <span className="text-white text-sm ml-1">(s)</span>
              </div>
            </div>
          </div>
          
          <div className="relative rounded-md border-2 border-dashed border-light-navy transition-all hover:border-white p-4 flex flex-col items-center justify-center gap-4">
            {imagePreview ? (
              <div className="relative w-full aspect-video overflow-hidden rounded-md group">
                <img
                  src={imagePreview}
                  alt="Background preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleRemoveCurrentImage}
                      className="bg-red-700 text-white hover:bg-red-600"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-video bg-dark-navy rounded-md flex items-center justify-center">
                <Image className="h-12 w-12 text-light-navy" />
              </div>
            )}
            
            <FormField
              control={form.control}
              name="background_opacity"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel className="text-white">
                    Background Opacity ({field.value}%)
                  </FormLabel>
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
            
            <div className="flex items-center justify-center">
              <input
                type="file"
                id="background-upload"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <label
                htmlFor="background-upload"
                className="cursor-pointer bg-light-navy hover:bg-navy text-white py-2 px-4 rounded-md flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {backgroundImages.length > 0 ? "Change Image" : "Add Image"}
              </label>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <FormLabel className="text-white">Subtext Color</FormLabel>
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
        
        <div className="pt-4 w-full flex items-center justify-end gap-3">
          {ruleData.id && onDelete && (
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
            disabled={loading}
          >
            {loading ? 'Saving...' : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default RuleEditorForm;
