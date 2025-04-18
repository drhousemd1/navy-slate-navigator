
import React, { useRef, useLayoutEffect, useState } from 'react';

interface Props {
  card: any;
  id: string;
  title: string;
  description: string;
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

    // Measure the card's height when reorderMode toggles (prevents jump)
    useLayoutEffect(() => {
      if (internalRef.current) {
        const height = internalRef.current.getBoundingClientRect().height;
        setMeasuredHeight(height);
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
        {/* Drag Banner */}
        {reorderMode && (
          <div className="drag-banner pointer-events-none absolute top-0 left-0 w-full h-6 bg-orange-500 text-xs text-white flex items-center px-2 z-10">
            ⬍ Drag to reorder
          </div>
        )}

        {/* Card Content */}
        <div className="p-4 pt-8">
          <h3 className="text-lg font-bold text-white">{card.title || 'New Card'}</h3>
          <p className="text-sm text-gray-300">{card.description || 'This is a new admin testing card.'}</p>
        </div>
      </div>
    );
  }
);

export default AdminTestingCard;

