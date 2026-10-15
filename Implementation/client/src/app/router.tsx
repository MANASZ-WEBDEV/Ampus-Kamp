import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ScaffoldPage } from '@/pages/ScaffoldPage';

/**
 * AppRouter — single source of truth for all client-side routes.
 *
 * Convention:
 *   - Import page components from their feature's index.ts barrel
 *   - Add ProtectedRoute wrapper around auth-gated routes (available in F-1)
 *   - Keep commented-out placeholders so the route plan is visible at a glance
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── F-0: Scaffold status page ─────────────────────────────────────── */}
        <Route path="/" element={<ScaffoldPage />} />

        {/* ── F-1: Auth (uncomment when F-1 is built) ──────────────────────── */}
        {/* <Route path="/login" element={<LoginPage />} /> */}
        {/* <Route path="/register" element={<RegisterPage />} /> */}
        {/* <Route path="/verify" element={<OtpPage />} /> */}

        {/* ── F-1: Profile (protected) ──────────────────────────────────────── */}
        {/* <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} /> */}

        {/* ── F-2: Events ───────────────────────────────────────────────────── */}
        {/* <Route path="/events" element={<ProtectedRoute><EventFeedPage /></ProtectedRoute>} /> */}
        {/* <Route path="/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} /> */}
        {/* <Route path="/events/new" element={<ProtectedRoute><FacultyPostEventPage /></ProtectedRoute>} /> */}

        {/* ── F-4: Team finder ──────────────────────────────────────────────── */}
        {/* <Route path="/teams" element={<ProtectedRoute><TeamPostsPage /></ProtectedRoute>} /> */}
        {/* <Route path="/teams/inbox" element={<ProtectedRoute><LinkInboxPage /></ProtectedRoute>} /> */}

        {/* ── F-5: People search ────────────────────────────────────────────── */}
        {/* <Route path="/people" element={<ProtectedRoute><PeopleSearchPage /></ProtectedRoute>} /> */}

        {/* ── F-7: Achievements ─────────────────────────────────────────────── */}
        {/* <Route path="/achievements/add" element={<ProtectedRoute><AddAchievementPage /></ProtectedRoute>} /> */}
        {/* <Route path="/verify" element={<ProtectedRoute><FacultyVerificationQueuePage /></ProtectedRoute>} /> */}

        {/* ── F-8: Analytics ────────────────────────────────────────────────── */}
        {/* <Route path="/analytics" element={<ProtectedRoute><DepartmentDashboardPage /></ProtectedRoute>} /> */}

        {/* ── F-9: Notifications ────────────────────────────────────────────── */}
        {/* <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} /> */}

        {/* ── F-10: Admin ───────────────────────────────────────────────────── */}
        {/* <Route path="/admin/*" element={<ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>} /> */}

        {/* ── Catch-all ─────────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
