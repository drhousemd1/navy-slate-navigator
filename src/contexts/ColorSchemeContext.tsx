import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { COLOR_SCHEMES, ColorScheme, applyColorScheme, getColorScheme } from '@/lib/colorSchemes';

interface ColorSchemeContextType {
  currentScheme: string;
  applyScheme: (schemeName: string) => Promise<void>;
  isLoading: boolean;
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined);

export function useColorScheme() {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider');
  }
  return context;
}

interface ColorSchemeProviderProps {
  children: ReactNode;
}

export function ColorSchemeProvider({ children }: ColorSchemeProviderProps) {
  const { user } = useAuth();
  const [currentScheme, setCurrentScheme] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(true);

  // Load user's color scheme preference on mount
  useEffect(() => {
    async function loadColorScheme() {
      if (!user) {
        // For unauthenticated users, load from localStorage or use default
        const saved = localStorage.getItem('color-scheme');
        const scheme = saved || 'default';
        const schemeConfig = getColorScheme(scheme);
        if (schemeConfig) {
          applyColorScheme(schemeConfig);
          setCurrentScheme(scheme);
        }
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_color_schemes')
          .select('scheme_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading color scheme:', error);
        }

        const schemeName = data?.scheme_name || 'default';
        const scheme = getColorScheme(schemeName);
        
        if (scheme) {
          applyColorScheme(scheme);
          setCurrentScheme(schemeName);
        }
      } catch (error) {
        console.error('Error loading color scheme:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadColorScheme();
  }, [user]);

  const applyScheme = async (schemeName: string) => {
    const scheme = getColorScheme(schemeName);
    if (!scheme) return;

    // Apply the color scheme immediately
    applyColorScheme(scheme);
    setCurrentScheme(schemeName);

    if (user) {
      // Save to database for authenticated users
      try {
        const { error } = await supabase
          .from('user_color_schemes')
          .upsert({
            user_id: user.id,
            scheme_name: schemeName,
          });

        if (error) {
          console.error('Error saving color scheme:', error);
        }
      } catch (error) {
        console.error('Error saving color scheme:', error);
      }
    } else {
      // Save to localStorage for unauthenticated users
      localStorage.setItem('color-scheme', schemeName);
    }
  };

  return (
    <ColorSchemeContext.Provider
      value={{
        currentScheme,
        applyScheme,
        isLoading,
      }}
    >
      {children}
    </ColorSchemeContext.Provider>
  );
}