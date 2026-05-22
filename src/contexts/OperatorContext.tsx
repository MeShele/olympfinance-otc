import { createContext, useContext, type ReactNode } from "react";

/**
 * Single-tenant version of OperatorContext.
 *
 * The platform build resolves an operator out of `operator_domains` by
 * `window.location.hostname`. OTC has exactly one tenant, so the whole
 * resolver is replaced with a constant. The shape is preserved so the
 * existing useOperatorId / useOperatorContext call sites compile
 * without changes.
 */

const DEFAULT_OPERATOR_ID = "00000000-0000-0000-0000-000000000001";

interface OperatorContextValue {
  operatorId: string;
  isResolved: boolean;
  isLoading: boolean;
  notFound: boolean;
}

const OperatorContext = createContext<OperatorContextValue>({
  operatorId: DEFAULT_OPERATOR_ID,
  isResolved: true,
  isLoading: false,
  notFound: false,
});

export const useOperatorContext = () => useContext(OperatorContext);

export function OperatorProvider({ children }: { children: ReactNode }) {
  return (
    <OperatorContext.Provider
      value={{
        operatorId: DEFAULT_OPERATOR_ID,
        isResolved: true,
        isLoading: false,
        notFound: false,
      }}
    >
      {children}
    </OperatorContext.Provider>
  );
}

export { DEFAULT_OPERATOR_ID };
