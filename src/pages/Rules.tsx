
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Check, Plus, Loader2 } from 'lucide-react';
import FrequencyTracker from '../components/task/FrequencyTracker';
import PriorityBadge from '../components/task/PriorityBadge';
import { useNavigate } from 'react-router-dom';
import RuleEditor from '../components/RuleEditor';
import { toast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import HighlightedText from '../components/task/HighlightedText';
import RulesHeader from '../components/rule/RulesHeader';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { getMondayBasedDay } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import CardBackground from "@/components/rule/CardBackground";
import { useImageCarousel } from "@/components/rule/useImageCarousel";

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

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const { data, error } = await supabase
          .from('rules')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        const rulesWithUsageData = (data as Rule[] || []).map(rule => {
          if (!rule.usage_data || !Array.isArray(rule.usage_data) || rule.usage_data.length !== 7) {
            return { ...rule, usage_data: [0, 0, 0, 0, 0, 0, 0] };
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
    
    const intervalId = setInterval(() => {
      fetchRules();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
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
                const {
                  visibleImage,
                  transitionImage,
                  isTransitioning,
                  currentIndex,
                  setCurrentIndex,
                  nextImage,
                  prevImage
                } = useImageCarousel({
                  images: rule.background_images || [],
                  globalCarouselIndex
                });

                return (
                  <Card key={rule.id} className="relative overflow-hidden">
                    <CardBackground
                      visibleImage={visibleImage}
                      transitionImage={transitionImage}
                      isTransitioning={isTransitioning}
                      focalPointX={rule.focal_point_x ?? 0.5}
                      focalPointY={rule.focal_point_y ?? 0.5}
                      backgroundOpacity={rule.background_opacity ?? 100}
                    />
                    <div className="relative z-10 p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-semibold">{rule.title}</h3>
                        <PriorityBadge priority={rule.priority} />
                      </div>
                      <p className="text-sm">{rule.description}</p>
                      <div className="mt-4 flex justify-between items-center">
                        <FrequencyTracker
                          frequency="weekly"
                          frequency_count={2}
                          calendar_color="#888888"
                          usage_data={[1, 0, 2, 1, 0, 0, 1]}
                        />
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
        />
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rules;
