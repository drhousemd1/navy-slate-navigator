import React, { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import { RewardsProvider } from '../contexts/RewardsContext';
import TaskCardVisual from '@/components/TaskCardVisual';
import TaskCard from '@/components/TaskCard';
import { useOptimizedTasksQuery } from '@/hooks/useOptimizedTasksQuery';
import { Skeleton } from '@/components/ui/skeleton';
import { Task } from '@/lib/taskUtils';
import { supabase } from '@/integrations/supabase/client';

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
  const [renderLogic, setRenderLogic] = useState(false);
  const [isRenderReady, setIsRenderReady] = useState(false);
  
  const { 
    tasks = [], 
    isLoading, 
    error,
    refetchTasks 
  } = useOptimizedTasksQuery();

  // Visual-first rendering
  useEffect(() => {
    const visualTimer = setTimeout(() => setIsRenderReady(true), 100);
    const logicTimer = setTimeout(() => setRenderLogic(true), 300);
    
    return () => {
      clearTimeout(visualTimer);
      clearTimeout(logicTimer);
    };
  }, []);

  const queryClient = useQueryClient();
  
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
      // const savedTask = await saveTask(taskData);
      // Temporarily remove saveTask usage
      setIsEditorOpen(false);
      refetchTasks();
      
      // if (savedTask) {
      //   setIsEditorOpen(false);
      // }
    } catch (err) {
      console.error('Error saving task:', err);
    }
  }, [setIsEditorOpen, refetchTasks]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      console.log("Deleting task:", taskId);
      // await deleteTask(taskId);
      // Temporarily remove deleteTask usage
      setCurrentTask(null);
      setIsEditorOpen(false);
      refetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  }, [setIsEditorOpen, refetchTasks]);

  const handleToggleCompletion = useCallback(async (taskId: string, completed: boolean) => {
    try {
      console.log(`Toggling task ${taskId} completion to ${completed}`);
      // await toggleCompletion(taskId, completed);
      // Temporarily remove toggleCompletion usage
      
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
      refetchTasks();
    } catch (err) {
      console.error('Error toggling task completion:', err);
    }
  }, [tasks, queryClient, refetchTasks]);

  // Prefetch images to improve perceived performance
  useEffect(() => {
    if (tasks?.length > 0 && !isLoading) {
      tasks.forEach(task => {
        if (task?.background_image_url) {
          const img = new Image();
          img.src = task.background_image_url;
        }
      });
    }
  }, [tasks, isLoading]);

  return (
    <div className="p-4 pt-6">
      <TasksHeader />
      
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
              {renderLogic ? (
                <TaskCard
                  {...task}
                  onEdit={() => handleEditTask(task)}
                  onToggleCompletion={(completed) => handleToggleCompletion(task.id, completed)}
                />
              ) : (
                <TaskCardVisual {...task} />
              )}
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
