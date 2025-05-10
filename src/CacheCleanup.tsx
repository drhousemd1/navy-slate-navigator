
import { useEffect } from 'react';
import { clearAppCache } from './lib/utils';

/**
 * Component that handles cache cleanup on application initialization
 */
const CacheCleanup: React.FC = () => {
  useEffect(() => {
    console.log('CacheCleanup: Clearing stale localStorage cache data');
    clearAppCache();
  }, []);
  
  return null; // Renders nothing
};

export default CacheCleanup;
