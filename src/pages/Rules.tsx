
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Check, Plus } from 'lucide-react';
import FrequencyTracker from '../components/task/FrequencyTracker';
import PriorityBadge from '../components/task/PriorityBadge';
import { useNavigate } from 'react-router-dom';

const Rules: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

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
                
                <div className="ml-12 mt-3">
                  <span className="text-white">
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
