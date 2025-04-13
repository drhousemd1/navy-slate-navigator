
import React, { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Check, Plus, Loader2 } from 'lucide-react';
import FrequencyTracker from '../components/task/FrequencyTracker';
import PriorityBadge from '../components/task/PriorityBadge';
import RuleEditor from '../components/RuleEditor';
import { toast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import HighlightedText from '../components/task/HighlightedText';
import RulesHeader from '../components/rule/RulesHeader';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { getMondayBasedDay } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import RuleBackground from '../components/rule/RuleBackground';
import { useRuleImageCarousel } from '../components/rule/hooks/useRuleImageCarousel';

interface Rule {
  id: string;
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
  usage_data: number[];
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  background_images?: string[];
}

const Rules: React.FC = () => {
  const navigate = useNavigate();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const [carouselTimer, setCarouselTimer] = useState(5);

  // Batch size for fetching rules to avoid timeouts
  const batchSize = 12;

  useEffect(() => {
    const savedTimer = parseInt(localStorage.getItem('rules_carouselTimer') || '5', 10);
    setCarouselTimer(savedTimer);
    
    const carouselIntervalId = setInterval(() => {
      setGlobalCarouselIndex(prev => prev + 1);
    }, savedTimer * 1000);
    
    return () => {
      clearInterval(carouselIntervalId);
    };
  }, []);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('rules')
          .select('*')
          .order('created_at', { ascending: false })
          .range(0, batchSize - 1); // Batching applied here
        
        if (error) {
          throw error;
        }
        
        const rulesWithUsageData = (data as Rule[] || []).map(rule => {
          if (!rule.usage_data || !Array.isArray(rule.usage_data) || rule.usage_data.length !== 7) {
            return { ...rule, usage_data: [0, 0, 0, 0, 0, 0, 0] };
          }
          
          // Ensure background_images is an array
          if (!rule.background_images || !Array.isArray(rule.background_images)) {
            rule.background_images = rule.background_image_url ? [rule.background_image_url] : [];
          }
          
          return rule;
        });
        
        setRules(rulesWithUsageData);
      } catch (err) {
        console.error('Error fetching rules:', err);
        toast({
          title: 'Error',
          description: 'Failed to fetch rules. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRules();
  }, []);

  const handleAddRule = () => {
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setCurrentRule(rule);
    setIsEditorOpen(true);
  };

  const handleRuleBroken = async (rule: Rule) => {
    try {
      const currentDayOfWeek = getMondayBasedDay();
      
      const newUsageData = [...(rule.usage_data || [0, 0, 0, 0, 0, 0, 0])];
      newUsageData[currentDayOfWeek] = 1;
      
      const { data, error } = await supabase
        .from('rules')
        .update({
          usage_data: newUsageData,
          updated_at: new Date().toISOString()
        })
        .eq('id', rule.id)
        .select();
        
      if (error) throw error;
      
      const today = new Date();
      const jsDayOfWeek = today.getDay();
      
      const { error: violationError } = await supabase
        .from('rule_violations')
        .insert({
          rule_id: rule.id,
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
      
      setRules(rules.map(r => 
        r.id === rule.id ? { ...r, usage_data: newUsageData } : r
      ));
      
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

  const handleCarouselTimerChange = (newValue: number) => {
    setCarouselTimer(newValue);
    localStorage.setItem('rules_carouselTimer', newValue.toString());
  };

  const handleSaveRule = async (ruleData: Partial<Rule>) => {
    try {
      let result;
      
      if (ruleData.id) {
        const existingRule = rules.find(rule => rule.id === ruleData.id);
        
        const { data, error } = await supabase
          .from('rules')
          .update({
            title: ruleData.title,
            description: ruleData.description,
            priority: ruleData.priority,
            background_image_url: ruleData.background_image_url,
            background_opacity: ruleData.background_opacity,
            icon_url: ruleData.icon_url,
            icon_name: ruleData.icon_name,
            title_color: ruleData.title_color,
            subtext_color: ruleData.subtext_color,
            calendar_color: ruleData.calendar_color,
            icon_color: ruleData.icon_color,
            highlight_effect: ruleData.highlight_effect,
            focal_point_x: ruleData.focal_point_x,
            focal_point_y: ruleData.focal_point_y,
            frequency: ruleData.frequency,
            frequency_count: ruleData.frequency_count,
            background_images: ruleData.background_images,
            updated_at: new Date().toISOString()
          })
          .eq('id', ruleData.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        
        if (existingRule && existingRule.usage_data) {
          result.usage_data = existingRule.usage_data;
        }
        
        setRules(rules.map(rule => rule.id === ruleData.id ? { ...rule, ...result as Rule } : rule));
        
        toast({
          title: 'Success',
          description: 'Rule updated successfully!',
        });
      } else {
        const { id, ...ruleWithoutId } = ruleData;
        
        if (!ruleWithoutId.title) {
          throw new Error('Rule title is required');
        }
        
        const newRule = {
          title: ruleWithoutId.title,
          priority: ruleWithoutId.priority || 'medium',
          background_opacity: ruleWithoutId.background_opacity || 100,
          icon_color: ruleWithoutId.icon_color || '#FFFFFF',
          title_color: ruleWithoutId.title_color || '#FFFFFF',
          subtext_color: ruleWithoutId.subtext_color || '#FFFFFF',
          calendar_color: ruleWithoutId.calendar_color || '#9c7abb',
          highlight_effect: ruleWithoutId.highlight_effect || false,
          focal_point_x: ruleWithoutId.focal_point_x || 50,
          focal_point_y: ruleWithoutId.focal_point_y || 50,
          frequency: ruleWithoutId.frequency || 'daily',
          frequency_count: ruleWithoutId.frequency_count || 3,
          usage_data: [0, 0, 0, 0, 0, 0, 0],
          background_images: ruleWithoutId.background_images || [],
          ...(ruleWithoutId.description && { description: ruleWithoutId.description }),
          ...(ruleWithoutId.background_image_url && { background_image_url: ruleWithoutId.background_image_url }),
          ...(ruleWithoutId.icon_url && { icon_url: ruleWithoutId.icon_url }),
          ...(ruleWithoutId.icon_name && { icon_name: ruleWithoutId.icon_name }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: (await supabase.auth.getUser()).data.user?.id,
        };
        
        const { data, error } = await supabase
          .from('rules')
          .insert(newRule)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        
        setRules([result as Rule, ...rules]);
        
        toast({
          title: 'Success',
          description: 'Rule created successfully!',
        });
      }
      
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Error saving rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to save rule. Please try again.',
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
      
      if (error) throw error;
      
      setRules(rules.filter(rule => rule.id !== ruleId));
      
      toast({
        title: 'Success',
        description: 'Rule deleted successfully!',
      });
      
      setCurrentRule(null);
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Error deleting rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout onAddNewItem={handleAddRule}>
      <RewardsProvider>
        <div className="container mx-auto px-4 py-6">
          <RulesHeader />
          
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white mb-4">No rules found. Create your first rule!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => {
                const backgroundImages = rule.background_images || [];
                const images = backgroundImages.length > 0 ? backgroundImages : 
                  (rule.background_image_url ? [rule.background_image_url] : []);
                
                const {
                  visibleImage,
                  transitionImage,
                  isTransitioning
                } = useRuleImageCarousel({
                  images: images.filter(Boolean) as string[],
                  globalCarouselIndex
                });
                
                return (
                  <Card 
                    key={rule.id}
                    className={`bg-dark-navy border-2 ${rule.highlight_effect ? 'border-[#00f0ff] shadow-[0_0_8px_2px_rgba(0,240,255,0.6)]' : 'border-[#00f0ff]'} overflow-hidden`}
                  >
                    <div className="relative p-4">
                      <RuleBackground
                        visibleImage={visibleImage}
                        transitionImage={transitionImage}
                        isTransitioning={isTransitioning}
                        focalPointX={rule.focal_point_x}
                        focalPointY={rule.focal_point_y}
                        backgroundOpacity={rule.background_opacity}
                      />
                      
                      <div className="flex justify-between items-center mb-3 relative z-10">
                        <PriorityBadge priority={rule.priority as 'low' | 'medium' | 'high'} />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="bg-red-500 text-white hover:bg-red-600/90 h-7 px-3 z-10"
                          onClick={() => handleRuleBroken(rule)}
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
                                text={rule.title}
                                highlight={rule.highlight_effect}
                                color={rule.title_color}
                              />
                            </div>
                            
                            {rule.description && (
                              <div className="text-sm mt-1">
                                <HighlightedText
                                  text={rule.description}
                                  highlight={rule.highlight_effect}
                                  color={rule.subtext_color}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 relative z-10">
                        <FrequencyTracker 
                          frequency={rule.frequency}
                          frequency_count={rule.frequency_count}
                          calendar_color={rule.calendar_color}
                          usage_data={rule.usage_data}
                        />
                        
                        <Button 
                          size="sm" 
                          className="bg-gray-700 hover:bg-gray-600 rounded-full w-10 h-10 p-0"
                          onClick={() => handleEditRule(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        <RuleEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setCurrentRule(null);
          }}
          ruleData={currentRule || undefined}
          onSave={handleSaveRule}
          onDelete={handleDeleteRule}
          carouselTimer={carouselTimer}
          onCarouselTimerChange={handleCarouselTimerChange}
        />
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rules;
