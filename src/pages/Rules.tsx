
import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import RulesHeader from '../components/rule/RulesHeader';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { v4 as uuidv4 } from 'uuid';
import RuleCard from '@/components/rule/RuleCard';
import { RuleCardData } from '@/components/rule/hooks/useRuleCardData';

interface Rule {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  points?: number;
  background_image_url?: string | null;
  background_image_path?: string | null;
  background_images?: string[];
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
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const [carouselTimer, setCarouselTimer] = useState(5);
  const [visibleCount, setVisibleCount] = useState(0);
  
  const rulesRef = useRef<Rule[]>([]);
  const intervalRef = useRef<number | null>(null);
  const fetchingRef = useRef(false);
  const hasMoreRef = useRef(true);
  
  const fetchRules = useCallback(async () => {
    // If already fetching or no more rules to fetch, don't fetch again
    if (fetchingRef.current || !hasMoreRef.current) {
      return;
    }

    try {
      fetchingRef.current = true;
      setIsLoading(true);
      
      console.log("Fetching rules from Supabase...");
      
      // Use a more efficient query that only gets what we need in a single request
      // with a reasonable limit to avoid timeout issues
      const {
        data,
        error
      } = await supabase.from('rules')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        throw error;
      }
      
      const newRules = (data as Rule[] || []).map(rule => {
        if (!rule.usage_data || !Array.isArray(rule.usage_data) || rule.usage_data.length !== 7) {
          return {
            ...rule,
            usage_data: [0, 0, 0, 0, 0, 0, 0]
          };
        }
        return rule;
      });
      
      if (newRules.length === 0) {
        hasMoreRef.current = false;
      }

      setRules(newRules);
      rulesRef.current = newRules;
      
      if (visibleCount === 0 && newRules.length > 0) {
        setVisibleCount(1); // Start showing the first rule
      }
      
    } catch (err) {
      console.error('Error fetching rules:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch rules. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [visibleCount]);
  
  // Initialize carousel timer from localStorage and start initial interval
  useEffect(() => {
    const loadRules = async () => {
      await fetchRules();
    };

    loadRules();
    
    const savedTimer = parseInt(localStorage.getItem('rules_carouselTimer') || '5', 10);
    setCarouselTimer(savedTimer);
    
    // Initial interval setup
    const intervalId = setInterval(() => {
      setGlobalCarouselIndex(prev => prev + 1);
    }, savedTimer * 1000);
    
    intervalRef.current = intervalId as unknown as number;
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchRules]);
  
  // Update interval whenever carouselTimer changes
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Create new interval with updated timer value
    const newIntervalId = setInterval(() => {
      setGlobalCarouselIndex(prev => prev + 1);
    }, carouselTimer * 1000);
    
    intervalRef.current = newIntervalId as unknown as number;
    
    // Save timer to localStorage to persist across refreshes
    localStorage.setItem('rules_carouselTimer', carouselTimer.toString());
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [carouselTimer]);

  const handleAddRule = async () => {
    try {
      const newRule = {
        id: uuidv4(),
        title: 'New Rule',
        description: 'This is a new rule. Click edit to customize it.',
        priority: 'medium' as const,
        background_opacity: 80,
        focal_point_x: 50,
        focal_point_y: 50,
        title_color: '#FFFFFF',
        subtext_color: '#8E9196',
        calendar_color: '#7E69AB',
        icon_color: '#FFFFFF',
        highlight_effect: false,
        frequency: 'daily' as const,
        frequency_count: 3,
        usage_data: [0, 0, 0, 0, 0, 0, 0],
        background_images: [],
        background_image_path: null
      };
      
      const {
        data,
        error
      } = await supabase.from('rules').insert(newRule).select().single();
      
      if (error) throw error;
      const createdRule = data as Rule;
      
      // Add the new rule to the beginning of the rules array
      setRules(prevRules => [createdRule, ...prevRules]);
      
      toast({
        title: 'Success',
        description: 'Rule created successfully!'
      });
    } catch (err) {
      console.error('Error adding rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to create rule. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateRule = (updatedRule: RuleCardData) => {
    const updatedRuleInFormat: Rule = {
      ...updatedRule,
      description: updatedRule.description || '',
      points: 0,
      background_images: updatedRule.background_images || []
    };
    setRules(rules.map(rule => rule.id === updatedRule.id ? updatedRuleInFormat : rule));
  };

  const handleRuleBroken = (rule: RuleCardData) => {
    const updatedRule = rules.find(r => r.id === rule.id);
    if (updatedRule) {
      const newUsageData = [...rule.usage_data];
      setRules(rules.map(r => r.id === rule.id ? {
        ...r,
        usage_data: newUsageData
      } : r));
    }
  };

  // Handler for when a rule card is fully loaded
  const handleRuleFullyLoaded = useCallback(() => {
    // Increment visible count to show next card with a slight delay
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 1, rules.length));
    }, 100);
  }, [rules.length]);

  // Add handler for carousel timer changes
  const handleCarouselTimerChange = (newTimer: number) => {
    console.log(`Updating global carousel timer to ${newTimer} seconds`);
    setCarouselTimer(newTimer);
  };

  return <AppLayout onAddNewItem={handleAddRule}>
      <RewardsProvider>
        <div className="container mx-auto px-4 py-6">
          <RulesHeader />
          
          <div className="flex justify-end mb-6">
            
          </div>
          
          {isLoading && rules.length === 0 ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white mb-4">No rules found. Create your first rule!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule, index) => (
                index < visibleCount && (
                  <RuleCard 
                    key={rule.id} 
                    id={rule.id} 
                    title={rule.title} 
                    description={rule.description || ''} 
                    priority={rule.priority} 
                    globalCarouselIndex={globalCarouselIndex} 
                    onUpdate={handleUpdateRule} 
                    onRuleBroken={handleRuleBroken} 
                    rule={rule as RuleCardData}
                    carouselTimer={carouselTimer}
                    onCarouselTimerChange={handleCarouselTimerChange}
                    onFullyLoaded={handleRuleFullyLoaded}
                  />
                )
              ))}
            </div>
          )}
        </div>
      </RewardsProvider>
    </AppLayout>;
};

export default Rules;
