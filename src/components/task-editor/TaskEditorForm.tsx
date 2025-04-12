
interface TaskEditorFormProps {
  taskData?: Partial<Task>;
  onSave: (taskData: any) => void;
  onDelete?: (taskId: string) => void;
  onCancel: () => void;
  initialCarouselTimer?: number;  // Add this line
  updateCarouselTimer?: (timer: number) => void;  // Ensure this is also present
}
