
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React, { useState, useCallback } from 'react';
import { useTasksData, UseTasksDataResult } from '@/hooks/useTasksData';
import TaskCard from '@/components/TaskCard'; // Assuming TaskCardProps expects 'task'
import TaskEditor from '@/components/TaskEditor';
import TasksHeader from '@/components/task/TasksHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { TaskWithId, CreateTaskVariables, UpdateTaskVariables } from '@/data/tasks/types';
import { useAuth } from '@/contexts/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
// import { TaskCardProps } from '@/components/TaskCard'; // Check if TaskCardProps needs to be imported for typing

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const { 
    tasks, 
    isLoading, 
    error, 
    createTask, 
    updateTask, 
    deleteTask, 
    toggleTaskCompletion,
    refetchTasks 
  }: UseTasksDataResult = useTasksData();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithId | undefined>(undefined);

  const handleOpenEditor = (task?: TaskWithId) => {
    setEditingTask(task);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditingTask(undefined);
    setIsEditorOpen(false);
  };

  const handleSaveTask = async (data: CreateTaskVariables | UpdateTaskVariables) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to save tasks.", variant: "destructive" });
      return;
    }

    try {
      if ('id' in data && data.id) { 
        await updateTask(data as UpdateTaskVariables); 
        toast({ title: "Task Updated", description: "Your task has been successfully updated." });
      } else { 
        const taskDataWithUser = { ...data, user_id: user.id } as CreateTaskVariables;
        await createTask(taskDataWithUser); 
        toast({ title: "Task Created", description: "Your new task has been successfully created." });
      }
      refetchTasks(); 
      handleCloseEditor();
    } catch (e: any) {
      toast({ title: "Save Failed", description: e.message || "Could not save the task.", variant: "destructive" });
      console.error("Failed to save task:", e);
    }
  };
  
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId); // Pass taskId directly as a string
      toast({ title: "Task Deleted", description: "The task has been successfully deleted." });
      refetchTasks(); 
      handleCloseEditor(); 
    } catch (e: any) {
      toast({ title: "Delete Failed", description: e.message || "Could not delete the task.", variant: "destructive" });
      console.error("Failed to delete task:", e);
    }
  };

  const handleToggleComplete = async (task: TaskWithId) => {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive"});
        return;
    }
    try {
      // Pass userId explicitly if toggleTaskCompletionMutation needs it and cannot get it from task object reliably
      await toggleTaskCompletion({ taskId: task.id, completed: !task.completed, points: task.points, userId: task.user_id || user.id });
      toast({ title: "Task Status Updated", description: `Task marked as ${!task.completed ? 'complete' : 'incomplete'}.` });
    } catch (e: any)
    {
      toast({ title: "Update Failed", description: e.message || "Could not update task completion.", variant: "destructive"});
      console.error("Failed to toggle task completion:", e);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 bg-background text-foreground min-h-screen">
        {/* TasksHeader no longer takes onAddTask. Task count and completed count are fine. */}
        <TasksHeader taskCount={0} completedCount={0} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[200px] w-full rounded-lg bg-muted" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading tasks: {error.message}</div>;
  }

  const completedCount = tasks.filter(task => task.completed).length;

  return (
    <div className="container mx-auto p-4 md:p-6 bg-background text-foreground min-h-screen">
      {/* TasksHeader no longer takes onAddTask. */}
      <TasksHeader taskCount={tasks.length} completedCount={completedCount} />
      
      {tasks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-xl text-muted-foreground mb-4">No tasks yet. Get started by adding one!</p>
          <Button onClick={() => handleOpenEditor()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-6">
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} // Assuming TaskCard expects 'task' prop
              onEdit={() => handleOpenEditor(task)}
              onToggleComplete={() => handleToggleComplete(task)} 
            />
          ))}
        </div>
      )}

      {isEditorOpen && (
        <TaskEditor
          isOpen={isEditorOpen}
          onClose={handleCloseEditor}
          onSave={handleSaveTask}
          onDelete={editingTask ? handleDeleteTask : undefined} // Pass string taskId
          taskData={editingTask}
          // userId prop removed as TaskEditor does not expect it
        />
      )}
    </div>
  );
};

export default Tasks;
