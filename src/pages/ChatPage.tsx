// Add to imports
import { useAppContext } from '@/contexts/AppContext';

const ChatPage: React.FC = () => {
  const { dbConnectionError } = useAppContext();
  
  // ... existing code ...

  if (dbConnectionError) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Database Connection Issue</h2>
          <p className="text-muted-foreground mb-4">
            We're unable to connect to the database. Please check your internet connection 
            and try again later.
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  // ... rest of the component ...
};