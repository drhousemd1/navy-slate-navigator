import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Form, FormField, FormItem, FormLabel, FormControl } from './ui/form';
import { useForm } from 'react-hook-form';
import { Plus, Minus, Upload, CheckSquare } from 'lucide-react';

interface TaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  taskData?: {
    title: string;
    description: string;
    points: number;
  };
  onSave: (taskData: TaskFormValues) => void;
}

interface TaskFormValues {
  title: string;
  description: string;
  points: number;
  frequency: 'daily' | 'weekly';
  frequencyCount: number;
  backgroundImageUrl?: string;
  backgroundOpacity: number;
  iconUrl?: string;
  titleColor: string;
  subtextColor: string;
  calendarColor: string;
  highlightEffect: boolean;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ isOpen, onClose, taskData, onSave }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  
  const form = useForm<TaskFormValues>({
    defaultValues: {
      title: taskData?.title || '',
      description: taskData?.description || '',
      points: taskData?.points || 5,
      frequency: 'daily',
      frequencyCount: 1,
      backgroundOpacity: 100,
      titleColor: '#FFFFFF',
      subtextColor: '#8E9196',
      calendarColor: '#7E69AB',
      highlightEffect: false,
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        // In a real app, we would upload this to Supabase here
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
        // In a real app, we would upload this to Supabase here
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (values: TaskFormValues) => {
    // In a real app, we would upload images to Supabase here
    // and add the URLs to the form values
    onSave(values);
    onClose();
  };

  const incrementPoints = () => {
    const currentPoints = form.getValues('points');
    form.setValue('points', currentPoints + 1);
  };

  const decrementPoints = () => {
    const currentPoints = form.getValues('points');
    if (currentPoints > 1) {
      form.setValue('points', currentPoints - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-navy border-light-navy text-white max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Edit Task</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Title Input */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Task title" 
                      className="bg-dark-navy border-light-navy text-white" 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {/* Description Input */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Task description" 
                      className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {/* Points Selector */}
            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Points</FormLabel>
                  <div className="flex items-center space-x-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="icon" 
                      onClick={decrementPoints}
                      className="border-light-navy text-white"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <FormControl>
                      <Input
                        type="number"
                        className="w-20 text-center bg-dark-navy border-light-navy text-white"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="icon" 
                      onClick={incrementPoints}
                      className="border-light-navy text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </FormItem>
              )}
            />
            
            {/* Usage Frequency Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="frequencyCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Times per period</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="bg-dark-navy border-light-navy text-white"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            {/* Background Image Uploader */}
            <div className="space-y-4">
              <Label className="text-white text-lg">Background Image</Label>
              <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
                {imagePreview ? (
                  <div className="space-y-4">
                    <div className="relative w-full h-48 bg-dark-navy rounded-lg overflow-hidden">
                      <img 
                        src={imagePreview} 
                        alt="Background preview" 
                        className="w-full h-full object-cover"
                        style={{ opacity: form.watch('backgroundOpacity') / 100 }}
                      />
                      <div className="absolute inset-0 border-2 border-dashed border-yellow-500 cursor-move flex items-center justify-center">
                        <span className="text-xs text-yellow-500">Drag to adjust focal point</span>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="secondary" 
                      onClick={() => setImagePreview(null)}
                      className="bg-dark-navy text-white"
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="mx-auto h-10 w-10 text-light-navy mb-2" />
                    <p className="text-light-navy">Click to upload or drag and drop</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleImageUpload}
                    />
                  </div>
                )}
              </div>
              
              {/* Opacity Slider */}
              {imagePreview && (
                <FormField
                  control={form.control}
                  name="backgroundOpacity"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-white">Image Opacity ({field.value}%)</FormLabel>
                      <FormControl>
                        <Slider
                          value={[field.value]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="py-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            {/* Icon Image Uploader */}
            <div className="space-y-4">
              <Label className="text-white text-lg">Task Icon</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
                  {iconPreview ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto bg-dark-navy rounded-lg overflow-hidden">
                        <img 
                          src={iconPreview} 
                          alt="Icon preview" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <Button 
                        type="button"
                        variant="secondary" 
                        onClick={() => setIconPreview(null)}
                        className="bg-dark-navy text-white"
                      >
                        Remove Icon
                      </Button>
                    </div>
                  ) : (
                    <div className="relative h-32">
                      <Upload className="mx-auto h-8 w-8 text-light-navy mb-2" />
                      <p className="text-light-navy">Upload custom icon</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleIconUpload}
                      />
                    </div>
                  )}
                </div>
                
                <div className="border-2 border-light-navy rounded-lg p-4">
                  <p className="text-white mb-2">Predefined Icons</p>
                  <div className="grid grid-cols-4 gap-2">
                    {/* Placeholder for predefined icons */}
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div 
                        key={index} 
                        className="w-10 h-10 rounded-md bg-dark-navy flex items-center justify-center cursor-pointer hover:bg-light-navy"
                      >
                        <CheckSquare className="h-6 w-6 text-white" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Color Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="titleColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Title Color</FormLabel>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-6 h-6 rounded-full border border-white" 
                        style={{ backgroundColor: field.value }}
                      />
                      <FormControl>
                        <Input
                          type="color"
                          className="w-full h-10 bg-dark-navy border-light-navy"
                          {...field}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subtextColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Subtext Color</FormLabel>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-6 h-6 rounded-full border border-white" 
                        style={{ backgroundColor: field.value }}
                      />
                      <FormControl>
                        <Input
                          type="color"
                          className="w-full h-10 bg-dark-navy border-light-navy"
                          {...field}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="calendarColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Calendar Color</FormLabel>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-6 h-6 rounded-full border border-white" 
                        style={{ backgroundColor: field.value }}
                      />
                      <FormControl>
                        <Input
                          type="color"
                          className="w-full h-10 bg-dark-navy border-light-navy"
                          {...field}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            {/* Highlighter Effect Toggle */}
            <FormField
              control={form.control}
              name="highlightEffect"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Highlight Effect</FormLabel>
                    <p className="text-sm text-light-navy">Apply a yellow highlight behind title and description</p>
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
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-light-navy text-white"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-nav-active text-white hover:bg-nav-active/90"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditor;

