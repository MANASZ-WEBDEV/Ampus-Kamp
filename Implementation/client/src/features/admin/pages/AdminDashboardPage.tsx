import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAdminUsers, useAdminReports, useCourseQueue } from '../hooks/useAdmin';

// ── Quick stat card ───────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${color}`}>
      <span>{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

// ── Nav card ──────────────────────────────────────────────────────────────────

function NavCard({
  icon,
  title,
  description,
  to,
  accent,
}: {
  icon: string;
  title: string;
  description: string;
  to: string;
  accent: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="w-full text-left rounded-2xl bg-surface-container p-4 hover:bg-surface-container-high
                 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]
                 flex items-start gap-4 group"
    >
      <span className={`material-symbols-rounded text-3xl ${accent} mt-0.5 group-hover:scale-110 transition-transform`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-on-surface">{title}</p>
        <p className="text-sm text-on-surface-variant mt-0.5 leading-snug">{description}</p>
      </div>
      <span className="material-symbols-rounded text-on-surface-variant opacity-40 mt-0.5">
        chevron_right
      </span>
    </button>
  );
}

// ── AdminDashboardPage ────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user } = useAuth();

  // Quick stats — first page only, to show pending counts
  const { data: usersData }   = useAdminUsers({ status: 'pending' });
  const { data: reportsData } = useAdminReports('pending');
  const { data: queueData }   = useCourseQueue();

  const pendingUsers   = usersData?.pages[0]?.users.length ?? 0;
  const pendingReports = reportsData?.pages[0]?.items.length ?? 0;
  const queueCount     = queueData?.pages[0]?.items.length ?? 0;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-tertiary px-4 pt-14 pb-8">
        <p className="text-on-primary/70 text-sm font-medium mb-1">Admin Panel</p>
        <h1 className="text-2xl font-bold text-on-primary">
          Welcome, {user?.name?.split(' ')[0]}
        </h1>

        {/* Quick stats row */}
        <div className="flex flex-wrap gap-2 mt-4">
          {pendingUsers > 0 && (
            <StatChip label="pending users" value={pendingUsers} color="bg-error-container text-on-error-container" />
          )}
          {pendingReports > 0 && (
            <StatChip label="open reports" value={pendingReports} color="bg-error-container text-on-error-container" />
          )}
          {queueCount > 0 && (
            <StatChip label="course aliases" value={queueCount} color="bg-secondary-container text-on-secondary-container" />
          )}
          {pendingUsers === 0 && pendingReports === 0 && queueCount === 0 && (
            <StatChip label="all clear" value={0} color="bg-tertiary-container text-on-tertiary-container" />
          )}
        </div>
      </div>

      {/* Nav cards */}
      <div className="px-4 py-6 flex flex-col gap-3">
        <NavCard
          icon="manage_accounts"
          title="User Management"
          description="Approve pending accounts, suspend users, filter by role and status"
          to="/admin/users"
          accent="text-primary"
        />
        <NavCard
          icon="category"
          title="Course Alias Queue"
          description="Map 'Other' credential submissions to catalog courses"
          to="/admin/courses/queue"
          accent="text-secondary"
        />
        <NavCard
          icon="flag"
          title="Safety Reports"
          description="Review and action pending safety reports from students"
          to="/admin/reports"
          accent="text-error"
        />
        <NavCard
          icon="tune"
          title="Platform Settings"
          description="Upload limits, ranking weights, link expiry, tier points"
          to="/admin/settings"
          accent="text-tertiary"
        />
        <NavCard
          icon="history"
          title="Audit Log"
          description="View a full history of admin actions across the platform"
          to="/admin/audit"
          accent="text-outline"
        />
        <NavCard
          icon="bar_chart"
          title="Analytics"
          description="Department ranking and credential breakdown"
          to="/analytics"
          accent="text-primary"
        />
      </div>
    </div>
  );
}
