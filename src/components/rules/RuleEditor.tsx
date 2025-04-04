
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import DeleteRuleDialog from '@/components/rule-editor/DeleteRuleDialog';

interface Rule {
  id: string;
  title: string;
  description: string;
  points: number; // Changed from points_value to points
  created_at: string;
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: string | boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
}

interface RuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  ruleData: Rule | null;
  onSave: (ruleData: Partial<Rule>) => void;
  onDelete?: (ruleId: string) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({
  isOpen,
  onClose,
  ruleData,
  onSave,
  onDelete
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const form = useForm<Partial<Rule>>({
    defaultValues: {
      title: ruleData?.title || '',
      description: ruleData?.description || '',
      points: ruleData?.points || 10,
      icon_name: ruleData?.icon_name || '',
      title_color: ruleData?.title_color || '#FFFFFF',
      subtext_color: ruleData?.subtext_color || '#D1D5DB',
      calendar_color: ruleData?.calendar_color || '#7E69AB',
      icon_color: ruleData?.icon_color || '#FFFFFF',
      background_opacity: ruleData?.background_opacity || 100,
      focal_point_x: ruleData?.focal_point_x || 50,
      focal_point_y: ruleData?.focal_point_y || 50,
      // Ensure highlight_effect is converted to boolean
      highlight_effect: typeof ruleData?.highlight_effect === 'string' 
        ? ruleData.highlight_effect === 'true' 
        : Boolean(ruleData?.highlight_effect)
    }
  });

  React.useEffect(() => {
    if (isOpen && ruleData) {
      // Reset form with ruleData
      form.reset({
        title: ruleData.title || '',
        description: ruleData.description || '',
        points: ruleData.points || 10,
        icon_name: ruleData.icon_name || '',
        title_color: ruleData.title_color || '#FFFFFF',
        subtext_color: ruleData.subtext_color || '#D1D5DB',
        calendar_color: ruleData.calendar_color || '#7E69AB',
        icon_color: ruleData.icon_color || '#FFFFFF',
        background_opacity: ruleData.background_opacity || 100,
        focal_point_x: ruleData.focal_point_x || 50,
        focal_point_y: ruleData.focal_point_y || 50,
        // Ensure highlight_effect is converted to boolean
        highlight_effect: typeof ruleData.highlight_effect === 'string' 
          ? ruleData.highlight_effect === 'true' 
          : Boolean(ruleData.highlight_effect)
      });
    } else if (isOpen) {
      // Reset form for a new rule
      form.reset({
        title: '',
        description: '',
        points: 10,
        icon_name: '',
        title_color: '#FFFFFF',
        subtext_color: '#D1D5DB',
        calendar_color: '#7E69AB',
        icon_color: '#FFFFFF',
        background_opacity: 100,
        focal_point_x: 50,
        focal_point_y: 50,
        highlight_effect: false
      });
    }
  }, [isOpen, ruleData, form]);

  const handleSubmit = (data: Partial<Rule>) => {
    // Ensure highlight_effect is a boolean
    const formattedData = {
      ...data,
      highlight_effect: Boolean(data.highlight_effect)
    };
    onSave(formattedData);
  };

  const handleDelete = () => {
    if (ruleData?.id && onDelete) {
      onDelete(ruleData.id);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-navy border-light-navy text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {ruleData?.id ? 'Edit Rule' : 'Create New Rule'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {ruleData?.id 
                ? 'Update the details of this rule' 
                : 'Define a new rule to track'
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Rule title" 
                        className="bg-dark-navy border-light-navy text-white" 
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Rule description" 
                        className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Points Value</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        className="bg-dark-navy border-light-navy text-white" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="pt-4 flex justify-between">
                {ruleData?.id && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="border-light-navy text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {ruleData?.id ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="bg-navy border-light-navy text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete the rule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-dark-navy text-white border-light-navy">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RuleEditor;
