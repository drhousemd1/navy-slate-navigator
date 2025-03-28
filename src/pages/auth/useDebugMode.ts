
import { useState } from 'react';

export function useDebugMode() {
  const [debugMode, setDebugMode] = useState(false);
  const [titleClicks, setTitleClicks] = useState(0);
  
  const handleTitleClick = () => {
    setTitleClicks(prev => {
      if (prev === 4) {
        setDebugMode(!debugMode);
        return 0;
      }
      return prev + 1;
    });
  };

  return {
    debugMode,
    handleTitleClick
  };
}
