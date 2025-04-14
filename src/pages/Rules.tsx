
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import RulesHeader from '../components/rule/RulesHeader';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { getMondayBasedDay } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import RuleCard from '@/components/rule/RuleCard';
import { RuleCardData } from '@/components/rule/hooks/useRuleCardData';

interface Rule {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  points?: number;
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
  background_images?: string[];
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

const Rules: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const queryClient = useQueryClient();

  // Set up carousel timer
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalCarouselIndex(prev => prev + 1);
    }, 5000); // Default to 5 seconds

    return () => clearInterval(interval);
  }, []);

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
    // Create a new empty rule with default values
    const newRule: Rule = {
      id: '',
      title: 'New Rule',
      description: '',
      priority: 'medium',
      points: 0,
      background_opacity: 80,
      focal_point_x: 50,
      focal_point_y: 50,
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      icon_color: '#FFFFFF',
      highlight_effect: false,
      frequency: 'daily',
      frequency_count: 3,
      usage_data: [0, 0, 0, 0, 0, 0, 0]
    };
    // Pass this to the RuleCard component
    setRules([newRule, ...rules]);
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

  // Convert RuleCardData to Rule type for the update function
  const handleUpdateRule = (updatedRule: RuleCardData) => {
    // Convert RuleCardData to Rule
    const ruleToUpdate: Rule = {
      id: updatedRule.id,
      title: updatedRule.title,
      description: updatedRule.description || '',
      priority: updatedRule.priority || 'medium',
      points: updatedRule.points,
      background_image_url: updatedRule.background_image_url,
      background_opacity: updatedRule.background_opacity,
      icon_url: updatedRule.icon_url,
      icon_name: updatedRule.icon_name,
      title_color: updatedRule.title_color,
      subtext_color: updatedRule.subtext_color,
      calendar_color: updatedRule.calendar_color,
      icon_color: updatedRule.icon_color,
      highlight_effect: updatedRule.highlight_effect,
      focal_point_x: updatedRule.focal_point_x,
      focal_point_y: updatedRule.focal_point_y,
      frequency: updatedRule.frequency || 'daily',
      frequency_count: updatedRule.frequency_count || 1,
      usage_data: updatedRule.usage_data || [0, 0, 0, 0, 0, 0, 0],
      background_images: updatedRule.background_images
    };
    
    setRules(rules.map(rule => 
      rule.id === ruleToUpdate.id ? ruleToUpdate : rule
    ));
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
              <Button 
                onClick={handleAddRule}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Rule
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  id={rule.id}
                  title={rule.title}
                  description={rule.description || ''}
                  priority={rule.priority}
                  points={rule.points || 0}
                  globalCarouselIndex={globalCarouselIndex}
                  onUpdate={handleUpdateRule}
                  card={rule as unknown as RuleCardData}
                />
              ))}
            </div>
          )}
        </div>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rules;
