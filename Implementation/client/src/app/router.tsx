import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

// ── Code-split page imports ───────────────────────────────────────────────────
// F-0
const ScaffoldPage = lazy(() => import('@/pages/ScaffoldPage').then(m => ({ default: m.ScaffoldPage })));

// F-1
const LoginPage    = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const OtpPage      = lazy(() => import('@/pages/OtpPage'));
const ProfilePage  = lazy(() => import('@/pages/ProfilePage'));

// F-2: Events + Student Home
const StudentHomePage      = lazy(() => import('@/pages/StudentHomePage'));
const EventFeedPage        = lazy(() => import('@/features/events/pages/EventFeedPage'));
const EventDetailPage      = lazy(() => import('@/features/events/pages/EventDetailPage'));
const FacultyPostEventPage = lazy(() => import('@/features/events/pages/FacultyPostEventPage'));
const FacultyEditEventPage = lazy(() => import('@/features/events/pages/FacultyEditEventPage'));
const MyEventsPage         = lazy(() => import('@/features/events/pages/MyEventsPage'));

// Future pages — import here as features are built
// const TeamPostsPage         = lazy(() => import('@/pages/TeamPostsPage'));
// const PeopleSearchPage      = lazy(() => import('@/pages/PeopleSearchPage'));
// const AddAchievementPage    = lazy(() => import('@/pages/AddAchievementPage'));
// const DepartmentDashboard   = lazy(() => import('@/pages/DepartmentDashboardPage'));
// const LeaderboardPage       = lazy(() => import('@/pages/LeaderboardPage'));
// const NotificationsPage     = lazy(() => import('@/pages/NotificationsPage'));
// const AdminDashboardPage    = lazy(() => import('@/pages/AdminDashboardPage'));

// ── Loading fallback ──────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-primary-fixed border-t-primary-container animate-spin" />
        <span className="font-label-lg text-label-lg text-on-surface-variant">Loading…</span>
      </div>
    </div>
  );
}

// ── AppRouter ─────────────────────────────────────────────────────────────────

/**
 * Single source of truth for all client-side routes.
 * Convention:
 *   - All page imports are lazy (code-split per-route)
 *   - Protected pages are wrapped in <ProtectedRoute>
 *   - role-restricted routes pass roles={[...]} to <ProtectedRoute>
 *   - Commented routes show the full future plan at a glance
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── F-0: Scaffold status (root while unauthenticated) ─────────── */}
          <Route path="/scaffold" element={<ScaffoldPage />} />

          {/* ── F-1: Public auth pages ────────────────────────────────────── */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify"   element={<OtpPage />} />

          {/* ── F-1: Protected profile ────────────────────────────────────── */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ── F-2: Events + Student Home ──────────────────────────────── */}
          <Route path="/home"           element={<ProtectedRoute><StudentHomePage /></ProtectedRoute>} />
          <Route path="/events"          element={<ProtectedRoute><EventFeedPage /></ProtectedRoute>} />
          <Route path="/events/my"       element={<ProtectedRoute roles={['faculty','dept_head','admin']}><MyEventsPage /></ProtectedRoute>} />
          <Route path="/events/new"      element={<ProtectedRoute roles={['faculty','dept_head','admin']}><FacultyPostEventPage /></ProtectedRoute>} />
          <Route path="/events/:id"      element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
          <Route path="/events/:id/edit" element={<ProtectedRoute roles={['faculty','dept_head','admin']}><FacultyEditEventPage /></ProtectedRoute>} />

          {/* ── F-4: Team finder ──────────────────────────────────────────── */}
          {/* <Route path="/teams"       element={<ProtectedRoute><TeamPostsPage /></ProtectedRoute>} /> */}
          {/* <Route path="/teams/inbox" element={<ProtectedRoute><LinkInboxPage /></ProtectedRoute>} /> */}

          {/* ── F-5: People search ────────────────────────────────────────── */}
          {/* <Route path="/people" element={<ProtectedRoute><PeopleSearchPage /></ProtectedRoute>} /> */}

          {/* ── F-7: Achievements ─────────────────────────────────────────── */}
          {/* <Route path="/achievements/add" element={<ProtectedRoute><AddAchievementPage /></ProtectedRoute>} /> */}

          {/* ── F-8: Analytics ────────────────────────────────────────────── */}
          {/* <Route path="/analytics" element={<ProtectedRoute roles={['faculty','dept_head','admin']}><DepartmentDashboard /></ProtectedRoute>} /> */}

          {/* ── F-9: Notifications ────────────────────────────────────────── */}
          {/* <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} /> */}

          {/* ── F-10: Admin ───────────────────────────────────────────────── */}
          {/* <Route path="/admin/*" element={<ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>} /> */}

          {/* ── Root: authenticated users go to /home ─────────────────── */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* ── Catch-all ─────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
