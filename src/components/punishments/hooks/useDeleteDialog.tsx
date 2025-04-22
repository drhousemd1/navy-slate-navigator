
import { useState } from 'react';

export const useDeleteDialog = () => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const openDeleteDialog = () => setIsDeleteDialogOpen(true);
  const closeDeleteDialog = () => setIsDeleteDialogOpen(false);
  
  return {
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    openDeleteDialog,
    closeDeleteDialog
  };
};
