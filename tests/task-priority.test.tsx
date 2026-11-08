import React, { useEffect } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, expect, it, vi } from 'vitest';
import { Form } from '@/components/ui/form';
import PrioritySelector from '@/components/task-editor/PrioritySelector';
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'default' }) }));
afterEach(cleanup);
it('updates the shared task/rule priority display after an editor resets to saved data', () => {
  function Editor({ priority }: { priority: string }) {
    const form = useForm({ defaultValues: { priority: 'medium' } });
    useEffect(() => { form.reset({ priority }); }, [priority, form]);
    return <Form {...form}><PrioritySelector control={form.control} /></Form>;
  }
  const view = render(<Editor priority="high" />);
  expect(screen.getByRole('combobox').textContent).toBe('High');
  view.rerender(<Editor priority="low" />); expect(screen.getByRole('combobox').textContent).toBe('Low');
});
