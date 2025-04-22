import React from 'react';

interface HighlightedTextProps {
  text: string;
  highlight: boolean;
  color: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  highlight,
  color,
}) => {
  return (
    <span style={{ color: color, textShadow: highlight ? `0 0 8px ${color}` : 'none' }}>
      {text}
    </span>
  );
};

export default HighlightedText;