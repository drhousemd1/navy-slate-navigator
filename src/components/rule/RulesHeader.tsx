
import React, { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Box, Clock } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

const RulesHeader: React.FC = () => {
  const [totalRules, setTotalRules] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  // Fetch rules count and calculate points when component mounts
  useEffect(() => {
    const fetchRulesData = async () => {
      try {
        // Get total count of rules
        const { count, error } = await supabase
          .from('rules')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          throw error;
        }
        
        setTotalRules(count || 0);
        
        // Calculate points based on rule priority (similar to task points)
        const { data, error: fetchError } = await supabase
          .from('rules')
          .select('priority');
          
        if (fetchError) {
          throw fetchError;
        }
        
        // Calculate points: high=10, medium=5, low=1
        const points = (data || []).reduce((total, rule) => {
          switch (rule.priority) {
            case 'high':
              return total + 10;
            case 'medium':
              return total + 5;
            case 'low':
              return total + 1;
            default:
              return total;
          }
        }, 0);
        
        setTotalPoints(points);
      } catch (err) {
        console.error('Error fetching rules data:', err);
      }
    };
    
    fetchRulesData();
  }, []);

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">Rules</h1>
      <div className="flex items-center gap-2">
        <Badge className="bg-green-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Box className="w-3 h-3" />
          <span>{totalRules}</span>
        </Badge>
        <Badge className="bg-cyan-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{totalPoints}</span>
        </Badge>
      </div>
    </div>
  );
};

export default RulesHeader;
