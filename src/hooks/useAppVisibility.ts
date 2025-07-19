import { useState, useEffect } from 'react';

export const useAppVisibility = () => {
  const [isAppVisible, setIsAppVisible] = useState(true);
  const [isAppFocused, setIsAppFocused] = useState(true);

  useEffect(() => {
    // Handle visibility change (tab switching, minimizing browser)
    const handleVisibilityChange = () => {
      setIsAppVisible(!document.hidden);
    };

    // Handle window focus/blur events
    const handleFocus = () => setIsAppFocused(true);
    const handleBlur = () => setIsAppFocused(false);

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Set initial state
    setIsAppVisible(!document.hidden);
    setIsAppFocused(document.hasFocus());

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // App is considered "active" if it's both visible and focused
  const isAppActive = isAppVisible && isAppFocused;

  return {
    isAppVisible,
    isAppFocused,
    isAppActive,
  };
};