
import React from 'react';
import { Card, CardContent } from '../ui/card';

interface EncyclopediaTileProps {
  title: string;
  subtext: string;
}

const EncyclopediaTile: React.FC<EncyclopediaTileProps> = ({ title, subtext }) => {
  return (
    <Card className="bg-navy border border-light-navy hover:border-cyan-800 transition-colors">
      <CardContent className="p-4">
        <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
        <p className="text-gray-300 text-sm">{subtext}</p>
      </CardContent>
    </Card>
  );
};

export default EncyclopediaTile;
