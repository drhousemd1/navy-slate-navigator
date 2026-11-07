import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { LOGO_CONFIG, LOGO_SIZES, type LogoSize } from '@/config/logoConfig';
import { useCurrentLogo } from '@/data/branding/queries';
import { logoSource } from '@/data/branding/schema';
import { supabaseBackendId } from '@/integrations/supabase/client';
interface AppLogoProps { size?: LogoSize; className?: string; alt?: string; onClick?: () => void; loading?: boolean }
export function LogoImage({ source, alt = 'App Logo', className = '' }: { source: string; alt?: string; className?: string }) {
  const [failure, setFailure] = useState({ source, step: 0 });
  const step = failure.source === source ? failure.step : 0;
  const candidates = [...new Set([source, LOGO_CONFIG.defaultLogoPath, LOGO_CONFIG.fallbackLogoPath])];
  if (step >= candidates.length) return <span role="img" aria-label={alt}>{alt}</span>;
  return <img src={candidates[step]} alt={alt} className={className} onError={() => setFailure({ source, step: step + 1 })} style={{ maxWidth: '100%', maxHeight: '100%' }} />;
}
export const AppLogo: React.FC<AppLogoProps> = ({ size = 'responsive', className, alt = 'App Logo', onClick, loading = false }) => {
  const current = useCurrentLogo();
  const sizeStyle = LOGO_SIZES[size];
  const classes = cn('flex items-center justify-center', onClick && 'cursor-pointer hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-cyan-500', className);
  const content = loading ? <span className="text-xs text-muted-foreground">Loading...</span> :
    <LogoImage source={logoSource(current.data?.version, supabaseBackendId)} alt={alt} className="w-full h-full object-contain" />;
  return onClick ? <button type="button" className={classes} onClick={onClick} style={{ width: sizeStyle, height: sizeStyle }}>{content}</button> :
    <div className={classes} style={{ width: sizeStyle, height: sizeStyle }}>{content}</div>;
};
export default AppLogo;
