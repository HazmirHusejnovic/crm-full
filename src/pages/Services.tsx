// ... postojeći imports ...
import { fetchWithRetry } from '@/lib/api';

const ServicesPage: React.FC = () => {
  // ... postojeći state ...
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      setLoadingData(true);
      setApiError(null);
      
      const roleData = await fetchWithRetry(
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
      );
      
      // ... ostatak logike ...
      
    } catch (error) {
      console.error('Fetch error:', error);
      setApiError('Failed to load data. Please try again later.');
    } finally {
      setLoadingData(false);
    }
  };

  if (apiError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{apiError}</div>
        <Button onClick={fetchAllData}>Retry</Button>
      </div>
    );
  }

  // ... ostatak komponente ...
};