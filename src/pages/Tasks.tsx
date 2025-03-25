
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import TaskCard from '../components/TaskCard';
import { useToast } from "@/hooks/use-toast";
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TaskEditor from '@/components/TaskEditor';

interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  frequency?: {
    type: 'daily' | 'weekly';
    count: number;
  };
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  icon?: string;
  titleColor?: string;
  subtextColor?: string;
  calendarColor?: string;
  highlighterEffect?: boolean;
}

const Tasks: React.FC = () => {
  const { toast } = useToast();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Load tasks from localStorage on initial render
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
      try {
        return JSON.parse(savedTasks);
      } catch (e) {
        console.error("Failed to parse saved tasks:", e);
        return [
          {
            id: '1',
            title: 'Reading',
            description: 'Read for at least 20 minutes',
            points: 5,
            completed: false
          }
        ];
      }
    }
    return [
      {
        id: '1',
        title: 'Reading',
        description: 'Read for at least 20 minutes',
        points: 5,
        completed: false
      }
    ];
  });

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    toast({
      title: "Task deleted",
      description: "The task has been successfully deleted.",
      variant: "default",
    });
  };

  const handleEditTask = (taskId: string) => {
    console.log("Editing task with ID in Tasks.tsx:", taskId); // Enhanced debug log
    setEditingTaskId(taskId);
  };

  const handleSaveTask = (updatedTask: Task) => {
    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    
    toast({
      title: "Task updated",
      description: "Your changes have been saved successfully.",
      variant: "default",
    });
    
    // Close editor after saving
    setEditingTaskId(null);
  };

  const handleAddTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: 'New Task',
      description: 'Task description',
      points: 1,
      completed: false
    };
    
    setTasks([...tasks, newTask]);
    setEditingTaskId(newTask.id);
  };

  // Find the task being edited (if any)
  const taskBeingEdited = tasks.find(task => task.id === editingTaskId);

  console.log("Current editing task ID:", editingTaskId); // Debug log
  console.log("Task being edited:", taskBeingEdited); // Debug log

  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-white">My Tasks</h1>
          <Button 
            onClick={handleAddTask}
            className="bg-nav-active hover:bg-nav-active/90 text-white"
          >
            <Plus className="w-4 h-4 mr-1" /> New Task
          </Button>
        </div>
        
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={() => handleDeleteTask(task.id)}
            onEdit={() => handleEditTask(task.id)}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center text-nav-inactive py-8">
            No tasks available. Add a new task to get started.
          </div>
        )}
        
        {/* Task editor - making sure it always shows when a task is being edited */}
        {taskBeingEdited && (
          <TaskEditor
            task={taskBeingEdited}
            open={!!editingTaskId}
            onOpenChange={(open) => {
              if (!open) setEditingTaskId(null);
            }}
            onSave={handleSaveTask}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Tasks;
