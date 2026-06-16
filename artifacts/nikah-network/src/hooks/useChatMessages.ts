import { useCallback, useEffect, useState } from 'react';
import proposalService, { type ChatMessage } from '../services/proposalService';
import { useToast } from './use-toast';

export interface UseChatMessages {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  send: (text: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Chat thread for a proposal. Fetches on mount, polls every 8s while `enabled`,
 * and sends messages through the proposal API. Toasts on send failure.
 */
export function useChatMessages(proposalId: string, enabled: boolean): UseChatMessages {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await proposalService.getMessages(proposalId);
      setMessages(res.messages || []);
    } catch {
      /* chat may be closed — leave messages as-is */
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [enabled, refresh]);

  const send = useCallback(async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    setSending(true);
    try {
      await proposalService.sendMessage(proposalId, trimmed);
      await refresh();
      return true;
    } catch (e) {
      toast({ title: 'Message not sent', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
      return false;
    } finally {
      setSending(false);
    }
  }, [proposalId, refresh, toast]);

  return { messages, loading, sending, send, refresh };
}
