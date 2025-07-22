import { useSession } from "@/contexts/SessionContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate('/login');
    } else {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      Loading...
    </div>
  );
};

export default Index;