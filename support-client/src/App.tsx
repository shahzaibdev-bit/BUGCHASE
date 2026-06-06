import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { SupportLayout } from '@/layouts/SupportLayout';
import { SupportDashboard } from '@/pages/SupportDashboard';
import { DisputeDetails } from '@/pages/DisputeDetails';
import { Profile } from '@/pages/Profile';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <SupportLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<SupportDashboard />} />
        <Route path="/disputes" element={<SupportDashboard />} />
        <Route path="/disputes/:id" element={<DisputeDetails />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
