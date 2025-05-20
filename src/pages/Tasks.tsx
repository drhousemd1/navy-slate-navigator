
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React, { useState } from 'react'; // Removed useCallback as it's not used
import { useTasksData, UseTasksDataResult } from '@/hooks/useTasksData';
import TaskCard from '@/components/TaskCard'; 
import TaskEditor from '@/components/TaskEditor';
import TasksHeader from '@/components/task/TasksHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { TaskWithId, CreateTaskVariables, UpdateTaskVariables } from '@/data/tasks/types';
import { useAuth } from '@/contexts/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

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
        await updateTask({ ...data, id: data.id } as UpdateTaskVariables); 
        toast({ title: "Task Updated", description: "Your task has been successfully updated." });
      } else { 
        // user_id must be part of CreateTaskVariables and provided here
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
  
  const handleDeleteTask = async (taskId: string) => { // Argument is string taskId
    try {
      await deleteTask(taskId); 
      toast({ title: "Task Deleted", description: "The task has been successfully deleted." });
      refetchTasks(); 
      // Consider if editor should close only if deleting the currently editing task
      if (editingTask?.id === taskId) {
        handleCloseEditor(); 
      }
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
    // task.user_id should be valid due to type and DB changes. Fallback to auth user.id if absolutely necessary.
    const currentTaskUserId = task.user_id || user.id; 
    if (!currentTaskUserId) {
      toast({ title: "User ID missing", description: "Cannot toggle task completion without a user ID.", variant: "destructive" });
      return;
    }
    try {
      await toggleTaskCompletion({ taskId: task.id, completed: !task.completed, points: task.points, userId: currentTaskUserId });
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
              // Pass individual props as expected by TaskCard
              // Note: TaskCard.tsx is read-only, ensure these props match its definition.
              // Assuming common props based on TaskWithId:
              id={task.id} // TaskCard might need id for internal operations or edit/delete triggers
              title={task.title || 'Untitled Task'}
              description={task.description}
              points={task.points}
              completed={task.completed}
              priority={task.priority}
              frequency={task.frequency}
              frequency_count={task.frequency_count}
              usage_data={task.usage_data || []}
              icon_name={task.icon_name}
              icon_color={task.icon_color}
              title_color={task.title_color}
              subtext_color={task.subtext_color}
              calendar_color={task.calendar_color}
              background_image_url={task.background_image_url}
              background_opacity={task.background_opacity}
              highlight_effect={task.highlight_effect}
              focal_point_x={task.focal_point_x}
              focal_point_y={task.focal_point_y}
              icon_url={task.icon_url}
              last_completed_date={task.last_completed_date}
              // actions:
              onEdit={() => handleOpenEditor(task)}
              onToggleComplete={() => handleToggleComplete(task)}
              // onDelete might be handled via onEdit then inside TaskEditor, or directly if TaskCard has delete button
            />
          ))}
        </div>
      )}

      {isEditorOpen && (
        <TaskEditor
          isOpen={isEditorOpen}
          onClose={handleCloseEditor}
          onSave={handleSaveTask}
          // Pass callback for onDelete, TaskEditor will call it with taskId string
          onDelete={editingTask?.id ? handleDeleteTask : undefined} 
          taskData={editingTask} // Pass the whole task object or undefined
          // userId prop removed as TaskEditor does not expect it
        />
      )}
    </div>
  );
};

export default Tasks;

