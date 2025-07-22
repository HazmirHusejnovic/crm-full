import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { usePermissions } from "./hooks/usePermissions"; // Import the new hook

const queryClient = new QueryClient();

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
  module_permissions: Record<string, Record<string, string[]>> | null; // New field
}

// Component to fetch settings and conditionally render routes
const AppRoutes = () => {
  const { supabase, session } = useSession();
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettingsAndRole = async () => {
      setLoadingSettings(true);
      // Fetch app settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (settingsError) {
        console.error('Error fetching app settings:', settingsError.message);
        toast.error('Failed to load app settings for routing.');
      } else {
        setAppSettings(settingsData as AppSettings);
      }

      // Fetch user role
      if (session) {
        const { data: roleData, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (roleError) {
          console.error('Error fetching user role:', roleError.message);
          toast.error('Failed to fetch user role for routing.');
        } else {
          setCurrentUserRole(roleData.role);
        }
      }
      setLoadingSettings(false);
    };

    fetchSettingsAndRole();
  }, [session, supabase]);

  // Use the new usePermissions hook
  const { canViewModule } = usePermissions(appSettings, currentUserRole);

  if (loadingSettings) {
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
        {canViewModule('dashboard') && <Route path="/dashboard" element={<DashboardPage />} />}
        {canViewModule('tasks') && <Route path="/tasks" element={<TasksPage />} />}
        {canViewModule('tickets') && <Route path="/tickets" element={<TicketsPage />} />}
        {canViewModule('services') && <Route path="/services" element={<ServicesPage />} />}
        {canViewModule('products') && <Route path="/products" element={<ProductsPage />} />}
        {canViewModule('pos') && <Route path="/pos" element={<POSPage />} />}
        {canViewModule('invoices') && (
          <>
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/new" element={<InvoiceFormPage />} />
            <Route path="/invoices/edit/:id" element={<InvoiceFormPage />} />
            <Route path="/invoices/print/:id" element={<PrintableInvoice />} />
          </>
        )}
        {canViewModule('reports') && <Route path="/reports" element={<ReportsPage />} />}
        {canViewModule('users') && (
          <>
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/clients/:id" element={<ClientDetailsPage />} />
          </>
        )}
        {canViewModule('profile') && <Route path="/profile" element={<ProfilePage />} />}
        {canViewModule('settings') && <Route path="/settings" element={<SettingsPage />} />}
        {canViewModule('wiki') && <Route path="/wiki" element={<WikiPage />} />}
        {canViewModule('chat') && <Route path="/chat" element={<ChatPage />} />}

        {/* Redirect to dashboard if root path is accessed and user is logged in */}
        {session && <Route path="/" element={<Navigate to="/dashboard" replace />} />}
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