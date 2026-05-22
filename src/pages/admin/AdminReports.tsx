import { useAllCurrencies } from "@/hooks/useAllCurrencies";
import ReportGenerator from "@/components/admin/ReportGenerator";
import { RequirePermission } from "@/components/admin/RequirePermission";

export default function AdminReports() {
  const { data: currencies = [] } = useAllCurrencies();

  return (
    <RequirePermission section="reports">
      <div className="admin-card max-w-xl">
        <ReportGenerator currencies={currencies.map((c) => ({ code: c.code, type: c.type, bank_accounts: c.bank_accounts }))} />
      </div>
    </RequirePermission>
  );
}
