
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import TaskCard from '../components/TaskCard';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import { 
  fetchTasks, 
  Task, 
  saveTask, 
  updateTaskCompletion, 
  deleteTask,
  getLocalDateString,
  wasCompletedToday
} from '../lib/taskUtils';
import { toast } from '@/hooks/use-toast';

interface TasksContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const TasksContent: React.FC<TasksContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();
  const { refreshPointsFromDatabase } = useRewards();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  useEffect(() => {
    const checkForReset = () => {
      const now = new Date();
      console.log('Checking for task reset. Current local time:', now.toLocaleTimeString());
      
      if (tasks.length > 0) {
        const tasksToReset = tasks.filter(task => 
          task.completed && 
          task.frequency === 'daily' && 
          !wasCompletedToday(task)
        );
        
        if (tasksToReset.length > 0) {
          console.log('Found tasks that need to be reset:', tasksToReset.length);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      }
    };

    checkForReset();
    
    const scheduleMidnightCheck = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      console.log('Time until midnight check:', timeUntilMidnight, 'ms');
      
      return setTimeout(() => {
        console.log('Midnight reached, checking tasks');
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        
        const newTimeout = scheduleMidnightCheck();
        return () => clearTimeout(newTimeout);
      }, timeUntilMidnight);
    };
    
    const timeoutId = scheduleMidnightCheck();
    
    return () => clearTimeout(timeoutId);
  }, [queryClient, tasks]);

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
      toast({
        title: 'Error',
        description: 'Failed to save task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      console.log("Deleting task:", taskId);
      const success = await deleteTask(taskId);
      
      if (success) {
        setCurrentTask(null);
        setIsEditorOpen(false);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast({
          title: 'Success',
          description: 'Task deleted successfully!',
        });
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleCompletion = async (taskId: string, completed: boolean) => {
    try {
      console.log(`Toggling task ${taskId} completion to ${completed}`);
      const success = await updateTaskCompletion(taskId, completed);
      
      if (success) {
        // Make sure to invalidate both queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        
        // Refresh points from database after task completion
        if (completed) {
          const task = tasks.find(t => t.id === taskId);
          const points = task?.points || 0;
          console.log(`Task completed, earned ${points} points`);
          
          // Refresh points immediately from the database
          await refreshPointsFromDatabase();
        }
      }
    } catch (err) {
      console.error('Error toggling task completion:', err);
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 pt-6">
      <TasksHeader />
      
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
              usage_data={task.usage_data}
              icon_url={task.icon_url}
              icon_name={task.icon_name}
              priority={task.priority}
              highlight_effect={task.highlight_effect}
              title_color={task.title_color}
              subtext_color={task.subtext_color}
              calendar_color={task.calendar_color}
              icon_color={task.icon_color}
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
        onDelete={handleDeleteTask}
      />
    </div>
  );
};

const Tasks: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const handleNewTask = () => {
    console.log("Parent component triggering new task");
    setIsEditorOpen(true);
  };
  
  return (
    <AppLayout onAddNewItem={handleNewTask}>
      <RewardsProvider>
        <TasksContent 
          isEditorOpen={isEditorOpen}
          setIsEditorOpen={setIsEditorOpen}
        />
      </RewardsProvider>
    </AppLayout>
  );
};

export default Tasks;
