import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import TasksPage from "./pages/Tasks";
import TicketsPage from "./pages/Tickets";
import ServicesPage from "./pages/Services";
import UserManagementPage from "./pages/UserManagement";
import DashboardPage from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import InvoicesPage from "./pages/Invoices";
import InvoiceFormPage from "./pages/InvoiceFormPage";
import ReportsPage from "./pages/Reports";
import ClientDetailsPage from "./pages/ClientDetailsPage";
import PrintableInvoice from "./pages/PrintableInvoice";
import SettingsPage from "./pages/SettingsPage";
import ProductsPage from "./pages/ProductsPage"; // Import the new ProductsPage
import { SessionContextProvider } from "./contexts/SessionContext";
import { ThemeProvider } from "./components/ThemeProvider";
import MainLayout from "./components/MainLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionContextProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<MainLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/tickets" element={<TicketsPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/products" element={<ProductsPage />} /> {/* New route for Products */}
                <Route path="/users" element={<UserManagementPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/invoices/new" element={<InvoiceFormPage />} />
                <Route path="/invoices/edit/:id" element={<InvoiceFormPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/clients/:id" element={<ClientDetailsPage />} />
                <Route path="/invoices/print/:id" element={<PrintableInvoice />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SessionContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;