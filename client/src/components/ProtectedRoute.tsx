import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to custom login required page if not authenticated
    return <Navigate to="/login-required" state={{ from: location }} replace />;
  }

  if (allowedRoles && user) {
     const hasPermission = allowedRoles.includes(user.role) || (user.role === 'admin' && allowedRoles.includes('admin'));
     
     if (!hasPermission) {
        // Redirect to appropriate dashboard if role doesn't match
        if (user.role === 'researcher') return <Navigate to="/researcher" replace />;
        if (user.role === 'company') return <Navigate to="/company" replace />;
        if (user.role === 'triager') return <Navigate to="/triager" replace />;
        if (user.role === 'admin') return <Navigate to="/admin" replace />;
        
        return <Navigate to="/" replace />;
     }
  }

  return <Outlet />;
};
