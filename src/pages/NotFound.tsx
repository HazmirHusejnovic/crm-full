import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from 'react-i18next'; // Import useTranslation

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation(); // Initialize useTranslation

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t('page_not_found_title')}</h1>
        <p className="text-xl text-gray-600 mb-4">{t('page_not_found_message')}</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          {t('return_to_home')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;