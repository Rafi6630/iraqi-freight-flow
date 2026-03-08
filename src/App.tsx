import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import CustomersPage from "./pages/CustomersPage";
import VendorsPage from "./pages/VendorsPage";
import EmployeesPage from "./pages/EmployeesPage";
import PartnersPage from "./pages/PartnersPage";
import CofounderCapitalPage from "./pages/CofounderCapitalPage";
import OrdersPage from "./pages/OrdersPage";
import OrderWizardPage from "./pages/OrderWizardPage";
import QuotationsPage from "./pages/QuotationsPage";
import InvoicesPage from "./pages/InvoicesPage";
import VendorBillsPage from "./pages/VendorBillsPage";
import PaymentsPage from "./pages/PaymentsPage";
import CommissionsPage from "./pages/CommissionsPage";
import ExpensesPage from "./pages/ExpensesPage";
import MonthlyClosePage from "./pages/MonthlyClosePage";
import ExchangeOfficesPage from "./pages/ExchangeOfficesPage";
import PaymentRemindersPage from "./pages/PaymentRemindersPage";
import DocumentHubPage from "./pages/DocumentHubPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import AdminConsolePage from "./pages/AdminConsolePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/cofounder-capital" element={<CofounderCapitalPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderWizardPage />} />
            <Route path="/quotations" element={<QuotationsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/vendor-bills" element={<VendorBillsPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/commissions" element={<CommissionsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/monthly-close" element={<MonthlyClosePage />} />
            <Route path="/exchange-offices" element={<ExchangeOfficesPage />} />
            <Route path="/payment-reminders" element={<PaymentRemindersPage />} />
            <Route path="/document-hub" element={<DocumentHubPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminConsolePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
