import React, { useState, useRef, useEffect } from 'react';
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
import { Plus, Minus, Upload, CheckSquare, Save, Flag, CircleAlert, CircleCheck, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { saveTask, Task } from '@/lib/taskUtils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  taskData?: Partial<Task>;
  onSave: (taskData: any) => void;
  onDelete?: (taskId: string) => void;
}

interface TaskFormValues {
  title: string;
  description: string;
  points: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  priority: 'low' | 'medium' | 'high';
}

const TaskEditor: React.FC<TaskEditorProps> = ({ isOpen, onClose, taskData, onSave, onDelete }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const form = useForm<TaskFormValues>({
    defaultValues: {
      title: '',
      description: '',
      points: 5,
      frequency: 'daily',
      frequency_count: 1,
      background_opacity: 100,
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      highlight_effect: false,
      focal_point_x: 50,
      focal_point_y: 50,
      priority: 'medium',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: '',
        description: '',
        points: 5,
        frequency: 'daily',
        frequency_count: 1,
        background_opacity: 100,
        title_color: '#FFFFFF',
        subtext_color: '#8E9196',
        calendar_color: '#7E69AB',
        highlight_effect: false,
        focal_point_x: 50,
        focal_point_y: 50,
        priority: 'medium',
      });
      
      setImagePreview(null);
      setIconPreview(null);
      setPosition({ x: 50, y: 50 });
      
      if (taskData) {
        console.log("Loading existing task data:", taskData);
        form.reset({
          title: taskData.title || '',
          description: taskData.description || '',
          points: taskData.points || 5,
          frequency: (taskData.frequency as 'daily' | 'weekly') || 'daily',
          frequency_count: taskData.frequency_count || 1,
          background_image_url: taskData.background_image_url,
          background_opacity: taskData.background_opacity || 100,
          title_color: taskData.title_color || '#FFFFFF',
          subtext_color: taskData.subtext_color || '#8E9196',
          calendar_color: taskData.calendar_color || '#7E69AB',
          highlight_effect: taskData.highlight_effect || false,
          focal_point_x: taskData.focal_point_x || 50,
          focal_point_y: taskData.focal_point_y || 50,
          priority: taskData.priority || 'medium',
        });
        
        setImagePreview(taskData.background_image_url || null);
        setIconPreview(taskData.icon_url || null);
        setPosition({
          x: taskData.focal_point_x || 50,
          y: taskData.focal_point_y || 50
        });
      }
    }
  }, [isOpen, taskData, form]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageContainerRef.current) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    setPosition({ x, y });
    form.setValue('focal_point_x', Math.round(x));
    form.setValue('focal_point_y', Math.round(y));
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!imageContainerRef.current) return;
      
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      
      setPosition({ x, y });
      form.setValue('focal_point_x', Math.round(x));
      form.setValue('focal_point_y', Math.round(y));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageContainerRef.current || e.touches.length === 0) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const touch = e.touches[0];
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    
    setPosition({ x, y });
    form.setValue('focal_point_x', Math.round(x));
    form.setValue('focal_point_y', Math.round(y));
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!imageContainerRef.current || moveEvent.touches.length === 0) return;
      
      const touch = moveEvent.touches[0];
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
      
      setPosition({ x, y });
      form.setValue('focal_point_x', Math.round(x));
      form.setValue('focal_point_y', Math.round(y));
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue('background_image_url', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setIconPreview(base64String);
        form.setValue('icon_url', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (values: TaskFormValues) => {
    setLoading(true);
    console.log("Submitting task with values:", values);
    try {
      const taskToSave: Partial<Task> = {
        ...values,
        id: taskData?.id,
      };
      
      await onSave(taskToSave);
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const incrementPoints = () => {
    const currentPoints = form.getValues('points');
    form.setValue('points', currentPoints + 1);
  };

  const decrementPoints = () => {
    const currentPoints = form.getValues('points');
    form.setValue('points', currentPoints - 1);
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

  const handleDelete = () => {
    if (taskData?.id && onDelete) {
      onDelete(taskData.id);
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-navy border-light-navy text-white max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {taskData ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>
        
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
                      placeholder="Task title" 
                      className="bg-dark-navy border-light-navy text-white" 
                      {...field} 
                    />
                  </FormControl>
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
                      placeholder="Task description" 
                      className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-white">Priority</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value="high" 
                            id="high" 
                            className="text-red-500 border-red-500" 
                          />
                          <Label htmlFor="high" className="flex items-center gap-2 text-white">
                            <CircleAlert className="h-4 w-4 text-red-500" />
                            High Priority
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value="medium" 
                            id="medium" 
                            className="text-yellow-500 border-yellow-500" 
                          />
                          <Label htmlFor="medium" className="flex items-center gap-2 text-white">
                            <Flag className="h-4 w-4 text-yellow-500" />
                            Medium Priority
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value="low" 
                            id="low" 
                            className="text-green-500 border-green-500" 
                          />
                          <Label htmlFor="low" className="flex items-center gap-2 text-white">
                            <CircleCheck className="h-4 w-4 text-green-500" />
                            Low Priority
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            
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
                        className="border-light-navy bg-light-navy text-white hover:bg-navy"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <FormControl>
                        <Input
                          type="number"
                          className="w-20 text-center bg-dark-navy border-light-navy text-white"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="icon" 
                        onClick={incrementPoints}
                        className="border-light-navy bg-light-navy text-white hover:bg-navy"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
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
                name="frequency_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Times per period</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Button 
                        type="button"
                        variant="outline" 
                        size="icon" 
                        onClick={decrementFrequencyCount}
                        className="border-light-navy bg-light-navy text-white hover:bg-navy"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <FormControl>
                        <Input
                          type="number"
                          className="w-20 text-center bg-dark-navy border-light-navy text-white"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="icon" 
                        onClick={incrementFrequencyCount}
                        className="border-light-navy bg-light-navy text-white hover:bg-navy"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4">
              <Label className="text-white text-lg">Background Image</Label>
              <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
                {imagePreview ? (
                  <div className="space-y-4">
                    <div 
                      ref={imageContainerRef}
                      className="relative w-full h-48 rounded-lg overflow-hidden cursor-crosshair"
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      role="button"
                      tabIndex={0}
                      aria-label="Drag to adjust focal point"
                    >
                      <img 
                        src={imagePreview} 
                        alt="Background preview" 
                        className="w-full h-full object-cover"
                        style={{ 
                          opacity: form.watch('background_opacity') / 100,
                          objectPosition: `${position.x}% ${position.y}%`
                        }}
                      />
                      <div 
                        className={`absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors duration-200`}
                      >
                        <div 
                          className="absolute w-8 h-8 bg-white rounded-full border-2 border-nav-active transform -translate-x-1/2 -translate-y-1/2 shadow-lg z-10 animate-pulse"
                          style={{ 
                            left: `${position.x}%`, 
                            top: `${position.y}%`,
                            cursor: 'grab',
                            animation: isDragging ? 'none' : '',
                            boxShadow: isDragging ? '0 0 0 4px rgba(126, 105, 171, 0.5)' : ''
                          }}
                        />
                        <span className="text-sm text-white bg-black/70 px-3 py-2 rounded-full shadow-md">
                          Click and drag to adjust focal point
                        </span>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="secondary" 
                      onClick={() => {
                        setImagePreview(null);
                        form.setValue('background_image_url', undefined);
                      }}
                      className="bg-dark-navy text-white hover:bg-light-navy"
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="relative h-32 flex flex-col items-center justify-center">
                    <Upload className="h-10 w-10 text-light-navy mb-2" />
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
              
              {imagePreview && (
                <FormField
                  control={form.control}
                  name="background_opacity"
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
                        onClick={() => {
                          setIconPreview(null);
                          form.setValue('icon_url', undefined);
                        }}
                        className="bg-dark-navy text-white hover:bg-light-navy"
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
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div 
                        key={index} 
                        className="w-10 h-10 rounded-md bg-light-navy flex items-center justify-center cursor-pointer hover:bg-navy"
                        onClick={() => {
                          toast({
                            title: "Icon selected",
                            description: `Predefined icon ${index + 1} selected`,
                          });
                        }}
                      >
                        <CheckSquare className="h-6 w-6 text-white" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="title_color"
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
                name="subtext_color"
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
                name="calendar_color"
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
            
            <FormField
              control={form.control}
              name="highlight_effect"
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
            
            <DialogFooter className="pt-4 flex justify-between">
              <div className="flex gap-2">
                {taskData?.id && onDelete && (
                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        type="button" 
                        variant="destructive" 
                        className="bg-red-700 text-white hover:bg-red-600 flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Task
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-navy border-light-navy text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white text-xl">Delete Task</AlertDialogTitle>
                        <AlertDialogDescription className="text-white text-sm">
                          Are you sure you want to delete this task? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-light-navy text-white hover:bg-light-navy">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDelete} 
                          className="bg-red-700 text-white hover:bg-red-600"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={onClose}
                  className="bg-red-700 border-light-navy text-white hover:bg-red-600"
                >
                  Cancel
                </Button>
              </div>
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditor;
