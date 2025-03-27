
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Check, Plus } from 'lucide-react';
import FrequencyTracker from '../components/task/FrequencyTracker';
import PriorityBadge from '../components/task/PriorityBadge';

const Rules: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AppLayout onAddNewItem={() => console.log("Add new rule")}>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-base font-semibold text-white mb-6">Rules</h1>
        
        <div className="space-y-4">
          {/* Rule Card Example - Styled to match the screenshot */}
          <Card className="bg-dark-navy border-2 border-[#00f0ff] overflow-hidden">
            <div className="relative p-4">
              {/* Card Header Row */}
              <div className="flex justify-between items-center mb-3">
                <PriorityBadge priority="medium" />
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 h-8 px-2 rounded-full flex items-center">
                    <Plus className="w-4 h-4 mr-1" /> 5
                  </Button>
                  <Badge className="bg-green-500 text-white border-none px-3 py-1 rounded-full">
                    (0/2) Complete
                  </Badge>
                </div>
              </div>
              
              {/* Main Rule Content */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-black font-bold">
                    Spanking
                  </span>
                </div>
                
                <div className="ml-12 mt-3">
                  <span className="text-gray-700">
                    Get a spanking
                  </span>
                </div>
              </div>
              
              {/* Frequency Tracker */}
              <div className="flex items-center justify-between mt-2">
                <FrequencyTracker 
                  frequency="daily"
                  frequency_count={3}
                  calendar_color="#9c7abb"
                  usage_data={[1, 1, 1, 0, 0, 0, 0]}
                />
                
                {/* Edit Button */}
                <Button size="sm" className="bg-gray-700 hover:bg-gray-600 rounded-full w-10 h-10 p-0">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Add Rule Button */}
        <div className="flex justify-center mt-8">
          <Button className="bg-dark-navy border border-light-navy hover:bg-light-navy text-white rounded-full px-6 py-2 flex items-center">
            <Plus className="w-5 h-5 mr-2" /> Add Rule
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Rules;
