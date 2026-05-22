import { useOperatorContext, DEFAULT_OPERATOR_ID } from "@/contexts/OperatorContext";

/**
 * Returns the current operator_id. OTC build is single-tenant, so this
 * is always DEFAULT_OPERATOR_ID; the hook is kept for compatibility
 * with hooks/components written against the platform's multi-tenant
 * API.
 */
export const useOperatorId = () => {
  const { operatorId } = useOperatorContext();
  return operatorId;
};

export { DEFAULT_OPERATOR_ID };
