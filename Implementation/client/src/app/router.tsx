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
const HomePage             = lazy(() => import('@/features/home/pages/HomePage'));
const EventFeedPage        = lazy(() => import('@/features/events/pages/EventFeedPage'));
const EventDetailPage      = lazy(() => import('@/features/events/pages/EventDetailPage'));
const FacultyPostEventPage = lazy(() => import('@/features/events/pages/FacultyPostEventPage'));
const FacultyEditEventPage = lazy(() => import('@/features/events/pages/FacultyEditEventPage'));
const MyEventsPage         = lazy(() => import('@/features/events/pages/MyEventsPage'));

// F-3: Paste-to-Post AI Extraction
const PasteToPostPage = lazy(() => import('@/features/events/pages/PasteToPostPage'));

// F-4: Team Finder
const TeamFinderPage     = lazy(() => import('@/features/teams/pages/TeamFinderPage'));
const TeamCommandHubPage = lazy(() => import('@/features/teams/pages/TeamCommandHubPage'));
const TeamPostsPage      = lazy(() => import('@/features/teams/pages/TeamPostsPage'));
const LinkInboxPage      = lazy(() => import('@/features/teams/pages/LinkInboxPage'));

// F-5: People, Looking, Safety
const PeopleSearchPage = lazy(() => import('@/features/teams/pages/PeopleSearchPage'));
const LookingListPage  = lazy(() => import('@/features/teams/pages/LookingListPage'));

// F-6: Registrations
const FacultyRosterPage = lazy(() => import('@/features/registrations/pages/FacultyRosterPage'));

// F-7: Credentials & Achievements
const MyAchievementsPage            = lazy(() => import('@/features/credentials/pages/MyAchievementsPage'));
const AddAchievementPage            = lazy(() => import('@/features/credentials/pages/AddAchievementPage'));
const AddParticipationPage          = lazy(() => import('@/features/credentials/pages/AddParticipationPage'));
const FacultyVerificationQueuePage  = lazy(() => import('@/features/credentials/pages/FacultyVerificationQueuePage'));

// F-8: Analytics & Department Ranking
const DepartmentRankingPage   = lazy(() => import('@/features/analytics/pages/DepartmentRankingPage'));
const BreakdownPage           = lazy(() => import('@/features/analytics/pages/BreakdownPage'));
const DepartmentDashboardPage = lazy(() => import('@/features/analytics/pages/DepartmentDashboardPage'));
const CollegeLeaderboardPage  = lazy(() => import('@/features/analytics/pages/CollegeLeaderboardPage'));

// F-9: Notifications
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));

