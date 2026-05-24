import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { OperatorProvider } from "@/contexts/OperatorContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { ApprovalProvider } from "@/contexts/ApprovalContext";
import { Loader2 } from "lucide-react";
import { QuizProvider } from "@/components/QuizContext";
import { ResidencyGate } from "@/components/ResidencyGate";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const Orders = lazy(() => import("./pages/Orders"));
const Profile = lazy(() => import("./pages/Profile"));
const Help = lazy(() => import("./pages/Help"));
const Settings = lazy(() => import("./pages/Settings"));
const Documents = lazy(() => import("./pages/Documents"));
const LegalPage = lazy(() => import("./pages/LegalPage"));

const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCurrencies = lazy(() => import("./pages/admin/AdminCurrencies"));
const AdminCompliance = lazy(() => import("./pages/admin/AdminCompliance"));
const AdminCompanyInfo = lazy(() => import("./pages/admin/AdminCompanyInfo"));
const AdminCommission = lazy(() => import("./pages/admin/AdminCommission"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminStaffRoles = lazy(() => import("./pages/admin/AdminStaffRoles"));
const AdminStaffMembers = lazy(() => import("./pages/admin/AdminStaffMembers"));
const AdminLegalPages = lazy(() => import("./pages/admin/AdminLegalPages"));
const AdminQuizQuestions = lazy(() => import("./pages/admin/AdminQuizQuestions"));
const AdminSiteContent = lazy(() => import("./pages/admin/AdminSiteContent"));

const queryClient = new QueryClient();

const SuspenseFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OperatorProvider>
            <BrandingProvider>
              <ApprovalProvider>
                <QuizProvider>
                <ResidencyGate />
                <Suspense fallback={<SuspenseFallback />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/legal/:slug" element={<LegalPage />} />

                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AdminOrders />} />
                      <Route path="currencies" element={<AdminCurrencies />} />
                      <Route path="compliance" element={<AdminCompliance />} />
                      <Route path="company" element={<AdminCompanyInfo />} />
                      <Route path="commission" element={<AdminCommission />} />
                      <Route path="reports" element={<AdminReports />} />
                      <Route path="staff-roles" element={<AdminStaffRoles />} />
                      <Route path="staff" element={<AdminStaffMembers />} />
                      <Route path="legal" element={<AdminLegalPages />} />
                      <Route path="quiz" element={<AdminQuizQuestions />} />
                      <Route path="content" element={<AdminSiteContent />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </QuizProvider>
              </ApprovalProvider>
            </BrandingProvider>
          </OperatorProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
