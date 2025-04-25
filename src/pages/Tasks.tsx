
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import TasksList from '../components/task/TasksList';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { TasksProvider, useTasks } from '../contexts/TasksContext';
import { Task } from '@/lib/taskUtils';

interface TasksContentProps {
  isEditorOpen: boolean;
  currentTask: Task | null;
  onCloseEditor: () => void;
  onEditTask: (task: Task) => void;
  onSaveTask: (taskData: Task) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onToggleCompletion: (taskId: string, completed: boolean) => Promise<void>;
}

const TasksContent: React.FC<TasksContentProps> = ({
  isEditorOpen,
  currentTask,
  onCloseEditor,
  onEditTask,
  onSaveTask,
  onDeleteTask,
  onToggleCompletion
}) => {
  const { tasks, isLoading } = useTasks();

  return (
    <div className="p-4 pt-6">
      <TasksHeader />

      <TasksList
        tasks={tasks}
        isLoading={isLoading}
        onEditTask={onEditTask}
        onToggleCompletion={onToggleCompletion}
      />

      <TaskEditor
        isOpen={isEditorOpen}
        onClose={onCloseEditor}
        taskData={currentTask || undefined}
        onSave={onSaveTask}
        onDelete={onDeleteTask}
      />
    </div>
  );
};

const Tasks: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const { saveTask, deleteTask, toggleTaskCompletion } = useTasks();

  const handleAddTask = () => {
    setCurrentTask(null);
    setIsEditorOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setCurrentTask(task);
    setIsEditorOpen(true);
  };

  const handleSaveTask = async (taskData: Task) => {
    try {
      await saveTask(taskData);
      setIsEditorOpen(false);
      setCurrentTask(null);
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setCurrentTask(null);
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  return (
    <AppLayout onAddNewItem={handleAddTask}>
      <RewardsProvider>
        <TasksProvider>
          <TasksContent
            isEditorOpen={isEditorOpen}
            currentTask={currentTask}
            onCloseEditor={() => {
              setIsEditorOpen(false);
              setCurrentTask(null);
            }}
            onEditTask={handleEditTask}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            onToggleCompletion={toggleTaskCompletion}
          />
        </TasksProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Tasks;
