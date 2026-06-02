import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import UploadPage from '@/pages/UploadPage';
import AIResultsPage from '@/pages/AIResultsPage';
import CollectionsPage from '@/pages/CollectionsPage';
import DuplicatesPage from '@/pages/DuplicatesPage';
import PhotoDetailPage from '@/pages/PhotoDetailPage';
import SettingsPage from '@/pages/SettingsPage';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/Toaster';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  const { fetchMe, token } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, []);

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected dashboard routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="projects/:projectId/upload" element={<UploadPage />} />
          <Route path="projects/:projectId/results" element={<AIResultsPage />} />
          <Route path="projects/:projectId/collections" element={<CollectionsPage />} />
          <Route path="projects/:projectId/duplicates" element={<DuplicatesPage />} />
          <Route path="photos/:photoId" element={<PhotoDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
