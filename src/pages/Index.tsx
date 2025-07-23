import { useSession } from "@/contexts/SessionContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "@/components/LoadingSpinner";

const Index = () => {
  const { isAuthenticated, isLoading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) { // Wait until session loading is complete
      if (isAuthenticated) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show a spinner while session is loading, otherwise the redirect happens immediately
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  // This component should ideally not render anything if the redirect works immediately.
  // But as a fallback or during very brief loading, it can show a message.
  return (
    <div className="flex items-center justify-center min-h-screen">
      Redirecting...
    </div>
  );
};

export default Index;