// F-10: Admin
const AdminDashboardPage   = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
const UserManagementPage   = lazy(() => import('@/features/admin/pages/UserManagementPage'));
const CourseAliasQueuePage = lazy(() => import('@/features/admin/pages/CourseAliasQueuePage'));
const SettingsPage         = lazy(() => import('@/features/admin/pages/SettingsPage'));
const SafetyReportsPage    = lazy(() => import('@/features/admin/pages/SafetyReportsPage'));
const AuditLogPage         = lazy(() => import('@/features/admin/pages/AuditLogPage'));


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

          {/* ── F-2: Events + Student Home ──────────────────────────────────────────── */}
          <Route path="/home"           element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/events"          element={<ProtectedRoute><EventFeedPage /></ProtectedRoute>} />
          <Route path="/events/my"       element={<ProtectedRoute roles={['faculty','dept_head','admin']}><MyEventsPage /></ProtectedRoute>} />
          <Route path="/events/new"      element={<ProtectedRoute roles={['faculty','dept_head','admin']}><FacultyPostEventPage /></ProtectedRoute>} />

          {/* ── F-3: Paste-to-Post — MUST be before /events/:id ─────────────────────── */}
          <Route path="/events/paste"    element={<ProtectedRoute roles={['faculty','dept_head','admin']}><PasteToPostPage /></ProtectedRoute>} />

          <Route path="/events/:id"      element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
          <Route path="/events/:id/edit" element={<ProtectedRoute roles={['faculty','dept_head','admin']}><FacultyEditEventPage /></ProtectedRoute>} />

          {/* ── F-4: Team Finder ──────────────────────────────────────────── */}
          {/* Global squad discovery page (/teams) */}
          <Route
            path="/teams"
            element={<ProtectedRoute><TeamFinderPage /></ProtectedRoute>}
          />
          {/* Team Command Hub — Squad Requests & Applications (/teams/requests) */}
          <Route
            path="/teams/requests"
            element={<ProtectedRoute><TeamCommandHubPage /></ProtectedRoute>}
          />
          {/* IMPORTANT: /events/:eventId/teams must be before /events/:id ── */}
          <Route
            path="/events/:eventId/teams"
            element={<ProtectedRoute roles={['student']}><TeamPostsPage /></ProtectedRoute>}
          />
          <Route
            path="/teams/inbox"
            element={<ProtectedRoute roles={['student']}><LinkInboxPage /></ProtectedRoute>}
          />

          {/* ── F-5: People, Looking, Safety ────────────────────────────────── */}
          {/* IMPORTANT: /events/:id/looking must be before /events/:id ─────── */}
          <Route
            path="/events/:id/looking"
            element={<ProtectedRoute roles={['student']}><LookingListPage /></ProtectedRoute>}
          />
          <Route
            path="/teams/people"
            element={<ProtectedRoute roles={['student']}><PeopleSearchPage /></ProtectedRoute>}
          />
          {/* ── F-6: Registrations ─────────────────────────────────────── */}
          {/* IMPORTANT: /events/:id/roster must be before /events/:id ──── */}
          <Route
            path="/events/:id/roster"
            element={<ProtectedRoute roles={['faculty','dept_head','admin']}><FacultyRosterPage /></ProtectedRoute>}
          />

          {/* ── F-7: Credentials & Achievements ──────────────────────── */}
          <Route path="/badges"              element={<ProtectedRoute><MyAchievementsPage /></ProtectedRoute>} />
          <Route path="/achievements/add"    element={<ProtectedRoute><AddAchievementPage /></ProtectedRoute>} />
          <Route path="/participations/add"  element={<ProtectedRoute roles={['student']}><AddParticipationPage /></ProtectedRoute>} />
          <Route path="/verify"              element={<ProtectedRoute roles={['faculty','dept_head','admin']}><FacultyVerificationQueuePage /></ProtectedRoute>} />

          {/* ── F-8: Analytics & Department Dashboard ──────────────────────── */}
          {/* /analytics/:deptId MUST be its own route — no wildcard — so both slug */}
          {/* and the index /analytics render their respective pages.              */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute roles={['dept_head', 'admin']}>
                <DepartmentRankingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/:deptId"
            element={
              <ProtectedRoute roles={['dept_head', 'admin']}>
                <BreakdownPage />
              </ProtectedRoute>
            }
          />
          {/* Screen 11: Department Head Dashboard */}
          <Route
            path="/dept/dashboard"
            element={
              <ProtectedRoute roles={['dept_head', 'admin']}>
                <DepartmentDashboardPage />
              </ProtectedRoute>
            }
          />
          {/* Screen 12: College Leaderboard & Admin Overview */}
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute roles={['admin']}>
                <CollegeLeaderboardPage />
              </ProtectedRoute>
            }
          />

          {/* ── F-9: Notifications ────────────────────────────────────────── */}
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

          {/* ── F-10: Admin ───────────────────────────────────────────────── */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><UserManagementPage /></ProtectedRoute>} />
          <Route path="/admin/courses/queue" element={<ProtectedRoute roles={['admin']}><CourseAliasQueuePage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><SafetyReportsPage /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute roles={['admin']}><AuditLogPage /></ProtectedRoute>} />

          {/* ── Root: authenticated users go to /home ─────────────────── */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* ── Catch-all ─────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
