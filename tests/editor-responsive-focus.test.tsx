import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'default' }) }));

// Keep the production editor shells and their actual responsive/focus hooks.
// Form storage/business behavior is outside this keyboard lifecycle regression.
vi.mock('@/components/TaskEditorForm', () => ({ default: () => <><input aria-label="Task title" /><button>Save task</button></> }));
vi.mock('@/components/rule-editor/RuleEditorForm', () => ({ default: () => <><input aria-label="Rule title" /><button>Save rule</button></> }));
import TaskEditor from '@/components/TaskEditor';
import RuleEditor from '@/components/RuleEditor';

const originalWidth = window.innerWidth;
afterEach(() => { cleanup(); Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth }); });

describe.each([320, 768])('fresh editor keyboard lifecycle at %ipx', width => {
  it.each(['task', 'rule'] as const)('returns to the %s card opener after Escape', async kind => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    const user = userEvent.setup();
    function CardEditor() {
      const [open, setOpen] = useState(false);
      const close = () => setOpen(false);
      return <><button onClick={() => setOpen(true)}>Edit {kind}</button>
        {kind === 'task'
          ? <TaskEditor key={`fixture-task:${open}`} isOpen={open} onClose={close}
              taskData={{ id: 'fixture-task', title: 'Fixture task' }} onSave={async () => {}} />
          : open && <RuleEditor isOpen onClose={close} ruleData={{ id: 'fixture-rule', title: 'Fixture rule' }} onSave={async () => {}} />}
      </>;
    }
    render(<CardEditor />);
    const opener = screen.getByRole('button', { name: `Edit ${kind}` });
    await user.tab();
    expect(document.activeElement).toBe(opener);
    await user.keyboard('{Enter}');
    await screen.findByRole('dialog');
    await user.tab();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});
