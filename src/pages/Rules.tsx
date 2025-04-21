
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Check, Loader2 } from 'lucide-react';
import FrequencyTracker from '../components/task/FrequencyTracker';
import PriorityBadge from '../components/task/PriorityBadge';
import { useNavigate } from 'react-router-dom';
import RuleEditor from '../components/RuleEditor';
import { toast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import HighlightedText from '../components/task/HighlightedText';
import RulesHeader from '../components/rule/RulesHeader';
import { getMondayBasedDay } from '@/lib/utils';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ensure proper types for priority, frequency, and usage_data
      return (data as any[]).map(rule => {
        const priorityVal = ['low', 'medium', 'high'].includes(rule.priority) ? rule.priority : 'medium';
        const frequencyVal = ['daily', 'weekly'].includes(rule.frequency) ? rule.frequency : 'daily';
        const usageDataVal = Array.isArray(rule.usage_data) && rule.usage_data.length === 7 ? rule.usage_data.map(Number) : [0, 0, 0, 0, 0, 0, 0];

        return {
          ...rule,
          priority: priorityVal,
          frequency: frequencyVal,
          usage_data: usageDataVal,
        };
      }) as Rule[];
    }
  });

  // Mutation for marking rule broken
  const handleRuleBrokenMutation = useMutation({
    mutationFn: async (rule: Rule) => {
      const currentDay = getMondayBasedDay();

      const newUsageData = [...(rule.usage_data || [0,0,0,0,0,0,0])];
      newUsageData[currentDay] = 1;

      // Update rule usage_data
      const { error } = await supabase
        .from('rules')
        .update({ usage_data: newUsageData, updated_at: new Date().toISOString() })
        .eq('id', rule.id);

      if (error) throw error;

      // Insert violation analytics record
      const today = new Date();
      const jsDay = today.getDay();
      const { error: violationError } = await supabase
        .from('rule_violations')
        .insert({
          rule_id: rule.id,
          violation_date: today.toISOString(),
          day_of_week: jsDay,
          week_number: `${today.getFullYear()}-${Math.floor(today.getDate()/7)}`
        });

      if (violationError) {
        toast({
          title: 'Warning',
          description: 'Rule marked as broken, but analytics may not be updated.',
          variant: 'destructive',
        });
      }

      return { ...rule, usage_data: newUsageData };
    },
    onMutate: async (rule) => {
      await queryClient.cancelQueries(['rules']);
      const previousRules = queryClient.getQueryData(['rules']);
      queryClient.setQueryData(['rules'], (old: Rule[] | undefined) =>
        old ? old.map(r => r.id === rule.id ? { ...r, isUpdating: true } : r) : []
      );
      return { previousRules };
    },
    onError: (err, rule, context: any) => {
      toast({
        title: 'Error',
        description: 'Failed to record rule violation. Please try again.',
        variant: 'destructive',
      });
      queryClient.setQueryData(['rules'], context.previousRules);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['rules']);
      navigate('/punishments');
    }
  });

  const handleRuleBroken = (rule: Rule) => {
    handleRuleBrokenMutation.mutate(rule);
  };

  // Mutation for saving a rule (add or update)
  const handleSaveRuleMutation = useMutation({
    mutationFn: async (ruleData: Partial<Rule>) => {
      if (ruleData.id) {
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
        return data;
      } else {
        // Insert new rule
        const newRule = {
          title: ruleData.title!,
          priority: ruleData.priority ?? 'medium',
          background_opacity: ruleData.background_opacity ?? 100,
          icon_color: ruleData.icon_color ?? '#FFFFFF',
          title_color: ruleData.title_color ?? '#FFFFFF',
          subtext_color: ruleData.subtext_color ?? '#FFFFFF',
          calendar_color: ruleData.calendar_color ?? '#9c7abb',
          highlight_effect: ruleData.highlight_effect ?? false,
          focal_point_x: ruleData.focal_point_x ?? 50,
          focal_point_y: ruleData.focal_point_y ?? 50,
          frequency: ruleData.frequency ?? 'daily',
          frequency_count: ruleData.frequency_count ?? 3,
          usage_data: [0, 0, 0, 0, 0, 0, 0],
          description: ruleData.description ?? null,
          background_image_url: ruleData.background_image_url ?? null,
          icon_url: ruleData.icon_url ?? null,
          icon_name: ruleData.icon_name ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        };
        const { data, error } = await supabase
          .from('rules')
          .insert(newRule)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onMutate: async (ruleData: Partial<Rule>) => {
      await queryClient.cancelQueries(['rules']);
      const previousRules = queryClient.getQueryData(['rules']);

      queryClient.setQueryData(['rules'], (old: Rule[] | undefined) => {
        if (!old) return [ruleData as Rule];
        if (ruleData.id) {
          return old.map(rule => (rule.id === ruleData.id ? { ...rule, ...ruleData } : rule));
        } else {
          return [ruleData as Rule, ...old];
        }
      });
      return { previousRules };
    },
    onError: (err, ruleData, context: any) => {
      toast({
        title: 'Error',
        description: 'Failed to save rule. Please try again.',
        variant: 'destructive',
      });
      queryClient.setQueryData(['rules'], context.previousRules);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['rules']);
      setIsEditorOpen(false);
    }
  });

  const handleSaveRule = (ruleData: Partial<Rule>) => {
    handleSaveRuleMutation.mutate(ruleData);
  };

  // Mutation for deleting a rule
  const handleDeleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onMutate: async (ruleId: string) => {
      await queryClient.cancelQueries(['rules']);
      const previousRules = queryClient.getQueryData(['rules']);

      queryClient.setQueryData(['rules'], (old: Rule[] | undefined) => old ? old.filter(rule => rule.id !== ruleId) : []);

      return { previousRules };
    },
    onError: (err, ruleId, context: any) => {
      toast({
        title: 'Error',
        description: 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
      queryClient.setQueryData(['rules'], context.previousRules);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['rules']);
      setCurrentRule(null);
      setIsEditorOpen(false);
    }
  });

  const handleDeleteRule = (ruleId: string) => {
    handleDeleteRuleMutation.mutate(ruleId);
  };

  const handleAddRule = () => {
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setCurrentRule(rule);
    setIsEditorOpen(true);
  };

  return (
    <AppLayout onAddNewItem={handleAddRule}>
      <div className="container mx-auto px-4 py-6">
        <RulesHeader />

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        ) : !rules || rules.length === 0 ? (
          <div className="text-center py-10 text-white">
            No rules found. Create your first rule!
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map(rule => (
              <Card
                key={rule.id}
                className={`bg-dark-navy border-2 ${rule.highlight_effect ? 'border-[#00f0ff] shadow-[0_0_8px_2px_rgba(0,240,255,0.6)]' : 'border-[#00f0ff]'} overflow-hidden`}
              >
                <div className="relative p-4">
                  {rule.background_image_url && (
                    <div
                      className="absolute inset-0 z-0"
                      style={{
                        backgroundImage: `url(${rule.background_image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: `${rule.focal_point_x || 50}% ${rule.focal_point_y || 50}%`,
                        opacity: (rule.background_opacity || 100) / 100,
                      }}
                    />
                  )}

                  <div className="flex justify-between items-center mb-3 relative z-10">
                    <PriorityBadge priority={rule.priority} />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-500 text-white hover:bg-red-600/90 h-7 px-3"
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
    </AppLayout>
  );
};

export default Rules;

