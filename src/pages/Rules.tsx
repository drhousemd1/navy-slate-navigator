
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Edit, Check, Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const Rules: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6">Rules</h1>
        
        {/* Rule Card Example */}
        <Card className="mb-4 overflow-hidden bg-transparent border border-light-navy">
          <div className="relative rounded-lg overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 bg-cover bg-center opacity-30" 
              style={{ backgroundImage: `url('/lovable-uploads/769f02c4-144a-4d6d-a262-2fcb44d7bc09.png')` }}>
            </div>
            
            <div className="relative p-4">
              {/* Card Header Row */}
              <div className="flex justify-between items-center mb-3">
                <Badge className="bg-amber-500 text-white font-bold border-none">Medium</Badge>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 h-7 px-2 rounded-full">
                    <Plus className="w-4 h-4 mr-1" /> 5
                  </Button>
                  <Badge className="bg-green-500 text-white border-none px-3 py-1">
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
                  <div className="bg-gray-300 bg-opacity-60 text-black font-bold py-1 px-4 rounded-md">
                    Spanking
                  </div>
                </div>
                
                <div className="ml-12 mt-2">
                  <Button 
                    variant="outline" 
                    className="bg-gray-300 bg-opacity-60 text-gray-700 border-none hover:bg-gray-300"
                  >
                    Get a spanking
                  </Button>
                </div>
              </div>
              
              {/* Frequency Tracker */}
              <div className="flex items-center space-x-2 mt-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                <div className="flex space-x-1">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-full border border-gray-400 ${
                        i === 2 ? 'bg-purple-500 border-purple-500' : i < 2 ? 'border-gray-400 bg-gray-400 bg-opacity-30' : ''
                      }`}
                    />
                  ))}
                </div>
                
                {/* Edit Button */}
                <div className="ml-auto">
                  <Button size="sm" className="bg-gray-700 hover:bg-gray-600 rounded-full w-10 h-10 p-0">
                    <Edit className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Add More Rules Button */}
        <div className="text-center mt-8">
          <Button className="bg-navy hover:bg-light-navy text-white border border-light-navy">
            <Plus className="w-5 h-5 mr-2" /> Add Rule
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Rules;
