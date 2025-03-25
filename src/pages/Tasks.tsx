
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import TaskCard from '../components/TaskCard';
import TaskEditor from '../components/TaskEditor';

// Define the Task interface
interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  completed?: boolean;
}

const Tasks: React.FC = () => {
  // Example task data
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Reading',
      description: 'Read for at least 20 minutes',
      points: 5,
      completed: false,
    }
  ]);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  const handleEditTask = (task: Task) => {
    setCurrentTask(task);
    setIsEditorOpen(true);
  };

  const handleSaveTask = (taskData: any) => {
    if (currentTask) {
      // Update existing task
      setTasks(tasks.map(task => 
        task.id === currentTask.id 
          ? { ...task, ...taskData } 
          : task
      ));
    } else {
      // Add new task
      const newTask: Task = {
        id: Date.now().toString(),
        title: taskData.title,
        description: taskData.description,
        points: taskData.points,
        completed: false,
      };
      setTasks([...tasks, newTask]);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-semibold text-white mb-6">My Tasks</h1>
        
        {/* Display all tasks */}
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            title={task.title}
            description={task.description}
            points={task.points}
            completed={task.completed}
            onEdit={() => handleEditTask(task)}
          />
        ))}

        {/* Task Editor Modal */}
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
