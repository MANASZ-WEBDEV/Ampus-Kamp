import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/context/AuthContext';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers — wraps the app with all global context providers.
 * Ordering: QueryClientProvider must wrap AuthProvider because
 * AuthProvider uses useQueryClient() internally.
 *
 * Add new providers below AuthProvider as features are built:
 *   - F-2+: ToastProvider
 *   - F-9: NotificationProvider
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
      {/* TanStack Query Devtools — only in development builds */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
