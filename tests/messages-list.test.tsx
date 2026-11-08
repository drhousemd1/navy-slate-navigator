vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'default' }) }));
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://backend.invalid', supabase: { auth: { getSession: vi.fn() } } }));
vi.mock('@/components/messages/MessageItem', () => ({ default: ({ message }) => <div data-message-id={message.id} data-incoming-unread={message.author === 'partner' && message.readStatus !== 'read' ? 'true' : undefined}>{message.content}</div> }));
import MessageList from '@/components/messages/MessageList';
import { conversation, message, scope, uuid } from './messages.helpers';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('message list visibility and scrolling', () => {
  it('acknowledges only viewport-visible incoming messages while the document is visible', () => {
    const callbacks: IntersectionObserverCallback[] = [];
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { callbacks.push(callback); } observe() {} disconnect() {} });
    const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible'); const displayed = vi.fn();
    render(<MessageList messages={[message(10), message(11)]} scope={scope} conversation={conversation} loadingOlder={false} hasOlder={false} loadOlder={vi.fn()} onDisplayed={displayed} readError={null} />);
    const first = screen.getByText('Synthetic 10');
    callbacks[0]([{ target: first, isIntersecting: true, intersectionRect: { height: 40 } } as any], {} as any);
    expect(displayed).toHaveBeenLastCalledWith([uuid(10)]); expect(displayed.mock.calls.flat(2)).not.toContain(uuid(11));
    visible.mockReturnValue('hidden'); displayed.mockClear(); callbacks[0]([{ target: first, isIntersecting: true, intersectionRect: { height: 40 } } as any], {} as any); expect(displayed).not.toHaveBeenCalled();
    visible.mockReturnValue('visible'); document.dispatchEvent(new Event('visibilitychange')); expect(displayed).toHaveBeenCalledWith([uuid(10)]);
  });
  it('preserves the viewport on prepend and does not jump down for incoming messages while reading older history', () => {
    const displayed = vi.fn(); const props = { scope, conversation, loadingOlder: false, hasOlder: true, loadOlder: vi.fn(), onDisplayed: displayed, readError: null };
    const view = render(<MessageList {...props} messages={[message(20), message(21)]} />);
    const log = screen.getByRole('log').querySelector('[data-radix-scroll-area-viewport]') as HTMLElement; let height = 500;
    Object.defineProperty(log, 'scrollHeight', { configurable: true, get: () => height }); Object.defineProperty(log, 'clientHeight', { configurable: true, value: 100 });
    log.scrollTop = 150; fireEvent.scroll(log);
    height = 700; view.rerender(<MessageList {...props} messages={[message(10), message(20), message(21)]} />); expect(log.scrollTop).toBe(350);
    height = 800; view.rerender(<MessageList {...props} messages={[message(10), message(20), message(21), message(30)]} />); expect(log.scrollTop).toBe(350);
    log.scrollTop = 700; fireEvent.scroll(log); height = 900; view.rerender(<MessageList {...props} messages={[message(10), message(20), message(21), message(30), message(31)]} />); expect(log.scrollTop).toBe(900);
  });
});
