
import React, { useState } from 'react';
import { useTaskCarousel } from '@/contexts/TaskCarouselContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/lib/taskUtils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Clock, CheckCircle2, Loader2 } from 'lucide-react';

interface TasksContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const TasksContent: React.FC<TasksContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const { carouselTimer, globalCarouselIndex } = useTaskCarousel();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Task[];
    }
  });

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsEditorOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsEditorOpen(true);
  };

  // Placeholder for task completion toggle
  const handleToggleComplete = async (taskId: string) => {
    console.log(`Toggle completion for task ${taskId}`);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-gray-400">Manage your daily and weekly tasks</p>
        </div>
        <Button onClick={handleNewTask} className="bg-blue-600 hover:bg-blue-700">
          <PlusCircle className="mr-2 h-4 w-4" /> New Task
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <div className="text-center py-10 text-white">
          <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No Tasks Yet</h3>
          <p>Create your first task to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="bg-dark-navy border-2 border-blue-500 overflow-hidden">
              <div className="relative p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Button
                      className={`rounded-full w-10 h-10 mr-3 ${
                        task.completed ? 'bg-green-500' : 'bg-gray-700'
                      }`}
                      onClick={() => handleToggleComplete(task.id || '')}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </Button>
                    <div>
                      <h3 className="text-xl font-bold text-white">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-400">{task.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-600 text-white font-bold px-3 py-1 rounded">
                      {task.points} pts
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-gray-700 hover:bg-gray-600"
                      onClick={() => handleEditTask(task)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TasksContent;
