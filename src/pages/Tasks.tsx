
import React, { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import TaskCard from '../components/TaskCard';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import { RewardsProvider } from '../contexts/RewardsContext';
import { useTasksQuery } from '../hooks/useTasksQuery';
import { Task } from '../lib/taskUtils';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

// Component for rendering skeleton loading state
const TaskSkeletons = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((n) => (
        <Skeleton key={n} className="h-48 bg-navy/50 rounded-lg border-2 border-[#00f0ff]/30" />
      ))}
    </div>
  );
};

interface TasksContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const TasksContent: React.FC<TasksContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isRenderReady, setIsRenderReady] = useState(false);
  const queryClient = useQueryClient();
  
  const { 
    tasks = [], 
    isLoading, 
    error, 
    saveTask, 
    toggleCompletion, 
    deleteTask 
  } = useTasksQuery();

  // Ensure a smooth transition from skeleton to actual content
  useEffect(() => {
    // Set render ready after a small delay or when tasks are loaded
    const timer = setTimeout(() => setIsRenderReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const handleNewTask = useCallback(() => {
    console.log("Creating new task");
    setCurrentTask(null);
    setIsEditorOpen(true);
  }, [setIsEditorOpen]);

  const handleEditTask = useCallback((task: Task) => {
    console.log("Editing task:", task);
    setCurrentTask(task);
    setIsEditorOpen(true);
  }, [setIsEditorOpen]);

  const handleSaveTask = useCallback(async (taskData: Task) => {
    try {
      console.log("Saving task:", taskData);
      const savedTask = await saveTask(taskData);
      
      if (savedTask) {
        setIsEditorOpen(false);
      }
    } catch (err) {
      console.error('Error saving task:', err);
    }
  }, [saveTask, setIsEditorOpen]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      console.log("Deleting task:", taskId);
      await deleteTask(taskId);
      setCurrentTask(null);
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  }, [deleteTask, setIsEditorOpen]);

  const handleToggleCompletion = useCallback(async (taskId: string, completed: boolean) => {
    try {
      console.log(`Toggling task ${taskId} completion to ${completed}`);
      await toggleCompletion(taskId, completed);
      
      if (completed) {
        const task = tasks.find(t => t.id === taskId);
        const points = task?.points || 0;
        console.log(`Task completed, earned ${points} points`);
        
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id || 'anonymous';
        
        // Log the completion to history
        const { error: insertError } = await supabase
          .from('task_completion_history')
          .insert({
            task_id: taskId,
            completed_at: new Date().toISOString(),
            user_id: userId
          });

        if (insertError) {
          console.error('Error inserting into task_completion_history:', insertError.message);
        } else {
          console.log('Logged task completion to history');
          // Make sure we invalidate weekly metrics data when a task is completed
          queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
        }
      }
    } catch (err) {
      console.error('Error toggling task completion:', err);
    }
  }, [toggleCompletion, tasks, queryClient]);

  // Prefetch images to improve perceived performance
  useEffect(() => {
    if (tasks && tasks.length > 0 && !isLoading) {
      tasks.forEach(task => {
        if (task && task.background_image_url) {
          const img = new Image();
          img.src = task.background_image_url;
        }
      });
    }
  }, [tasks, isLoading]);

  return (
    <div className="p-4 pt-6">
      <TasksHeader />
      
      {/* Show skeletons while loading or during initial render */}
      {(!isRenderReady || isLoading) ? (
        <TaskSkeletons />
      ) : error ? (
        <div className="text-center text-red-500 py-10">
          <p className="mb-2">Failed to load tasks</p>
          <p className="text-sm">{error.message}</p>
        </div>
      ) : (!tasks || tasks.length === 0) ? (
        <div className="text-center py-10">
          <p className="text-light-navy mb-4">No tasks found. Create your first task to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <div key={task.id} className="slow-fade-in">
              <TaskCard
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
            </div>
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
  
  const handleNewTask = useCallback(() => {
    console.log("Parent component triggering new task");
    setIsEditorOpen(true);
  }, []);
  
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
