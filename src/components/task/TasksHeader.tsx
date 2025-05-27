
import React from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins } from 'lucide-react';

import { useUserIds } from '@/contexts/UserIdsContext';
import { useUserPointsQuery } from '@/data/points/useUserPointsQuery';
import { useUserDomPointsQuery } from '@/data/points/useUserDomPointsQuery';
import { useSubRewardTypesCountQuery } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { useDomRewardTypesCountQuery } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

// Define props for TasksHeader
interface TasksHeaderProps {
  onAddNewTask: () => void; // As it's used in Tasks.tsx
}

const TasksHeader: React.FC<TasksHeaderProps> = ({ onAddNewTask }) => {
  const { subUserId, domUserId } = useUserIds();

  const { data: subPoints } = useUserPointsQuery(subUserId);
  const { data: domPoints } = useUserDomPointsQuery(domUserId);
  const { data: subRewardTypesCount } = useSubRewardTypesCountQuery();
  const { data: domRewardTypesCount } = useDomRewardTypesCountQuery();
  
  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  // The onAddNewTask prop is not used visually in this header component,
  // but it's passed down from Tasks.tsx to potentially be used by a button if added here.
  // For now, it's just satisfying the prop type. If TasksHeader itself has an "Add" button,
  // it would use this `onAddNewTask`. The current "Add" button is managed in AppLayout/TasksPageContent.
  // The `onAddNewTask` prop on TasksHeader in `Tasks.tsx` seems to be connected to the one from `TasksPageContent`'s `TasksHeader`.
  // The `TasksHeader` in `TasksPageContent` *does* use `onAddNewTask` for its button.
  // The structure is:
  // Tasks (AppLayout onAddNewItem -> TasksPageContent.handleAddTaskEvent -> TasksPageContent.handleAddTask)
  // TasksPageContent (renders its own TasksHeader, passing its own handleAddTask)

  // It seems the TasksHeader component used in TasksPageContent is *this* one.
  // So, adding the button here and using onAddNewTask is correct.

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Tasks</h1>
      {/* If the "Add New Task" button associated with this header should be here, it would use onAddNewTask */}
      {/* Example: <Button onClick={onAddNewTask}>Add New</Button> */}
      {/* However, the `TasksHeader` in `TasksPageContent` already receives `onAddNewTask` and uses it. */}
      {/* The error was that this component definition didn't *expect* `onAddNewTask`. Now it does. */}
      <div className="flex items-center gap-2 ml-auto">
        <Badge 
          className="text-white font-bold px-3 py-1 flex items-center gap-1"
          style={badgeStyle}
        >
          <Box className="w-3 h-3" />
          <span>{subRewardTypesCount ?? 0}</span>
        </Badge>
        <Badge 
          className="text-white font-bold px-3 py-1 flex items-center gap-1"
          style={badgeStyle}
        >
          <Coins className="w-3 h-3" />
          <span>{subPoints ?? 0}</span>
        </Badge>
        <DOMBadge icon="box" value={domRewardTypesCount ?? 0} />
        <DOMBadge icon="crown" value={domPoints ?? 0} />
      </div>
    </div>
  );
};

export default TasksHeader;
