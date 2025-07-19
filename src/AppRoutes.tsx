
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';
import Encyclopedia from './pages/Encyclopedia';
import LogoUpload from './pages/LogoUpload';
import QuickLogoUpload from './pages/QuickLogoUpload';

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/encyclopedia" element={<Encyclopedia />} />
        <Route path="/logo-upload" element={<LogoUpload />} />
        <Route path="/quick-logo-upload" element={<QuickLogoUpload />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
