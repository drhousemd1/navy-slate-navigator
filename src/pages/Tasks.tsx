
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import TasksList from '../components/task/TasksList';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { TasksProvider, useTasks } from '../contexts/TasksContext';
import { Task } from '@/lib/taskUtils';

const TasksContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const { tasks, isLoading, saveTask, deleteTask, toggleTaskCompletion } = useTasks();

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
      const savedTask = await saveTask(taskData);
      
      if (savedTask) {
        setIsEditorOpen(false);
        setCurrentTask(null);
      }
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const success = await deleteTask(taskId);
      
      if (success) {
        setCurrentTask(null);
        setIsEditorOpen(false);
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  return (
    <div className="p-4 pt-6">
      <TasksHeader />

      <TasksList
        tasks={tasks}
        isLoading={isLoading}
        onEditTask={handleEditTask}
        onToggleCompletion={toggleTaskCompletion}
      />

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
    setIsEditorOpen(true);
  };

  return (
    <AppLayout onAddNewItem={handleNewTask}>
      <RewardsProvider>
        <TasksProvider>
          <TasksContent />
        </TasksProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Tasks;
