
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Check, Plus } from 'lucide-react';
import FrequencyTracker from '../components/task/FrequencyTracker';
import PriorityBadge from '../components/task/PriorityBadge';
import { useNavigate } from 'react-router-dom';
import RuleEditor from '../components/RuleEditor';
import { toast } from '@/hooks/use-toast';

// Example rule data structure (similar to Task)
interface Rule {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  icon_name?: string;
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
}

const Rules: React.FC = () => {
  const navigate = useNavigate();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  
  // Example rule for demonstration
  const exampleRule: Rule = {
    id: "rule-1",
    title: "Spanking",
    description: "Get a spanking",
    priority: "medium",
    background_opacity: 100,
    title_color: "#FFFFFF",
    subtext_color: "#FFFFFF",
    calendar_color: "#9c7abb",
    icon_color: "#FFFFFF",
    highlight_effect: false,
    focal_point_x: 50,
    focal_point_y: 50,
    frequency: "daily",
    frequency_count: 3,
    usage_data: [1, 1, 1, 0, 0, 0, 0],
  };

  const handleAddRule = () => {
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setCurrentRule(rule);
    setIsEditorOpen(true);
  };

  const handleSaveRule = async (ruleData: any) => {
    try {
      console.log("Saving rule:", ruleData);
      
      // Here you would normally save the rule to your database
      // For now, we'll just show a success toast
      
      toast({
        title: 'Success',
        description: `Rule ${currentRule ? 'updated' : 'created'} successfully!`,
      });
      
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
      console.log("Deleting rule:", ruleId);
      
      // Here you would normally delete the rule from your database
      // For now, we'll just show a success toast
      
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
        
        <div className="space-y-4">
          {/* Rule Card Example - Styled to match the screenshot */}
          <Card className="bg-dark-navy border-2 border-[#00f0ff] overflow-hidden">
            <div className="relative p-4">
              {/* Card Header Row */}
              <div className="flex justify-between items-center mb-3">
                <PriorityBadge priority="medium" />
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
                    Spanking
                  </span>
                </div>
                
                <div className="ml-12 mt-1">
                  <span className="text-white">
                    Get a spanking
                  </span>
                </div>
              </div>
              
              {/* Frequency Tracker and Edit Button */}
              <div className="flex items-center justify-between mt-2">
                <FrequencyTracker 
                  frequency="daily"
                  frequency_count={3}
                  calendar_color="#9c7abb"
                  usage_data={[1, 1, 1, 0, 0, 0, 0]}
                />
                
                <Button 
                  size="sm" 
                  className="bg-gray-700 hover:bg-gray-600 rounded-full w-10 h-10 p-0"
                  onClick={() => handleEditRule(exampleRule)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Add Rule Button */}
        <div className="flex justify-center mt-8">
          <Button 
            className="bg-dark-navy border border-light-navy hover:bg-light-navy text-white rounded-full px-6 py-2 flex items-center"
            onClick={handleAddRule}
          >
            <Plus className="w-5 h-5 mr-2" /> Add Rule
          </Button>
        </div>
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
