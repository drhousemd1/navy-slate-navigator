
import React, { useState, useRef, ChangeEvent } from 'react';
import { Check, ChevronDown, ChevronUp, Image, Upload, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Slider } from './ui/slider';
import { Textarea } from './ui/textarea';
import { useToast } from "@/hooks/use-toast";

interface TaskEditorProps {
  task: {
    id: string;
    title: string;
    description: string;
    points: number;
    completed: boolean;
    frequency?: {
      type: 'daily' | 'weekly';
      count: number;
    };
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundOpacity?: number;
    icon?: string;
    titleColor?: string;
    subtextColor?: string;
    calendarColor?: string;
    highlighterEffect?: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedTask: any) => void;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ task, open, onOpenChange, onSave }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  
  // State for all the editable fields
  const [editedTask, setEditedTask] = useState({
    ...task,
    frequency: task.frequency || { type: 'daily', count: 1 },
    backgroundColor: task.backgroundColor || '#1A1F2C',
    backgroundImage: task.backgroundImage || '',
    backgroundOpacity: task.backgroundOpacity || 1,
    icon: task.icon || '',
    titleColor: task.titleColor || '#FFFFFF',
    subtextColor: task.subtextColor || '#9CA3AF',
    calendarColor: task.calendarColor || '#4B5563',
    highlighterEffect: task.highlighterEffect || false,
  });

  // Handle basic input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedTask({
      ...editedTask,
      [name]: value,
    });
  };

  // Handle points increment/decrement
  const adjustPoints = (amount: number) => {
    const newPoints = Math.max(1, editedTask.points + amount);
    setEditedTask({
      ...editedTask,
      points: newPoints
    });
  };

  // Handle frequency type change
  const handleFrequencyTypeChange = (type: 'daily' | 'weekly') => {
    setEditedTask({
      ...editedTask,
      frequency: {
        ...editedTask.frequency,
        type
      }
    });
  };

  // Handle frequency count change
  const adjustFrequencyCount = (amount: number) => {
    const newCount = Math.max(1, editedTask.frequency.count + amount);
    setEditedTask({
      ...editedTask,
      frequency: {
        ...editedTask.frequency,
        count: newCount
      }
    });
  };

  // Handle image upload
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setEditedTask({
          ...editedTask,
          backgroundImage: imageUrl
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle icon upload
  const handleIconUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const iconUrl = reader.result as string;
        setEditedTask({
          ...editedTask,
          icon: iconUrl
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle opacity change
  const handleOpacityChange = (value: number[]) => {
    setEditedTask({
      ...editedTask,
      backgroundOpacity: value[0]
    });
  };

  // Handle color change
  const handleColorChange = (colorType: string, color: string) => {
    setEditedTask({
      ...editedTask,
      [colorType]: color
    });
  };

  // Handle highlighter effect toggle
  const toggleHighlighterEffect = () => {
    setEditedTask({
      ...editedTask,
      highlighterEffect: !editedTask.highlighterEffect
    });
  };

  // Save changes
  const handleSave = () => {
    onSave(editedTask);
    toast({
      title: "Task updated",
      description: "Your changes have been saved successfully.",
      variant: "default",
    });
    onOpenChange(false);
  };

  // Color options for the color picker
  const colorOptions = [
    '#FFFFFF', '#9b87f5', '#7E69AB', '#6E59A5', 
    '#D6BCFA', '#8B5CF6', '#D946EF', '#F97316', 
    '#0EA5E9', '#1EAEDB', '#33C3F0', '#ea384c'
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg bg-navy border-light-navy overflow-y-auto px-4 py-8">
        <SheetHeader>
          <SheetTitle className="text-white text-xl">Edit Task</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          {/* Title field */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-white font-medium">Title</label>
            <input
              id="title"
              name="title"
              value={editedTask.title}
              onChange={handleInputChange}
              className="w-full bg-dark-navy border border-light-navy rounded-md p-2 text-white"
            />
          </div>
          
          {/* Description field */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-white font-medium">Description</label>
            <Textarea
              id="description"
              name="description"
              value={editedTask.description}
              onChange={handleInputChange}
              className="w-full bg-dark-navy border border-light-navy rounded-md p-2 text-white min-h-[100px]"
            />
          </div>
          
          {/* Points selector */}
          <div className="space-y-2">
            <label className="text-white font-medium">Points</label>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => adjustPoints(-1)} 
                variant="outline" 
                className="bg-dark-navy border-light-navy text-white"
                disabled={editedTask.points <= 1}
              >
                -
              </Button>
              <span className="text-white text-lg font-semibold w-8 text-center">
                {editedTask.points}
              </span>
              <Button 
                onClick={() => adjustPoints(1)} 
                variant="outline" 
                className="bg-dark-navy border-light-navy text-white"
              >
                +
              </Button>
            </div>
          </div>
          
          {/* Frequency settings */}
          <div className="space-y-2">
            <label className="text-white font-medium">Usage Frequency</label>
            <div className="flex flex-col space-y-3">
              <div className="flex space-x-4">
                <Button 
                  variant={editedTask.frequency.type === 'daily' ? 'default' : 'outline'}
                  className={`${editedTask.frequency.type === 'daily' ? 'bg-nav-active' : 'bg-dark-navy border-light-navy text-white'}`}
                  onClick={() => handleFrequencyTypeChange('daily')}
                >
                  Daily
                </Button>
                <Button 
                  variant={editedTask.frequency.type === 'weekly' ? 'default' : 'outline'}
                  className={`${editedTask.frequency.type === 'weekly' ? 'bg-nav-active' : 'bg-dark-navy border-light-navy text-white'}`}
                  onClick={() => handleFrequencyTypeChange('weekly')}
                >
                  Weekly
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-white">Times per {editedTask.frequency.type}: </span>
                <Button 
                  onClick={() => adjustFrequencyCount(-1)} 
                  variant="outline" 
                  className="bg-dark-navy border-light-navy text-white"
                  disabled={editedTask.frequency.count <= 1}
                >
                  -
                </Button>
                <span className="text-white text-lg font-semibold w-8 text-center">
                  {editedTask.frequency.count}
                </span>
                <Button 
                  onClick={() => adjustFrequencyCount(1)} 
                  variant="outline" 
                  className="bg-dark-navy border-light-navy text-white"
                >
                  +
                </Button>
              </div>
            </div>
          </div>
          
          {/* Background Image upload */}
          <div className="space-y-2">
            <label className="text-white font-medium">Background Image</label>
            <Card className="bg-dark-navy border border-light-navy p-4">
              <div className="flex flex-col items-center space-y-4">
                {/* Image preview */}
                {editedTask.backgroundImage && (
                  <div className="relative w-full h-32 overflow-hidden rounded-md">
                    <div 
                      className="absolute top-0 right-0 p-1 bg-navy rounded-bl-md cursor-pointer"
                      onClick={() => setEditedTask({...editedTask, backgroundImage: ''})}
                    >
                      <X className="h-5 w-5 text-white" />
                    </div>
                    <img 
                      src={editedTask.backgroundImage} 
                      alt="Background preview" 
                      className="w-full h-full object-cover"
                      style={{ opacity: editedTask.backgroundOpacity }}
                    />
                  </div>
                )}
                
                {/* Upload button */}
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="outline" 
                  className="bg-dark-navy border-light-navy text-white"
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload Image
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                {/* Opacity slider */}
                {editedTask.backgroundImage && (
                  <div className="w-full space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white text-sm">Opacity</span>
                      <span className="text-white text-sm">{Math.round(editedTask.backgroundOpacity * 100)}%</span>
                    </div>
                    <Slider 
                      value={[editedTask.backgroundOpacity]} 
                      min={0} 
                      max={1} 
                      step={0.01} 
                      onValueChange={handleOpacityChange}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>
          
          {/* Icon Upload */}
          <div className="space-y-2">
            <label className="text-white font-medium">Task Icon</label>
            <Card className="bg-dark-navy border border-light-navy p-4">
              <div className="flex flex-col items-center space-y-4">
                {/* Icon preview */}
                {editedTask.icon && (
                  <div className="relative w-16 h-16 overflow-hidden rounded-md bg-navy p-2">
                    <div 
                      className="absolute top-0 right-0 p-0.5 bg-navy rounded-bl-md cursor-pointer"
                      onClick={() => setEditedTask({...editedTask, icon: ''})}
                    >
                      <X className="h-4 w-4 text-white" />
                    </div>
                    <img 
                      src={editedTask.icon} 
                      alt="Icon preview" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                
                {/* Upload button */}
                <Button 
                  onClick={() => iconInputRef.current?.click()} 
                  variant="outline" 
                  className="bg-dark-navy border-light-navy text-white"
                >
                  <Image className="mr-2 h-4 w-4" /> Upload Icon
                </Button>
                <input
                  type="file"
                  ref={iconInputRef}
                  onChange={handleIconUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </Card>
          </div>
          
          {/* Color selectors */}
          <div className="space-y-4">
            <label className="text-white font-medium">Colors</label>
            
            {/* Title color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm">Title Color</span>
                <div 
                  className="w-6 h-6 rounded-full border border-white" 
                  style={{ backgroundColor: editedTask.titleColor }}
                ></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map(color => (
                  <div 
                    key={`title-${color}`}
                    className={`w-6 h-6 rounded-full cursor-pointer ${editedTask.titleColor === color ? 'ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange('titleColor', color)}
                  ></div>
                ))}
              </div>
            </div>
            
            {/* Subtext color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm">Description Color</span>
                <div 
                  className="w-6 h-6 rounded-full border border-white" 
                  style={{ backgroundColor: editedTask.subtextColor }}
                ></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map(color => (
                  <div 
                    key={`subtext-${color}`}
                    className={`w-6 h-6 rounded-full cursor-pointer ${editedTask.subtextColor === color ? 'ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange('subtextColor', color)}
                  ></div>
                ))}
              </div>
            </div>
            
            {/* Calendar color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm">Calendar Color</span>
                <div 
                  className="w-6 h-6 rounded-full border border-white" 
                  style={{ backgroundColor: editedTask.calendarColor }}
                ></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map(color => (
                  <div 
                    key={`calendar-${color}`}
                    className={`w-6 h-6 rounded-full cursor-pointer ${editedTask.calendarColor === color ? 'ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange('calendarColor', color)}
                  ></div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Highlighter effect toggle */}
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">Highlighter Effect</span>
            <Button 
              variant={editedTask.highlighterEffect ? "default" : "outline"}
              className={`${editedTask.highlighterEffect ? 'bg-nav-active' : 'bg-dark-navy border-light-navy'} text-white`}
              onClick={toggleHighlighterEffect}
            >
              {editedTask.highlighterEffect ? 'On' : 'Off'}
            </Button>
          </div>
          
          {/* Preview */}
          <div className="space-y-2">
            <label className="text-white font-medium">Preview</label>
            <div className="relative overflow-hidden rounded-lg border border-light-navy">
              <div 
                className="p-4" 
                style={{
                  backgroundColor: editedTask.backgroundColor,
                  backgroundImage: editedTask.backgroundImage ? `url(${editedTask.backgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: editedTask.backgroundOpacity
                }}
              >
                <div className="relative z-10">
                  <div className="flex items-start mb-3">
                    {editedTask.icon ? (
                      <div className="bg-nav-active/15 p-2 rounded-lg mr-3">
                        <img src={editedTask.icon} alt="Task icon" className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="bg-nav-active/15 p-2 rounded-lg mr-3">
                        <Check className="w-6 h-6 text-nav-active" />
                      </div>
                    )}
                    <div>
                      <h3 
                        className={`font-semibold text-lg ${editedTask.highlighterEffect ? 'px-1 py-0.5' : ''}`}
                        style={{ 
                          color: editedTask.titleColor,
                          backgroundColor: editedTask.highlighterEffect ? 'rgba(255, 255, 0, 0.3)' : 'transparent',
                          display: 'inline-block'
                        }}
                      >
                        {editedTask.title}
                      </h3>
                      <p 
                        className={`text-sm ${editedTask.highlighterEffect ? 'px-1 py-0.5' : ''}`}
                        style={{ 
                          color: editedTask.subtextColor,
                          backgroundColor: editedTask.highlighterEffect ? 'rgba(255, 255, 0, 0.2)' : 'transparent',
                          display: 'inline-block'
                        }}
                      >
                        {editedTask.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Save and Cancel buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              onClick={handleSave} 
              className="flex-1 bg-nav-active hover:bg-nav-active/90 text-white"
            >
              Save Changes
            </Button>
            <Button 
              onClick={() => onOpenChange(false)} 
              variant="outline" 
              className="flex-1 bg-dark-navy border-light-navy text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskEditor;
