
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
    backgroundColor: 'rgba(245, 245, 209, 0.7)',
    padding: '1px 4px',
    borderRadius: '4px',
    display: 'inline',
    boxDecorationBreak: 'clone' as 'clone',
    WebkitBoxDecorationBreak: 'clone' as 'clone',
    width: 'fit-content',
    maxWidth: 'fit-content',
    lineHeight: '1.6'
  };

  if (highlight) {
    return (
      <span className="highlighter" style={{ ...highlighterStyle, color }}>
        {text}
      </span>
    );
  }

  return <span style={{ color }}>{text}</span>;
};

export default HighlightedText;
