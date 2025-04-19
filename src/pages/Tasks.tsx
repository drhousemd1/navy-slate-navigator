
import React, { useState, useCallback, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import { RewardsProvider } from '../contexts/RewardsContext';
import TaskCardVisual from '@/components/TaskCardVisual';
import TaskCard from '@/components/TaskCard';
import { useOptimizedTasksQuery } from '@/hooks/useOptimizedTasksQuery';
import { Skeleton } from '@/components/ui/skeleton';
import { Task } from '@/lib/taskUtils';

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

const DEFAULT_TASK_VALUES: Partial<Task> = {
  points: 0,
  completed: false,
  priority: 'medium',
  frequency: 'daily',
  icon_color: '#9b87f5',
  title_color: '#FFFFFF',
  subtext_color: '#8E9196',
  calendar_color: '#7E69AB',
  background_opacity: 100,
  focal_point_x: 50,
  focal_point_y: 50,
};

const TasksContent: React.FC<TasksContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [renderLogic, setRenderLogic] = useState(false);
  const [isRenderReady, setIsRenderReady] = useState(false);
  
  const { tasks = [], isLoading, error, refetchTasks } = useOptimizedTasksQuery();

  // Staged rendering for better performance
  useEffect(() => {
    const visualTimer = setTimeout(() => setIsRenderReady(true), 100);
    const logicTimer = setTimeout(() => setRenderLogic(true), 300);
    
    return () => {
      clearTimeout(visualTimer);
      clearTimeout(logicTimer);
    };
  }, []);

  const handleNewTask = useCallback(() => {
    setCurrentTask(null);
    setIsEditorOpen(true);
  }, [setIsEditorOpen]);

  const handleEditTask = useCallback((task: Task) => {
    setCurrentTask(task);
    setIsEditorOpen(true);
  }, [setIsEditorOpen]);

  const handleSaveTask = useCallback(async (taskData: Task) => {
    try {
      setIsEditorOpen(false);
      refetchTasks();
    } catch (err) {
      console.error('Error saving task:', err);
    }
  }, [setIsEditorOpen, refetchTasks]);

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
          {tasks.map(task => {
            const fullTask = { ...DEFAULT_TASK_VALUES, ...task };
            
            return (
              <div key={fullTask.id} className="slow-fade-in">
                {renderLogic ? (
                  <TaskCard
                    {...fullTask}
                    onEdit={() => handleEditTask(fullTask)}
                    onToggleCompletion={(completed) => {
                      console.log('Toggle completion:', task.id, completed);
                      refetchTasks();
                    }}
                  />
                ) : (
                  <TaskCardVisual 
                    title={fullTask.title}
                    description={fullTask.description || ''}
                    background_image_url={fullTask.background_image_url}
                    background_opacity={fullTask.background_opacity}
                    focal_point_x={fullTask.focal_point_x}
                    focal_point_y={fullTask.focal_point_y}
                    priority={fullTask.priority}
                    points={fullTask.points}
                    icon_url={fullTask.icon_url}
                    icon_name={fullTask.icon_name}
                    title_color={fullTask.title_color}
                    subtext_color={fullTask.subtext_color}
                    icon_color={fullTask.icon_color}
                  />
                )}
              </div>
            );
          })}
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
  );
};

const Tasks: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const handleNewTask = useCallback(() => {
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
