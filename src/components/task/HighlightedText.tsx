
import React from 'react';

interface HighlightedTextProps {
  text: string;
  highlight: boolean;
  color: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, highlight, color }) => {
  return (
    <span className={highlight ? 'bg-yellow-300 rounded px-1.5' : undefined} style={highlight ? { color } : { color }}>
      {text}
    </span>
  );
};

export default HighlightedText;

