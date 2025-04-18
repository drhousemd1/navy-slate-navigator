
import React, { useRef, useLayoutEffect, useState } from 'react';

interface Props {
  card: any;
  reorderMode: boolean;
  isDragging?: boolean;
  draggableProps?: any;
  dragHandleProps?: any;
  dragStyle?: React.CSSProperties;
}

const AdminTestingCard = React.forwardRef<HTMLDivElement, Props>(
  ({ card, reorderMode, isDragging, draggableProps, dragHandleProps, dragStyle }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

    useLayoutEffect(() => {
      if (internalRef.current) {
        setMeasuredHeight(internalRef.current.getBoundingClientRect().height);
      }
    }, [card, reorderMode]);

    return (
      <div
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as any).current = node;
        }}
        {...draggableProps}
        {...dragHandleProps}
        style={{
          ...dragStyle,
          ...(reorderMode && measuredHeight ? { height: measuredHeight } : {}),
        }}
        className={`card relative w-full ${reorderMode ? 'border-2 border-orange-400' : ''}`}
      >
        {reorderMode && (
          <div className="drag-banner pointer-events-none absolute top-0 left-0 w-full h-6 bg-orange-500 text-xs text-white flex items-center px-2 z-10">
            ⬍ Drag to reorder
          </div>
        )}
        <div className="p-4 pt-8">
          <h3 className="text-lg font-bold text-white">New Card</h3>
          <p className="text-sm text-gray-300">This is a new admin testing card.</p>
        </div>
      </div>
    );
  }
);

export default AdminTestingCard;
