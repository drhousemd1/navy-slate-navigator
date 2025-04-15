
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Check } from 'lucide-react';
import RuleEditModal from './RuleEditModal';
import CardBackground from './CardBackground';
import { useRuleCardData, RuleCardData } from './hooks/useRuleCardData';
import { useImageCarousel } from './hooks/useImageCarousel';
import { renderRuleIcon } from './utils/renderRuleIcon';
import { toast } from "@/hooks/use-toast";
import FrequencyTracker from '../task/FrequencyTracker';
import PriorityBadge from '../task/PriorityBadge';
import HighlightedText from '../task/HighlightedText';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getMondayBasedDay } from '@/lib/utils';

interface RuleProps {
  id: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  globalCarouselIndex: number;
  onUpdate?: (updated: RuleCardData) => void;
  onRuleBroken?: (rule: RuleCardData) => void;
  rule?: RuleCardData;
  carouselTimer?: number;
  onCarouselTimerChange?: (timer: number) => void;
  onFullyLoaded?: () => void;
}

const RuleCard: React.FC<RuleProps> = ({
  title,
  description,
  id,
  priority = 'medium',
  globalCarouselIndex,
  onUpdate,
  onRuleBroken,
  rule,
  carouselTimer = 5,
  onCarouselTimerChange,
  onFullyLoaded
}) => {
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const {
    cardData,
    images,
    usageData,
    handleSaveCard
  } = useRuleCardData({ 
    id: rule?.id || id, 
    title: rule?.title || title, 
    description: rule?.description || description, 
    priority: rule?.priority || priority,
    icon_url: rule?.icon_url,
    icon_name: rule?.icon_name || "",
    background_images: rule?.background_images as string[] || [],
    background_image_url: rule?.background_image_url,
    frequency: rule?.frequency || 'daily',
    frequency_count: rule?.frequency_count || 3
  });

  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = useImageCarousel({ images, globalCarouselIndex });

  const handleOpenEditModal = () => setIsEditModalOpen(true);
  const handleCloseEditModal = () => setIsEditModalOpen(false);

  const iconComponent = renderRuleIcon({
    iconUrl: cardData.icon_url,
    iconName: cardData.icon_name,
    iconColor: cardData.icon_color
  });

  const handleImageLoad = () => {
    setIsVisible(true);
    // Notify parent component after a short delay to match the fade-in animation
    setTimeout(() => {
      if (onFullyLoaded) onFullyLoaded();
    }, 500);
  };

  const handleRuleBroken = async () => {
    try {
      const currentDayOfWeek = getMondayBasedDay();
      
      const newUsageData = [...(cardData.usage_data || [0, 0, 0, 0, 0, 0, 0])];
      newUsageData[currentDayOfWeek] = 1;
      
      const { data, error } = await supabase
        .from('rules')
        .update({
          usage_data: newUsageData,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardData.id)
        .select();
        
      if (error) throw error;
      
      const today = new Date();
      const jsDayOfWeek = today.getDay();
      
      const { error: violationError } = await supabase
        .from('rule_violations')
        .insert({
          rule_id: cardData.id,
          violation_date: today.toISOString(),
          day_of_week: jsDayOfWeek,
          week_number: `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`
        });
        
      if (violationError) {
        console.error('Error recording rule violation:', violationError);
        toast({
          title: 'Warning',
          description: 'Rule marked as broken, but analytics may not be updated.',
          variant: 'destructive',
        });
      } else {
        console.log('Rule violation recorded successfully');
      }
      
      const updatedCardData = {
        ...cardData,
        usage_data: newUsageData
      };
      
      if (onRuleBroken) {
        onRuleBroken(updatedCardData);
      }
      
      toast({
        title: 'Rule Broken',
        description: 'This violation has been recorded.',
      });
      
      navigate('/punishments');
      
    } catch (err) {
      console.error('Error updating rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to record rule violation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', ruleId);
      
      if (error) {
        console.error("Error deleting rule from Supabase:", error);
        toast({
          title: "Error",
          description: `Failed to delete rule: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Rule Deleted",
        description: "The rule has been deleted",
      });
      
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive"
      });
    }
  };

  const handleCarouselTimerChange = (newValue: number) => {
    console.log(`Rule card changing carousel timer to ${newValue} seconds`);
    
    if (onCarouselTimerChange) {
      onCarouselTimerChange(newValue);
    }
  };

  return (
    <>
      <Card 
        className={`transition-opacity duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        } bg-dark-navy border-2 ${
          cardData.highlight_effect ? 'border-[#00f0ff] shadow-[0_0_8px_2px_rgba(0,240,255,0.6)]' : 'border-[#00f0ff]'
        } overflow-hidden`}
      >
        <div className="relative p-4">
          <CardBackground
            visibleImage={visibleImage}
            transitionImage={transitionImage}
            isTransitioning={isTransitioning}
            focalPointX={cardData.focal_point_x}
            focalPointY={cardData.focal_point_y}
            backgroundOpacity={cardData.background_opacity}
            onImageLoad={handleImageLoad}
          />
          
          <div className="flex justify-between items-center mb-3 relative z-10">
            <PriorityBadge priority={cardData.priority as 'low' | 'medium' | 'high'} />
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-500 text-white hover:bg-red-600/90 h-7 px-3 z-10"
              onClick={handleRuleBroken}
            >
              Rule Broken
            </Button>
          </div>
          
          <div className="mb-4 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 flex flex-col">
                <div className="text-xl font-semibold">
                  <HighlightedText
                    text={cardData.title}
                    highlight={cardData.highlight_effect}
                    color={cardData.title_color}
                  />
                </div>
                
                {cardData.description && (
                  <div className="text-sm mt-1">
                    <HighlightedText
                      text={cardData.description}
                      highlight={cardData.highlight_effect}
                      color={cardData.subtext_color}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2 relative z-10">
            <FrequencyTracker 
              frequency={cardData.frequency}
              frequency_count={cardData.frequency_count}
              calendar_color={cardData.calendar_color}
              usage_data={usageData}
            />
            
            <Button 
              size="sm" 
              className="bg-gray-700 hover:bg-gray-600 rounded-full w-10 h-10 p-0"
              onClick={handleOpenEditModal}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
      
      <RuleEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        ruleData={cardData}
        onSave={(updated) => {
          handleSaveCard(updated);
          if (onUpdate) {
            onUpdate(updated);
          }
        }}
        onDelete={handleDeleteRule}
        localStorageKey="rules"
        carouselTimer={carouselTimer}
        onCarouselTimerChange={handleCarouselTimerChange}
      />
    </>
  );
};

export default RuleCard;
