
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "../components/AppLayout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <AppLayout>
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 animate-slide-up">
          <h1 className="text-4xl font-bold mb-4 text-white">404</h1>
          <p className="text-xl text-nav-inactive mb-4">Oops! Page not found</p>
          <a href="/" className="text-nav-active hover:text-white transition-colors">
            Return to Home
          </a>
        </div>
      </div>
    </AppLayout>
  );
};

export default NotFound;
