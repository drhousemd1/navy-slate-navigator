
import { useState } from 'react';

export const useDeleteDialog = () => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return {
    isDeleteDialogOpen,
    setIsDeleteDialogOpen
  };
};
