// ... postojeći kod ...

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (mounted) {
          sessionRef.current = currentSession;
          setSession(currentSession);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('Session error:', err);
          setError('Failed to get session');
          setLoading(false);
        }
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      try {
        if (JSON.stringify(currentSession) !== JSON.stringify(sessionRef.current)) {
          sessionRef.current = currentSession;
          setSession(currentSession);
        }

        if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      } catch (err) {
        console.error('Auth state change error:', err);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t('loading')}</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ supabase, session }}>
      {children}
    </SessionContext.Provider>
  );
};