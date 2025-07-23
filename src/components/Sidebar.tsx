import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSession } from '@/contexts/SessionContext';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ListTodo,
  Ticket,
  Briefcase,
  Users,
  LogOut,
  User,
  ReceiptText,
  BarChart3,
  Settings,
  Package,
  ShoppingCart,
  BookOpen,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isVisible: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon: Icon, label, isActive, isVisible }) => {
  if (!isVisible) return null;

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className={cn(
        'w-full justify-start',
        isActive && 'bg-accent text-accent-foreground',
      )}
      asChild
    >
      <Link to={to}>
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
};

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
}

const Sidebar: React.FC = () => {
  const { logout, user, isAuthenticated, isLoading, fetchUserRole, supabase } = useSession();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const loadSettingsAndRole = async () => {
      setLoadingSettings(true);
      if (!isAuthenticated || !user?.id) {
        setLoadingSettings(false);
        return;
      }

      // Fetch app settings using Supabase client
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single();

        if (error) {
          console.error('Error fetching app settings:', error.message);
          toast.error('Failed to load app settings.');
        } else {
          setAppSettings(data as AppSettings);
        }
      } catch (error: any) {
        console.error('Unexpected error fetching app settings:', error.message);
        toast.error('An unexpected error occurred while loading app settings.');
      }

      // Fetch user role
      const role = await fetchUserRole();
      setUserRole(role);
      setLoadingSettings(false);
    };

    if (!isLoading) { // Only load settings and role once session loading is complete
      loadSettingsAndRole();
    }
  }, [isAuthenticated, isLoading, fetchUserRole, user?.id, supabase]);

  // Helper to check if a module is enabled AND if the user has the required role
  const isModuleVisible = (moduleKey: keyof AppSettings, requiredRoles: string[] = ['client', 'worker', 'administrator']) => {
    if (!appSettings || !isAuthenticated || !userRole) return false;
    const moduleEnabled = appSettings[moduleKey];
    const userHasRequiredRole = requiredRoles.includes(userRole);
    return moduleEnabled && userHasRequiredRole;
  };

  if (isLoading || loadingSettings) {
    return (
      <div className="flex h-full max-h-screen flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-screen flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-4">
        <h1 className="text-xl font-bold text-sidebar-primary-foreground">BizHub CRM</h1>
      </div>
      <Separator className="bg-sidebar-border" />
      <ScrollArea className="flex-grow py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Modules</h2>
          <div className="space-y-1">
            <NavLink
              to="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              isActive={location.pathname === '/dashboard'}
              isVisible={isModuleVisible('module_dashboard_enabled')}
            />
            <NavLink
              to="/tasks"
              icon={ListTodo}
              label="Tasks"
              isActive={location.pathname === '/tasks'}
              isVisible={isModuleVisible('module_tasks_enabled')}
            />
            <NavLink
              to="/tickets"
              icon={Ticket}
              label="Tickets"
              isActive={location.pathname === '/tickets'}
              isVisible={isModuleVisible('module_tickets_enabled')}
            />
            <NavLink
              to="/services"
              icon={Briefcase}
              label="Services"
              isActive={location.pathname === '/services'}
              isVisible={isModuleVisible('module_services_enabled', ['worker', 'administrator'])}
            />
            <NavLink
              to="/products"
              icon={Package}
              label="Products"
              isActive={location.pathname === '/products'}
              isVisible={isModuleVisible('module_products_enabled', ['administrator'])}
            />
            <NavLink
              to="/pos"
              icon={ShoppingCart}
              label="POS"
              isActive={location.pathname === '/pos'}
              isVisible={isModuleVisible('module_pos_enabled', ['worker', 'administrator'])}
            />
            <NavLink
              to="/invoices"
              icon={ReceiptText}
              label="Invoices"
              isActive={location.pathname === '/invoices'}
              isVisible={isModuleVisible('module_invoices_enabled', ['worker', 'administrator'])}
            />
            <NavLink
              to="/reports"
              icon={BarChart3}
              label="Reports"
              isActive={location.pathname === '/reports'}
              isVisible={isModuleVisible('module_reports_enabled', ['worker', 'administrator'])}
            />
            <NavLink
              to="/wiki"
              icon={BookOpen}
              label="Wiki"
              isActive={location.pathname === '/wiki'}
              isVisible={isModuleVisible('module_wiki_enabled')}
            />
            <NavLink
              to="/chat"
              icon={MessageSquare}
              label="Chat"
              isActive={location.pathname === '/chat'}
              isVisible={isModuleVisible('module_chat_enabled')}
            />
            <NavLink
              to="/users"
              icon={Users}
              label="User Management"
              isActive={location.pathname === '/users'}
              isVisible={isModuleVisible('module_users_enabled', ['administrator'])}
            />
          </div>
        </div>
        <div className="px-3 py-2 mt-4">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Account</h2>
          <div className="space-y-1">
            <NavLink
              to="/profile"
              icon={User}
              label="My Profile"
              isActive={location.pathname === '/profile'}
              isVisible={isModuleVisible('module_profile_enabled')}
            />
            <NavLink
              to="/settings"
              icon={Settings}
              label="Settings"
              isActive={location.pathname === '/settings'}
              isVisible={isModuleVisible('module_settings_enabled', ['administrator'])}
            />
          </div>
        </div>
      </ScrollArea>
      <Separator className="bg-sidebar-border" />
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-600"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;