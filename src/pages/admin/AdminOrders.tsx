import { Loader2, RefreshCw, FileText, Clock, CheckCircle2, XCircle, CircleDollarSign, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrders } from "@/hooks/useOrders";
import OrdersTable from "@/components/admin/OrdersTable";
import OrdersKanban from "@/components/admin/OrdersKanban";
import { RequirePermission } from "@/components/admin/RequirePermission";

export default function AdminOrders() {
  const { data: orders = [], isLoading, refetch } = useOrders();

  const totalCount = orders.length;
  // Three distinct operational buckets for the operator admin:
  //   - awaiting:  client has not yet paid   (awaiting_payment / pending)
  //   - paid:      client paid, WE owe crypto (paid / processing) ← actionable
  //   - completed: crypto sent, tx_hash done (completed)
  // Previously `paid` fell through no bucket and admin could miss work.
  const awaitingCount = orders.filter((o) => o.status === "pending" || o.status === "awaiting_payment").length;
  const paidCount = orders.filter((o) => o.status === "paid" || o.status === "processing").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled" || o.status === "expired").length;

  return (
    <RequirePermission section="orders">
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Заявки</h1>
          <p className="text-muted-foreground mt-1">Управление и мониторинг обменных операций</p>
        </div>

        {/* Gradient stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Total */}
          <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.08))' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Всего</p>
          </div>

          {/* Awaiting payment — client has not paid yet */}
          <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.08), rgba(249,115,22,0.08))' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{awaitingCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Ожидают&nbsp;оплаты</p>
          </div>

          {/* Paid — client paid, admin must send the crypto */}
          <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.08))' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <CircleDollarSign className="w-6 h-6 text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-400">{paidCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">К&nbsp;выдаче</p>
          </div>

          {/* Completed — crypto has been sent */}
          <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(34,197,94,0.08))' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{completedCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Завершены</p>
          </div>

          {/* Cancelled + expired */}
          <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(244,63,94,0.08))' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-400">{cancelledCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Отменены</p>
          </div>
        </div>

        {/* Tabs: Kanban (default) / Table */}
        <div className="admin-card">
          <Tabs defaultValue="kanban">
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Управление заявками</h2>
              </div>
              <div className="flex items-center gap-2">
                <TabsList>
                  <TabsTrigger value="kanban" className="gap-1.5">
                    <LayoutGrid className="w-4 h-4" />
                    Канбан
                  </TabsTrigger>
                  <TabsTrigger value="table" className="gap-1.5">
                    <TableIcon className="w-4 h-4" />
                    Таблица
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="border-border text-foreground hover:text-foreground hover:bg-muted"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Обновить
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="kanban" className="mt-0">
                  <OrdersKanban orders={orders} />
                </TabsContent>
                <TabsContent value="table" className="mt-0">
                  <OrdersTable orders={orders} />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>
    </RequirePermission>
  );
}
