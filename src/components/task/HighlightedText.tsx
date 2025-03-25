
import React, { CSSProperties } from 'react';

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
  const highlighterStyle: CSSProperties = {
    backgroundColor: 'rgba(245, 245, 209, 0.7)', // #F5F5D1 with 0.7 opacity
    padding: '1px 4px',
    borderRadius: '4px',
    display: 'inline-block',
    boxDecorationBreak: 'clone' as 'clone',
    WebkitBoxDecorationBreak: 'clone' as 'clone'
  };

  if (highlight) {
    return (
      <span style={{
        ...highlighterStyle,
        color
      }}>
        {text}
      </span>
    );
  }
  
  return <span style={{ color }}>{text}</span>;
};

export default HighlightedText;
