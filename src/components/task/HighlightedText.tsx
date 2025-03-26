
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
  if (!highlight) {
    return <span style={{ color }}>{text}</span>;
  }

  const highlighterStyle: CSSProperties = {
    display: 'inline-block',
    backgroundColor: 'rgba(255, 255, 200, 0.25)',
    color: color,
    padding: '4px 8px',
    borderRadius: '6px',
    backdropFilter: 'blur(3px)',
    WebkitBackdropFilter: 'blur(3px)',
    boxShadow: '0 0 8px rgba(255, 255, 150, 0.5)',
    fontWeight: 'bold',
    lineHeight: 1.6,
  };

  return <span style={highlighterStyle}>{text}</span>;
};

export default HighlightedText;
