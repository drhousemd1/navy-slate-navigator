import React, { useState } from 'react';
import TaskCard from '../TaskCard';
import TaskEditor from '../TaskEditor';
import TasksHeader from '../task/TasksHeader';
import { useRewards } from '@/contexts/RewardsContext';
import { 
  useTasksQuery, 
  useToggleTaskCompletion, 
  useSaveTask, 
  useDeleteTask
} from '@/data/TasksDataHandler';
import { Task } from '@/lib/taskUtils';

interface TasksContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const TasksContent: React.FC<TasksContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const {  } = useRewards();

  const { data: tasks = [], isLoading, error } = useTasksQuery();
  const saveTaskMutation = useSaveTask();
  const deleteTaskMutation = useDeleteTask();
  const toggleCompletionMutation = useToggleTaskCompletion();

  const handleNewTask = () => {
    setCurrentTask(null);
    setIsEditorOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setCurrentTask(task);
    setIsEditorOpen(true);
  };

  const handleSaveTask = async (taskData: Task) => {
    try {
      await saveTaskMutation.mutateAsync(taskData);
      setIsEditorOpen(false);
      setCurrentTask(null);
    } catch (err) {
      console.error('Error in handleSaveTask:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      setCurrentTask(null);
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Error in handleDeleteTask:', err);
    }
  };

  const handleToggleCompletion = async (taskId: string, completed: boolean) => {
    try {
      await toggleCompletionMutation.mutateAsync({ taskId, completed });
    } catch (err) {
      console.error("Error in handleToggleCompletion:", err);
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
              backgroundImages={task.background_images}
              sharedImageIndex={0}
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

export default TasksContent;
