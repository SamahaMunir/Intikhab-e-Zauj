import { useCallback, useEffect, useState } from 'react';
import proposalService, { type Proposal, type CreateProposalInput } from '../services/proposalService';
import { useToast } from './use-toast';

export interface UseProposal {
  proposal: Proposal | null;
  loading: boolean;
  acting: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  respond: (action: 'accept' | 'decline') => Promise<void>;
  withdraw: () => Promise<void>;
  interest: (side?: 'initiator' | 'recipient') => Promise<void>;
}

/**
 * Fetch + manage a single proposal. Wraps proposalService and surfaces toasts
 * on every action's success/failure. Re-fetches after each mutation.
 */
export function useProposal(id: string): UseProposal {
  const { toast } = useToast();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await proposalService.get(id);
      setProposal(res.proposal);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load proposal');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  const run = useCallback(async (fn: () => Promise<any>, okMsg: string) => {
    setActing(true);
    try {
      await fn();
      await refresh();
      toast({ title: okMsg });
    } catch (e) {
      toast({ title: 'Action failed', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setActing(false);
    }
  }, [refresh, toast]);

  return {
    proposal, loading, acting, error, refresh,
    respond: (action) => run(() => proposalService.respond(id, action), action === 'accept' ? 'Proposal accepted' : 'Proposal declined'),
    withdraw: () => run(() => proposalService.withdraw(id), 'Proposal withdrawn'),
    interest: (side) => run(() => proposalService.interest(id, side), 'Interest registered'),
  };
}

/**
 * Create a proposal with toast feedback. Returns the created proposal id or null.
 */
export function useCreateProposal() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const create = useCallback(async (input: CreateProposalInput): Promise<string | null> => {
    setSubmitting(true);
    try {
      const res = await proposalService.create(input);
      toast({ title: 'Proposal sent' });
      return res.proposalId;
    } catch (e) {
      toast({ title: 'Could not send proposal', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [toast]);

  return { create, submitting };
}
