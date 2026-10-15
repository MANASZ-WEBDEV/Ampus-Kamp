import { Providers } from '@/app/providers';
import { AppRouter } from '@/app/router';

/**
 * App — root component.
 * Wraps the router in all global providers.
 */
export function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}
