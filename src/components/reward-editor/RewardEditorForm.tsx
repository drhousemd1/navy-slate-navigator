
import React, { useState, useEffect } from 'react';
import RewardBasicDetails from './RewardBasicDetails';
import RewardIconSection from './RewardIconSection';
import RewardBackgroundSection from './RewardBackgroundSection';
import RewardColorSettings from './RewardColorSettings';
import RewardFormActions from './RewardFormActions';
import DeleteRewardDialog from './DeleteRewardDialog';

interface RewardEditorFormProps {
  rewardData?: any;
  onSave: (formData: any) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: number) => void;
  isSaving?: boolean;
}

export const RewardEditorForm: React.FC<RewardEditorFormProps> = ({ 
  rewardData, 
  onSave, 
  onCancel,
  onDelete,
  isSaving = false
}) => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState(10);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState('#9b87f5');
  const [titleColor, setTitleColor] = useState('#FFFFFF');
  const [subtextColor, setSubtextColor] = useState('#8E9196');
  const [calendarColor, setCalendarColor] = useState('#7E69AB');
  const [highlightEffect, setHighlightEffect] = useState(false);
  
  // Background image state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(100);
  const [focalPointX, setFocalPointX] = useState(50);
  const [focalPointY, setFocalPointY] = useState(50);
  
  // Dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Load existing reward data if available
  useEffect(() => {
    if (rewardData) {
      setTitle(rewardData.title || '');
      setDescription(rewardData.description || '');
      setCost(rewardData.cost || 10);
      setSelectedIconName(rewardData.icon_name || null);
      setIconColor(rewardData.icon_color || '#9b87f5');
      setTitleColor(rewardData.title_color || '#FFFFFF');
      setSubtextColor(rewardData.subtext_color || '#8E9196');
      setCalendarColor(rewardData.calendar_color || '#7E69AB');
      setHighlightEffect(rewardData.highlight_effect || false);
      
      // Background image settings
      setImagePreview(rewardData.background_image_url || null);
      setBackgroundOpacity(rewardData.background_opacity || 100);
      setFocalPointX(rewardData.focal_point_x || 50);
      setFocalPointY(rewardData.focal_point_y || 50);
    } else {
      // Reset to defaults if creating a new reward
      setTitle('');
      setDescription('');
      setCost(10);
      setSelectedIconName(null);
      setIconColor('#9b87f5');
      setTitleColor('#FFFFFF');
      setSubtextColor('#8E9196');
      setCalendarColor('#7E69AB');
      setHighlightEffect(false);
      setImagePreview(null);
      setBackgroundOpacity(100);
      setFocalPointX(50);
      setFocalPointY(50);
    }
  }, [rewardData]);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  const handleDeleteConfirm = () => {
    if (onDelete && rewardData?.index !== undefined) {
      onDelete(rewardData.index);
    }
    setIsDeleteDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      title,
      description,
      cost,
      icon_name: selectedIconName,
      icon_color: iconColor,
      title_color: titleColor,
      subtext_color: subtextColor,
      calendar_color: calendarColor,
      highlight_effect: highlightEffect,
      background_image_url: imagePreview,
      background_opacity: backgroundOpacity,
      focal_point_x: focalPointX,
      focal_point_y: focalPointY,
    };
    
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <RewardBasicDetails 
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        cost={cost}
        setCost={setCost}
      />
      
      <RewardIconSection 
        selectedIconName={selectedIconName}
        setSelectedIconName={setSelectedIconName}
        iconColor={iconColor}
        setIconColor={setIconColor}
      />
      
      <RewardBackgroundSection 
        imagePreview={imagePreview}
        backgroundOpacity={backgroundOpacity}
        focalPointX={focalPointX}
        focalPointY={focalPointY}
        handleImageUpload={handleImageUpload}
        handleRemoveImage={handleRemoveImage}
        setBackgroundOpacity={setBackgroundOpacity}
        setFocalPointX={setFocalPointX}
        setFocalPointY={setFocalPointY}
      />
      
      <RewardColorSettings 
        titleColor={titleColor}
        setTitleColor={setTitleColor}
        subtextColor={subtextColor}
        setSubtextColor={setSubtextColor}
        calendarColor={calendarColor}
        setCalendarColor={setCalendarColor}
        highlightEffect={highlightEffect}
        setHighlightEffect={setHighlightEffect}
      />
      
      <RewardFormActions 
        rewardData={rewardData}
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        onCancel={onCancel}
        onDelete={rewardData && onDelete ? () => setIsDeleteDialogOpen(true) : undefined}
        isSaving={isSaving}
      />
      
      <DeleteRewardDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        rewardName={rewardData?.title || 'this reward'}
      />
    </form>
  );
};
