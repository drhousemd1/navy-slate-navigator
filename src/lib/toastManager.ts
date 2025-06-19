
import { toast } from '@/hooks/use-toast';

interface ToastState {
  lastMessage: string;
  lastTimestamp: number;
}

class ToastManager {
  private lastToast: ToastState = { lastMessage: '', lastTimestamp: 0 };
  private readonly DUPLICATE_THRESHOLD = 2000; // 2 seconds

  private isDuplicate(message: string): boolean {
    const now = Date.now();
    const timeDiff = now - this.lastToast.lastTimestamp;
    
    if (this.lastToast.lastMessage === message && timeDiff < this.DUPLICATE_THRESHOLD) {
      return true;
    }
    
    this.lastToast = { lastMessage: message, lastTimestamp: now };
    return false;
  }

  success(title: string, description?: string) {
    const message = `${title}${description ? `: ${description}` : ''}`;
    if (this.isDuplicate(message)) return;
    
    toast({
      title,
      description,
    });
  }

  error(title: string, description?: string) {
    const message = `ERROR: ${title}${description ? `: ${description}` : ''}`;
    if (this.isDuplicate(message)) return;
    
    toast({
      title,
      description,
      variant: 'destructive',
    });
  }

  info(title: string, description?: string) {
    const message = `INFO: ${title}${description ? `: ${description}` : ''}`;
    if (this.isDuplicate(message)) return;
    
    toast({
      title,
      description,
    });
  }
}

export const toastManager = new ToastManager();
