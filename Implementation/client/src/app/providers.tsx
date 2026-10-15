import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers — wraps the app with all global context providers.
 * Add providers here as features are built:
 *   - F-1: AuthProvider (reads JWT from cookie, exposes useAuth hook)
 *   - Future: ThemeProvider, ToastProvider, etc.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* TanStack Query Devtools — only in development builds */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
