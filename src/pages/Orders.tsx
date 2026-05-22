import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import OrderHistory from "@/components/order/OrderHistory";

const Orders = () => {
  return (
    <DashboardLayout 
      title="Мои заявки" 
      description="История ваших операций обмена"
    >
      <div className="max-w-3xl">
        <OrderHistory />
      </div>
    </DashboardLayout>
  );
};

export default Orders;
