
import React from 'react';

interface HighlightedTextProps {
  text: string;
  highlight: boolean;
  color: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ 
  text, 
  highlight = false, 
  color = '#FFFFFF' 
}) => {
  if (!text) return null;
  
  if (!highlight) {
    return <span style={{ color }}>{text}</span>;
  }

  return (
    <span 
      style={{ 
        color, 
        textShadow: '0 0 5px currentColor, 0 0 10px currentColor',
        fontWeight: 'bold'
      }}
    >
      {text}
    </span>
  );
};

export default HighlightedText;
