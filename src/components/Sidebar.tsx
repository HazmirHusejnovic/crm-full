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
import { usePermissions } from '@/hooks/usePermissions'; // Import the new hook
import { useAppContext } from '@/contexts/AppContext'; // NEW: Import useAppContext

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

const Sidebar: React.FC = () => {
  const { supabase } = useSession();
  const { appSettings, currentUserRole, loadingAppSettings } = useAppContext(); // Get from global context
  const location = useLocation();

  // Pozivanje usePermissions hooka na vrhu komponente
  const { canViewModule } = usePermissions(); // No need to pass appSettings and currentUserRole, it gets them from context

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Logout failed: ' + error.message);
    } else {
      toast.success('Logged out successfully!');
    }
  };

  if (loadingAppSettings) { // Use global loading state
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
              isVisible={canViewModule('dashboard')}
            />
            <NavLink
              to="/tasks"
              icon={ListTodo}
              label="Tasks"
              isActive={location.pathname === '/tasks'}
              isVisible={canViewModule('tasks')}
            />
            <NavLink
              to="/tickets"
              icon={Ticket}
              label="Tickets"
              isActive={location.pathname === '/tickets'}
              isVisible={canViewModule('tickets')}
            />
            <NavLink
              to="/services"
              icon={Briefcase}
              label="Services"
              isActive={location.pathname === '/services'}
              isVisible={canViewModule('services')}
            />
            <NavLink
              to="/products"
              icon={Package}
              label="Products"
              isActive={location.pathname === '/products'}
              isVisible={canViewModule('products')}
            />
            <NavLink
              to="/pos"
              icon={ShoppingCart}
              label="POS"
              isActive={location.pathname === '/pos'}
              isVisible={canViewModule('pos')}
            />
            <NavLink
              to="/invoices"
              icon={ReceiptText}
              label="Invoices"
              isActive={location.pathname === '/invoices'}
              isVisible={canViewModule('invoices')}
            />
            <NavLink
              to="/reports"
              icon={BarChart3}
              label="Reports"
              isActive={location.pathname === '/reports'}
              isVisible={canViewModule('reports')}
            />
            <NavLink
              to="/wiki"
              icon={BookOpen}
              label="Wiki"
              isActive={location.pathname === '/wiki'}
              isVisible={canViewModule('wiki')}
            />
            <NavLink
              to="/chat"
              icon={MessageSquare}
              label="Chat"
              isActive={location.pathname === '/chat'}
              isVisible={canViewModule('chat')}
            />
            <NavLink
              to="/users"
              icon={Users}
              label="User Management"
              isActive={location.pathname === '/users'}
              isVisible={canViewModule('users')}
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
              isVisible={canViewModule('profile')}
            />
            <NavLink
              to="/settings"
              icon={Settings}
              label="Settings"
              isActive={location.pathname === '/settings'}
              isVisible={canViewModule('settings')}
            />
          </div>
        </div>
      </ScrollArea>
      <Separator className="bg-sidebar-border" />
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;