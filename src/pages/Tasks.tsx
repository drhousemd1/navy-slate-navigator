
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import TaskCard from '../components/TaskCard';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import { RewardsProvider } from '../contexts/RewardsContext';
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
  const [sharedImageIndex, setSharedImageIndex] = useState(0);
  const [carouselTimer, setCarouselTimer] = useState(5);
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: fetchTasks
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSharedImageIndex((prev) => prev + 1);
    }, carouselTimer * 1000);

    return () => clearInterval(interval);
  }, [carouselTimer]);

  const handleSaveTask = async (task: Task) => {
    try {
      await saveTask(task);
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Task saved successfully' });
    } catch {
      toast({ title: 'Error saving task', variant: 'destructive' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Task deleted successfully' });
    } catch {
      toast({ title: 'Error deleting task', variant: 'destructive' });
    }
  };

  const updateCarouselTimer = (time: number) => {
    setCarouselTimer(time);
  };

  return (
    <div className="p-4 pt-6">
      <TasksHeader onCreate={() => setIsEditorOpen(true)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={() => {
              setCurrentTask(task);
              setIsEditorOpen(true);
            }}
            onComplete={async () => {
              const now = new Date();
              const today = getLocalDateString(now);
              const completed = wasCompletedToday(task, today);

              await updateTaskCompletion(task.id, !completed, today);
              await queryClient.invalidateQueries({ queryKey: ['tasks'] });
            }}
            sharedImageIndex={sharedImageIndex}
          />
        ))}
      </div>
      <TaskEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setCurrentTask(null);
        }}
        taskData={currentTask || undefined}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        updateCarouselTimer={updateCarouselTimer}
        sharedImageIndex={sharedImageIndex}
      />
    </div>
  );
};

const TasksPage: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  return (
    <AppLayout>
      <RewardsProvider>
        <TasksContent isEditorOpen={isEditorOpen} setIsEditorOpen={setIsEditorOpen} />
      </RewardsProvider>
    </AppLayout>
  );
};

export default TasksPage;
