import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorId } from "@/hooks/useOperatorId";

interface ApprovalContextValue {
  isApproved: boolean;
  isLoading: boolean;
}

const ApprovalContext = createContext<ApprovalContextValue>({
  isApproved: false,
  isLoading: true,
});

export const useApproval = () => useContext(ApprovalContext);

export function ApprovalProvider({ children }: { children: ReactNode }) {
  const operatorId = useOperatorId();

  const { data: isApproved = false, isLoading } = useQuery({
    queryKey: ["operator-approval", operatorId],
    queryFn: async () => {
      // SECURITY DEFINER RPC — returns boolean only, so we can probe the
      // flag before the visitor logs in (RLS on public.operators is
      // intentionally locked to the operator's own users/admins).
      const { data, error } = await supabase.rpc("is_operator_approved", {
        _operator_id: operatorId,
      });
      // Fail-closed: a failed approval lookup must not unlock the exchange —
      // the pending-approval screen stays up until is_approved = true.
      if (error) return false;
      return (data as boolean | null) ?? false;
    },
    enabled: !!operatorId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <ApprovalContext.Provider value={{ isApproved, isLoading }}>
      {children}
    </ApprovalContext.Provider>
  );
}
