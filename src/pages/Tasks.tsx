
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Calendar, Gift } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Task = {
  id: string;
  title: string;
  completed: boolean;
  days: boolean[];
};

const Tasks: React.FC = () => {
  const [tasks] = useState<Task[]>([
    {
      id: '1',
      title: 'test',
      completed: false,
      days: Array(10).fill(false)
    }
  ]);

  return (
    <AppLayout>
      <div className="p-4 pb-24">
        <h1 className="text-3xl font-semibold text-white mb-6">Tasks</h1>
        
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4 bg-gray-200 rounded-lg shadow-md">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-nav-active p-3 rounded-lg">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-grow">
                  <div className="font-medium text-gray-800 text-lg">{task.title}</div>
                  
                  <div className="flex items-center mt-4 gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div className="flex gap-1 overflow-x-auto pb-1 pt-1">
                      {task.days.map((completed, index) => (
                        <div 
                          key={index}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                            completed ? 'bg-nav-active border-nav-active' : 'bg-white border-gray-300'
                          }`}
                        >
                          {completed && <div className="w-3 h-3 bg-white rounded-full" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <Badge className="bg-blue-500 text-white font-medium px-3 py-1">
                    20
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {tasks.length === 0 && (
          <div className="text-center p-6 animate-slide-up">
            <p className="text-nav-inactive">No tasks yet. Add your first task!</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Tasks;
