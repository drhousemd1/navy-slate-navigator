
import React from 'react';
import { Card as ShadcnCard, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const CardComponent: React.FC<CardProps> = ({ children, title, className }) => {
  return (
    <ShadcnCard className={`bg-navy border border-light-navy rounded-lg ${className || ''}`}>
      {title && (
        <CardHeader className="border-b border-light-navy">
          <CardTitle className="text-white text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-4" : "p-4"}>
        {children}
      </CardContent>
    </ShadcnCard>
  );
};

// Named export for consistency with shadcn/ui patterns
export { CardComponent as Card };
