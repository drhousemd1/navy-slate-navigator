
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import TaskCard from '../components/TaskCard';
import TaskEditor from '../components/TaskEditor';
import { fetchTasks, Task, saveTask, updateTaskCompletion } from '../lib/taskUtils';
import { toast } from '@/hooks/use-toast';

const Tasks: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tasks. Please try again.',
        variant: 'destructive',
      });
    }
  }, [error]);

  const handleNewTask = () => {
    console.log("Creating new task");
    setCurrentTask(null);
    setIsEditorOpen(true);
  };

  const handleEditTask = (task: Task) => {
    console.log("Editing task:", task);
    setCurrentTask(task);
    setIsEditorOpen(true);
  };

  const handleSaveTask = async (taskData: Task) => {
    try {
      console.log("Saving task:", taskData);
      const savedTask = await saveTask(taskData);
      
      if (savedTask) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast({
          title: 'Success',
          description: `Task ${currentTask ? 'updated' : 'created'} successfully!`,
        });
        setIsEditorOpen(false);
      }
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const handleToggleCompletion = async (taskId: string, completed: boolean) => {
    try {
      const success = await updateTaskCompletion(taskId, completed);
      
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    } catch (err) {
      console.error('Error toggling task completion:', err);
    }
  };

  return (
    <AppLayout onAddNewItem={handleNewTask}>
      <div className="p-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-white">My Tasks</h1>
        </div>
        
        {isLoading ? (
          <div className="text-white">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-light-navy mb-4">No tasks found. Create your first task to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                title={task.title}
                description={task.description}
                points={task.points}
                completed={task.completed}
                backgroundImage={task.background_image_url}
                backgroundOpacity={task.background_opacity}
                focalPointX={task.focal_point_x}
                focalPointY={task.focal_point_y}
                frequency={task.frequency}
                frequency_count={task.frequency_count}
                icon_url={task.icon_url}
                priority={task.priority}
                onEdit={() => handleEditTask(task)}
                onToggleCompletion={(completed) => handleToggleCompletion(task.id, completed)}
              />
            ))}
          </div>
        )}

        <TaskEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setCurrentTask(null);
          }}
          taskData={currentTask || undefined}
          onSave={handleSaveTask}
        />
      </div>
    </AppLayout>
  );
};

export default Tasks;
