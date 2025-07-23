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
import ProductsPage from "./pages/ProductsPage";
import POSPage from "./pages/POSPage";
import WikiPage from "./pages/WikiPage";
import ChatPage from "./pages/ChatPage";
import { SessionContextProvider, useSession } from "./contexts/SessionContext";
import { ThemeProvider } from "./components/ThemeProvider";
import MainLayout from "./components/MainLayout";
import React, { useEffect, useState } from "react";
import LoadingSpinner from "./components/LoadingSpinner";
import { toast } from "sonner";
import api from "./lib/api"; // Import the new API client

interface AppSettings {
  module_dashboard_enabled: boolean;
  module_tasks_enabled: boolean;
  module_tickets_enabled: boolean;
  module_services_enabled: boolean;
  module_products_enabled: boolean;
  module_pos_enabled: boolean;
  module_invoices_enabled: boolean;
  module_reports_enabled: boolean;
  module_users_enabled: boolean;
  module_profile_enabled: boolean;
  module_settings_enabled: boolean;
  module_wiki_enabled: boolean;
  module_chat_enabled: boolean;
  // Add other settings fields if they exist in your app_settings table
}

const queryClient = new QueryClient();

// Component to fetch settings and conditionally render routes
const AppRoutes = () => {
  const { user, isAuthenticated, isLoading, fetchUserRole, token } = useSession();
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const loadSettingsAndRole = async () => {
      setLoadingSettings(true);

      if (!isAuthenticated || !token) {
        setLoadingSettings(false);
        return;
      }

      // Fetch app settings using new API client
      try {
        const response = await api.get('/app-settings'); // Pretpostavljena ruta za app settings
        setAppSettings(response.data as AppSettings);
      } catch (error: any) {
        console.error('Error fetching app settings:', error.response?.data || error.message);
        toast.error('Failed to load app settings for routing.');
      }

      // Fetch user role
      const role = await fetchUserRole();
      setCurrentUserRole(role);

      setLoadingSettings(false);
    };

    if (!isLoading) { // Only load settings and role once session loading is complete
      loadSettingsAndRole();
    }
  }, [isAuthenticated, isLoading, fetchUserRole, token]);

  // Helper function to check if a module is enabled and if user has permission
  const isModuleEnabled = (moduleKey: keyof AppSettings, requiredRoles: string[] = ['client', 'worker', 'administrator']) => {
    if (!appSettings || !isAuthenticated || !currentUserRole) return false;

    const moduleEnabled = appSettings[moduleKey];
    const userHasRequiredRole = requiredRoles.includes(currentUserRole);

    return moduleEnabled && userHasRequiredRole;
  };

  if (isLoading || loadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<Index />} />
        {isModuleEnabled('module_dashboard_enabled') && <Route path="/dashboard" element={<DashboardPage />} />}
        {isModuleEnabled('module_tasks_enabled') && <Route path="/tasks" element={<TasksPage />} />}
        {isModuleEnabled('module_tickets_enabled') && <Route path="/tickets" element={<TicketsPage />} />}
        {isModuleEnabled('module_services_enabled', ['worker', 'administrator']) && <Route path="/services" element={<ServicesPage />} />}
        {isModuleEnabled('module_products_enabled', ['administrator']) && <Route path="/products" element={<ProductsPage />} />}
        {isModuleEnabled('module_pos_enabled', ['worker', 'administrator']) && <Route path="/pos" element={<POSPage />} />}
        {isModuleEnabled('module_invoices_enabled', ['worker', 'administrator']) && (
          <>
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/new" element={<InvoiceFormPage />} />
            <Route path="/invoices/edit/:id" element={<InvoiceFormPage />} />
            <Route path="/invoices/print/:id" element={<PrintableInvoice />} />
          </>
        )}
        {isModuleEnabled('module_reports_enabled', ['worker', 'administrator']) && <Route path="/reports" element={<ReportsPage />} />}
        {isModuleEnabled('module_users_enabled', ['administrator']) && (
          <>
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/clients/:id" element={<ClientDetailsPage />} />
          </>
        )}
        {isModuleEnabled('module_profile_enabled') && <Route path="/profile" element={<ProfilePage />} />}
        {isModuleEnabled('module_settings_enabled', ['administrator']) && <Route path="/settings" element={<SettingsPage />} />}
        {isModuleEnabled('module_wiki_enabled') && <Route path="/wiki" element={<WikiPage />} />}
        {isModuleEnabled('module_chat_enabled') && <Route path="/chat" element={<ChatPage />} />}
      </Route>
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionContextProvider>
            <AppRoutes />
          </SessionContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;