import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/contexts/SessionContext";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const { session, supabase } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate('/login');
    }
  }, [session, navigate]);

  if (!session) {
    return null; // Or a loading spinner
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4">
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <ThemeToggle />
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
      </div>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to BizHub CRM, {session.user?.email}!</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Your CRM dashboard will be built here.
        </p>
        <div className="flex flex-col space-y-4">
          <Link to="/tasks">
            <Button className="w-48">Go to Tasks</Button>
          </Link>
          <Link to="/tickets">
            <Button className="w-48">Go to Tickets</Button>
          </Link>
          {/* Add more navigation links here as modules are built */}
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;