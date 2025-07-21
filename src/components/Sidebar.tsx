import React from 'react';
import { Link, useLocation } => 'react-router-dom';
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
  ReceiptText, // Import ReceiptText icon for invoices
} from 'lucide-react';
import { toast } from 'sonner';

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon: Icon, label, isActive }) => (
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

const Sidebar: React.FC = () => {
  const { supabase, session } = useSession();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      const fetchUserRole = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (error) {
          console.error('Error fetching user role:', error.message);
          toast.error('Failed to fetch user role.');
        } else {
          setUserRole(data.role);
        }
      };
      fetchUserRole();
    }
  }, [session, supabase]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Logout failed: ' + error.message);
    } else {
      toast.success('Logged out successfully!');
    }
  };

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
            />
            <NavLink
              to="/tasks"
              icon={ListTodo}
              label="Tasks"
              isActive={location.pathname === '/tasks'}
            />
            <NavLink
              to="/tickets"
              icon={Ticket}
              label="Tickets"
              isActive={location.pathname === '/tickets'}
            />
            <NavLink
              to="/services"
              icon={Briefcase}
              label="Services"
              isActive={location.pathname === '/services'}
            />
            <NavLink
              to="/invoices"
              icon={ReceiptText}
              label="Invoices"
              isActive={location.pathname === '/invoices'}
            />
            {userRole === 'administrator' && (
              <NavLink
                to="/users"
                icon={Users}
                label="User Management"
                isActive={location.pathname === '/users'}
              />
            )}
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