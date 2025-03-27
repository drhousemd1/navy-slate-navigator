
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const RulesHeader: React.FC = () => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-white">Rules</h1>
      <p className="text-nav-inactive mt-1">Create and manage house rules</p>
    </div>
  );
};

const Rules: React.FC = () => {
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  
  return (
    <AppLayout onAddNewItem={() => setIsAddRuleOpen(true)}>
      <div className="p-4 pt-6">
        <RulesHeader />
        
        <div className="space-y-4">
          <Card className="bg-navy border-light-navy shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-white flex justify-between items-center">
                <span>House Rules</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-nav-inactive hover:text-white"
                  onClick={() => setIsAddRuleOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rule
                </Button>
              </CardTitle>
            </CardHeader>
            <Separator className="bg-light-navy/30" />
            <CardContent className="pt-4">
              <div className="text-center py-8 text-nav-inactive">
                <p>No rules have been created yet.</p>
                <p className="text-sm mt-1">Click the "Add Rule" button to create your first rule.</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Example of a rule item (currently not displayed) */}
          <Collapsible className="bg-navy border border-light-navy rounded-lg overflow-hidden hidden">
            <CollapsibleTrigger className="w-full p-4 flex justify-between items-center text-white hover:bg-light-navy/20">
              <span>Example Rule Title</span>
              <span className="text-nav-inactive text-sm">Click to expand</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border-t border-light-navy/30 text-nav-inactive">
              <p>Example rule description would go here.</p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </AppLayout>
  );
};

export default Rules;
