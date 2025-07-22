import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'sonner';
import MainLayout from '@/components/MainLayout';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SessionProvider } from '@/contexts/SessionContext';
import { AppProvider } from '@/contexts/AppContext';

function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <AppProvider>
          <Router>
            <MainLayout />
            <Toaster richColors />
          </Router>
        </AppProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App;