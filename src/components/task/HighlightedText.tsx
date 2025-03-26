
import React from 'react';

interface HighlightedTextProps {
  text: string;
  highlight: boolean;
  color: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  highlight,
  color
}) => {
  if (!highlight) return <span style={{ color }}>{text}</span>;

  return (
    <span
      style={{
        backgroundColor: 'rgba(255, 255, 160, 0.4)',
        padding: '2px 6px',
        borderRadius: '4px',
        color,
        display: 'inline',
        lineHeight: '1.5',
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
      }}
    >
      {text}
    </span>
  );
};

export default HighlightedText;
