
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RuleEditor from '../components/RuleEditor';
import { toast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import RulesHeader from '../components/rules/RulesHeader';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { getMondayBasedDay } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import RuleCard from '../components/rules/RuleCard';
import { RuleCarouselProvider, useRuleCarousel } from '@/contexts/RuleCarouselContext';

interface Rule {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string | null;
  background_images: string[];
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
  carousel_timer: number;
}

const RulesContent: React.FC = () => {
  const navigate = useNavigate();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { globalCarouselIndex } = useRuleCarousel();

  useEffect(() => {
    const fetchRules = async () => {
      try {
        console.log("Fetching rules from Supabase...");
        const { data, error } = await supabase
          .from('rules')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        console.log("Rules data from Supabase:", data);
        
        const rulesWithUsageData = (data as Rule[] || []).map(rule => {
          let background_images = rule.background_images || [];
          
          if (!Array.isArray(background_images)) {
            console.log("background_images is not an array, converting:", background_images);
            try {
              background_images = typeof background_images === 'string' 
                ? JSON.parse(background_images) 
                : [];
            } catch (e) {
              console.error("Failed to parse background_images:", e);
              background_images = [];
            }
          }
          
          if (rule.background_image_url && 
              !background_images.includes(rule.background_image_url)) {
            background_images = [rule.background_image_url, ...background_images];
            console.log("Added background_image_url to background_images array");
          }
          
          background_images = background_images.filter(img => !!img && img.trim() !== '');
          
          console.log(`Rule ${rule.id} has ${background_images.length} background images`);
          
          if (!rule.usage_data || !Array.isArray(rule.usage_data) || rule.usage_data.length !== 7) {
            return { 
              ...rule, 
              usage_data: [0, 0, 0, 0, 0, 0, 0],
              background_images
            };
          }
          
          return {
            ...rule,
            background_images
          };
        });
        
        console.log("Processed rules with background images:", 
          rulesWithUsageData.map(r => ({id: r.id, imageCount: r.background_images.length})));
        
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
    }, 30000);
    
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
      
      console.log("Saving rule with data:", ruleData);
      
      const processedRuleData = {
        ...ruleData,
        carousel_timer: ruleData.carousel_timer || 5,
      };
      
      if (processedRuleData.id) {
        const existingRule = rules.find(rule => rule.id === processedRuleData.id);
        
        console.log("Updating existing rule:", processedRuleData.id);
        console.log("Background images to save:", processedRuleData.background_images);
        
        const { data, error } = await supabase
          .from('rules')
          .update({
            title: processedRuleData.title,
            description: processedRuleData.description,
            priority: processedRuleData.priority,
            background_image_url: processedRuleData.background_image_url,
            background_images: processedRuleData.background_images,
            background_opacity: processedRuleData.background_opacity,
            icon_url: processedRuleData.icon_url,
            icon_name: processedRuleData.icon_name,
            title_color: processedRuleData.title_color,
            subtext_color: processedRuleData.subtext_color,
            calendar_color: processedRuleData.calendar_color,
            icon_color: processedRuleData.icon_color,
            highlight_effect: processedRuleData.highlight_effect,
            focal_point_x: processedRuleData.focal_point_x,
            focal_point_y: processedRuleData.focal_point_y,
            frequency: processedRuleData.frequency,
            frequency_count: processedRuleData.frequency_count,
            carousel_timer: processedRuleData.carousel_timer,
            updated_at: new Date().toISOString()
          })
          .eq('id', processedRuleData.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        
        console.log("Rule updated successfully:", result);
        
        if (existingRule && existingRule.usage_data) {
          result.usage_data = existingRule.usage_data;
        }
        
        setRules(rules.map(rule => rule.id === processedRuleData.id ? { ...rule, ...result as Rule } : rule));
        
        toast({
          title: 'Success',
          description: 'Rule updated successfully!',
        });
      } else {
        const { id, ...ruleWithoutId } = processedRuleData;
        
        if (!ruleWithoutId.title) {
          throw new Error('Rule title is required');
        }
        
        console.log("Creating new rule");
        console.log("Background images to save:", ruleWithoutId.background_images);
        
        const newRule = {
          title: ruleWithoutId.title,
          priority: ruleWithoutId.priority || 'medium',
          background_opacity: ruleWithoutId.background_opacity || 100,
          background_images: ruleWithoutId.background_images || [],
          icon_color: ruleWithoutId.icon_color || '#FFFFFF',
          title_color: ruleWithoutId.title_color || '#FFFFFF',
          subtext_color: ruleWithoutId.subtext_color || '#FFFFFF',
          calendar_color: ruleWithoutId.calendar_color || '#9c7abb',
          highlight_effect: ruleWithoutId.highlight_effect || false,
          focal_point_x: ruleWithoutId.focal_point_x || 0.5,
          focal_point_y: ruleWithoutId.focal_point_y || 0.5,
          frequency: ruleWithoutId.frequency || 'daily',
          frequency_count: ruleWithoutId.frequency_count || 3,
          carousel_timer: ruleWithoutId.carousel_timer || 5,
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
        
        console.log("Rule created successfully:", result);
        
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
    <>
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
            {rules.map((rule) => (
              <RuleCard 
                key={rule.id} 
                rule={rule} 
                globalCarouselIndex={globalCarouselIndex}
                onRuleBroken={handleRuleBroken}
                onEdit={handleEditRule}
              />
            ))}
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
    </>
  );
};

const Rules: React.FC = () => {
  const handleAddRule = () => {
    const rulesContent = document.getElementById('rules-content-component');
    if (rulesContent) {
      // This is just to trigger the handleAddRule in the RulesContent component
      const event = new CustomEvent('add-rule');
      rulesContent.dispatchEvent(event);
    }
  };

  return (
    <AppLayout onAddNewItem={handleAddRule}>
      <RewardsProvider>
        <RuleCarouselProvider>
          <RulesContent />
        </RuleCarouselProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rules;
