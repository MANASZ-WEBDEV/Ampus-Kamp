import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminUsers, useApproveUser, useSuspendUser } from '../hooks/useAdmin';
import type { AdminUser } from '../types';

// ── Status chip ───────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-warning-container text-on-surface text-xs',
  active:    'bg-tertiary-container text-on-tertiary-container text-xs',
  suspended: 'bg-error-container text-on-error-container text-xs',
};

const ROLE_STYLE: Record<string, string> = {
  student:   'bg-primary-container text-on-primary-container text-xs',
  faculty:   'bg-secondary-container text-on-secondary-container text-xs',
  dept_head: 'bg-tertiary-container text-on-tertiary-container text-xs',
  admin:     'bg-error-container text-on-error-container text-xs',
};

function Chip({ label, style }: { label: string; style: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${style}`}>
      {label}
    </span>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container rounded-3xl p-6 w-full max-w-sm shadow-xl">
        <span className="material-symbols-rounded text-4xl text-error block mb-3">
          person_off
        </span>
        <h3 className="font-bold text-on-surface text-lg mb-1">Suspend {name}?</h3>
        <p className="text-sm text-on-surface-variant mb-6">
          This user will lose access immediately. This can be reversed by approving them again.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-outline text-on-surface text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-error text-on-error text-sm font-medium"
          >
            Suspend
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onApprove,
  onSuspend,
  isApproving,
  isSuspending,
}: {
  user: AdminUser;
  onApprove: () => void;
  onSuspend: () => void;
  isApproving: boolean;
  isSuspending: boolean;
}) {
  return (
    <div className="bg-surface-container rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-on-surface truncate">{user.name}</p>
          <p className="text-xs text-on-surface-variant">{user.email}</p>
          <p className="text-xs text-on-surface-variant">{user.enrollmentNo}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Chip label={user.status}  style={STATUS_STYLE[user.status]  ?? ''} />
          <Chip label={user.role}    style={ROLE_STYLE[user.role]      ?? ''} />
        </div>
      </div>

      {user.department && (
        <p className="text-xs text-on-surface-variant">
          <span className="material-symbols-rounded text-xs align-middle mr-0.5">corporate_fare</span>
          {user.department.name}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        {user.status === 'pending' && (
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium
                       disabled:opacity-50 transition-opacity"
          >
            {isApproving ? 'Approving…' : 'Approve'}
          </button>
        )}
        {user.status !== 'suspended' && user.role !== 'admin' && (
          <button
            onClick={onSuspend}
            disabled={isSuspending}
            className="flex-1 py-2 rounded-xl border border-error text-error text-sm font-medium
                       disabled:opacity-50 transition-opacity"
          >
            {isSuspending ? 'Suspending…' : 'Suspend'}
          </button>
        )}
        {user.status === 'suspended' && (
          <p className="text-xs text-on-surface-variant self-center">Account suspended</p>
        )}
      </div>
    </div>
  );
}

// ── Filter chips ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: 'All',       value: undefined },
  { label: 'Pending',   value: 'pending' },
  { label: 'Active',    value: 'active' },
  { label: 'Suspended', value: 'suspended' },
] as const;

// ── UserManagementPage ────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | undefined>('pending');
  const [search, setSearch] = useState('');
  const [confirmSuspend, setConfirmSuspend] = useState<AdminUser | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useAdminUsers({ status: statusFilter, q: search || undefined });

  const approveMutation = useApproveUser();
  const suspendMutation = useSuspendUser();

  const users = data?.pages.flatMap((p) => p.users) ?? [];

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-container-high px-4 pt-14 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/admin')}
            className="material-symbols-rounded text-on-surface-variant"
          >
            arrow_back
          </button>
          <h1 className="text-xl font-bold text-on-surface">User Management</h1>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, enrollment…"
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-xl text-sm
                       text-on-surface placeholder:text-on-surface-variant outline-none
                       focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${statusFilter === f.value
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-surface-container animate-pulse" />
            ))
          : users.length === 0
            ? (
              <div className="text-center py-20">
                <span className="material-symbols-rounded text-5xl text-on-surface-variant/40 block mb-2">
                  group
                </span>
                <p className="text-on-surface-variant">No users match this filter</p>
              </div>
            )
            : users.map((u) => (
              <UserRow
                key={u._id}
                user={u}
                onApprove={() => approveMutation.mutate(u._id)}
                onSuspend={() => setConfirmSuspend(u)}
                isApproving={approveMutation.isPending && approveMutation.variables === u._id}
                isSuspending={suspendMutation.isPending && suspendMutation.variables === u._id}
              />
            ))
        }

        {hasNextPage && (
          <button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="py-3 rounded-2xl bg-surface-container text-on-surface-variant text-sm
                       font-medium disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>

      {/* Suspend confirm dialog */}
      {confirmSuspend && (
        <ConfirmDialog
          name={confirmSuspend.name}
          onCancel={() => setConfirmSuspend(null)}
          onConfirm={() => {
            suspendMutation.mutate(confirmSuspend._id);
            setConfirmSuspend(null);
          }}
        />
      )}
    </div>
  );
}
