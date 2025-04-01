
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
import { v4 as uuidv4 } from 'uuid';

// Rule data structure
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
  
  // Fetch rules from Supabase on component mount
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
        
        setRules(data as Rule[] || []);
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

  const handleSaveRule = async (ruleData: Partial<Rule>) => {
    try {
      let result;
      
      if (ruleData.id) {
        // Update existing rule
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
        
        // Update the rules state
        setRules(rules.map(rule => rule.id === ruleData.id ? { ...rule, ...result as Rule } : rule));
        
        toast({
          title: 'Success',
          description: 'Rule updated successfully!',
        });
      } else {
        // Create new rule
        const newRuleId = uuidv4();
        const newRule = {
          ...ruleData,
          id: newRuleId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: (await supabase.auth.getUser()).data.user?.id,
        };
        
        const { data, error } = await supabase
          .from('rules')
          .insert([newRule as any])
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        
        // Add new rule to the rules state
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
      
      // Remove the deleted rule from the rules state
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
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-base font-semibold text-white mb-6">Rules</h1>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white mb-4">No rules found. Create your first rule!</p>
            <Button 
              className="bg-dark-navy border border-light-navy hover:bg-light-navy text-white rounded-full px-6 py-2 flex items-center"
              onClick={handleAddRule}
            >
              <Plus className="w-5 h-5 mr-2" /> Add Rule
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <Card 
                key={rule.id}
                className="bg-dark-navy border-2 border-[#00f0ff] overflow-hidden"
              >
                <div className="relative p-4">
                  {/* Card Header Row */}
                  <div className="flex justify-between items-center mb-3">
                    <PriorityBadge priority={rule.priority as 'low' | 'medium' | 'high'} />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-500 text-white hover:bg-red-600/90 h-7 px-3"
                      onClick={() => navigate('/punishments')}
                    >
                      Rule Broken
                    </Button>
                  </div>
                  
                  {/* Main Rule Content */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white font-bold">
                        {rule.title}
                      </span>
                    </div>
                    
                    <div className="ml-12 mt-1">
                      <span className="text-white">
                        {rule.description}
                      </span>
                    </div>
                  </div>
                  
                  {/* Frequency Tracker and Edit Button */}
                  <div className="flex items-center justify-between mt-2">
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
        
        {/* Add Rule Button */}
        {!isLoading && rules.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button 
              className="bg-dark-navy border border-light-navy hover:bg-light-navy text-white rounded-full px-6 py-2 flex items-center"
              onClick={handleAddRule}
            >
              <Plus className="w-5 h-5 mr-2" /> Add Rule
            </Button>
          </div>
        )}
      </div>
      
      {/* Rule Editor Modal */}
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
