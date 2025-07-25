import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';
import { useSession } from '@/contexts/SessionContext';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

const MainLayout: React.FC = () => {
  const { logout } = useSession(); // Koristimo novu logout funkciju iz SessionContext-a

  const handleLogout = async () => {
    // logout funkcija iz SessionContext-a već rukuje toast notifikacijama i navigacijom
    logout();
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 flex-shrink-0 md:block">
        <Sidebar />
      </aside>
      <main className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b bg-card px-4">
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Button onClick={handleLogout} variant="outline" size="sm" className="md:hidden">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet /> {/* This is where nested routes will render */}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;