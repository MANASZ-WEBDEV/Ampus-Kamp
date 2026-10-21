import { Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { MeProfile } from '../api/auth.api';

interface Props {
  children: ReactNode;
  roles?: MeProfile['role'][];
  redirectTo?: string;
}

/**
 * ProtectedRoute — renders children only if the user is authenticated.
 * Optional `roles` prop restricts to specific roles.
 * Shows a full-screen loading skeleton while the session is being rehydrated.
 */
export function ProtectedRoute({
  children,
  roles,
  redirectTo = '/login',
}: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-container animate-pulse" />
          <div className="h-3 w-32 rounded-full bg-surface-container-high animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
