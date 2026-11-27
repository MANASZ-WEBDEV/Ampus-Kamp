import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context/AuthContext';
import * as authApi from '@/features/auth/api/auth.api';
import type { UserGender } from '@/features/auth/api/auth.api';
import * as credentialsApi from '@/features/credentials/api/credentials.api';
import { credentialKeys } from '@/features/credentials/hooks/useCredentials';
import type { Credential, CredTier } from '@/features/credentials/types';
import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_INFO: Record<CredTier, { label: string; cls: string }> = {
  elite_gold:   { label: 'Gold / 1st Place',  cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  elite_silver: { label: 'Silver / Finalist', cls: 'bg-teal-50 text-teal-700 border border-teal-200' },
  elite:        { label: 'Certified',         cls: 'bg-primary/10 text-primary border border-primary/20' },
  pass:         { label: 'Participation',     cls: 'bg-surface-container text-on-surface-variant border border-outline-variant/30' },
};

const GENDER_LABEL: Record<UserGender, string> = {
  male:              'Male',
  female:            'Female',
  other:             'Other',
  prefer_not_to_say: 'Prefer not to say',
};

function getCredentialTitle(cred: Credential): string {
  if (cred.otherCourseName) return cred.otherCourseName;
  if (cred.courseId && typeof cred.courseId === 'object') return cred.courseId.name;
  return 'Academic Credential';
}

function getVerifierName(cred: Credential): string {
  const vb = cred.verification?.verifiedBy;
  if (vb && typeof vb === 'object' && 'name' in vb) return (vb as { name: string }).name;
  if (typeof vb === 'string' && vb) return vb;
  return 'Faculty';
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [credTab, setCredTab] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    staleTime: 60_000,
  });

  const role = profile?.role ?? authUser?.role;
  const isFaculty = role === 'faculty' || role === 'dept_head' || role === 'admin';

  const { data: credentials = [], isLoading: credsLoading } = useQuery<Credential[]>({
    queryKey: credentialKeys.mine(),
    queryFn: credentialsApi.getMyCredentials,
    enabled: !isFaculty,
    staleTime: 15_000,
  });

  const [editState, setEditState] = useState({
    skills:       [] as string[],
    phone:        '',
    phoneVisible: false,
    allowInvites: true,
    gender:       null as UserGender | null,
  });

  const updateMutation = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditing(false);
      showToast('Profile saved');
    },
  });

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2400);
  }

  function openEditModal() {
    updateMutation.reset();
    setEditState({
      skills:       profile?.skills ?? [],
      phone:        profile?.phone ?? '',
      phoneVisible: profile?.phoneVisible ?? false,
      allowInvites: profile?.allowInvites ?? true,
      gender:       profile?.gender ?? null,
    });
    setIsEditing(true);
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || editState.skills.includes(s)) return;
    setEditState(prev => ({ ...prev, skills: [...prev.skills, s] }));
    setSkillInput('');
  }

  function removeSkill(skill: string) {
    setEditState(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  }

  function handleSave() {
    const trimmedPhone = editState.phone.trim();
    updateMutation.mutate({
      skills:       isFaculty ? undefined : editState.skills,
      phone:        trimmedPhone || null,
      allowInvites: editState.allowInvites,
      gender:       editState.gender,
    });
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const dept = profile?.department ?? authUser?.department;
  const deptName =
    typeof dept === 'object' && dept !== null
      ? (dept as { name: string }).name
      : String(dept ?? '—');

  const rawName = profile?.name ?? authUser?.name ?? 'User';
  const initials = rawName
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  const enrollmentNo = profile?.enrollmentNo ?? authUser?.enrollmentNo ?? '—';
  const yearLabel =
    role === 'student' && profile?.year ? `Year ${profile.year}` : null;

  const verifiedCreds  = credentials.filter(c => c.verification?.status === 'verified');
  const pendingCreds   = credentials.filter(c => c.verification?.status === 'pending');
  const rejectedCreds  = credentials.filter(c => c.verification?.status === 'rejected');

  const visibleCredentials =
    credTab === 'all'      ? credentials :
    credTab === 'verified' ? verifiedCreds :
    credTab === 'pending'  ? pendingCreds :
    rejectedCreds;

  const skills = profile?.skills ?? [];
  const genderValue = profile?.gender;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary-fixed border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      <AppBar subtitle="Profile & Credentials" />

      {/* Toast */}
      <div
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 flex items-center gap-2 px-5 py-2.5 bg-inverse-surface text-inverse-on-surface rounded-full shadow-lg text-sm font-medium ${
          toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <span className="material-symbols-outlined text-primary-fixed-dim text-[18px]">check_circle</span>
        {toastMsg}
      </div>

      <main className="w-full pt-16 max-w-4xl mx-auto px-4 md:px-6 pb-28 lg:pb-12">

        {/* ═══════════════════════════════════════════════════════════════
            HERO IDENTITY CARD  (full width, horizontal layout)
        ═══════════════════════════════════════════════════════════════ */}
        <div className="mt-6 bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
          {/* Top accent strip */}
          <div className="h-1.5 bg-primary rounded-t-2xl" />

          <div className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-primary-container flex items-center justify-center text-3xl font-bold text-on-primary shadow-sm">
                  {initials || <span className="material-symbols-outlined text-4xl">person</span>}
                </div>
                {profile?.emailVerified && (
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                    <span className="material-symbols-outlined text-white text-[14px]">verified</span>
                  </div>
                )}
              </div>

              {/* Identity info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold text-on-surface">{rawName}</h1>
                      {profile?.emailVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                          <span className="material-symbols-outlined text-[12px]">verified</span>
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-base text-primary font-semibold mt-0.5">{deptName}</p>
                    <p className="text-sm text-on-surface-variant mt-0.5">
                      {[yearLabel, `ID: ${enrollmentNo}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={openEditModal}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined text-[17px]">edit</span>
                      Edit Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-error-container hover:text-on-error-container text-on-surface-variant text-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined text-[17px]">logout</span>
                      Sign Out
                    </button>
                  </div>
                </div>

                {/* Info row */}
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-1.5 text-sm text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">alternate_email</span>
                    <span>{profile?.email ?? '—'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">phone</span>
                    {profile?.phone ? (
                      <span>{profile.phone}</span>
                    ) : (
                      <button onClick={openEditModal} className="text-primary hover:underline">
                        + Add WhatsApp number
                      </button>
                    )}
                  </div>

                  {genderValue ? (
                    <div className="flex items-center gap-1.5 text-sm text-on-surface">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">person</span>
                      <span>{GENDER_LABEL[genderValue]}</span>
                    </div>
                  ) : (
                    <button
                      onClick={openEditModal}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span>
                      + Add gender
                    </button>
                  )}
                </div>

                {/* Skills row */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {skills.length > 0 ? (
                    skills.map(s => (
                      <span
                        key={s}
                        className="px-3 py-1 rounded-full bg-surface-container text-on-surface text-sm border border-outline-variant/30"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-on-surface-variant italic">No skills yet</span>
                  )}
                  <button
                    onClick={openEditModal}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-primary text-sm hover:bg-primary/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    Edit skills
                  </button>
                </div>
              </div>
            </div>

            {/* Phone visibility toggle row */}
            <div className="mt-5 pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">shield_person</span>
                <div>
                  <span className="text-sm font-medium text-on-surface">Share phone on team connect</span>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {profile?.phoneVisible
                      ? 'On: Phone shared with teammates after a mutual accept.'
                      : 'Off: Phone stays hidden. Teammates can reach you by email.'}
                  </p>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={profile?.phoneVisible}
                onClick={() => {
                  const next = !profile?.phoneVisible;
                  authApi.updateMe({ phoneVisible: next }).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['me'] });
                    showToast(next ? 'Phone now visible to accepted teammates' : 'Phone hidden');
                  });
                }}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                  profile?.phoneVisible ? 'bg-primary' : 'bg-surface-container-high'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 mt-1 ${
                    profile?.phoneVisible ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            KPI STRIP  (students only)
        ═══════════════════════════════════════════════════════════════ */}
        {!isFaculty && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              {
                label: 'Verified',
                value: verifiedCreds.length,
                sub: 'credentials',
                icon: 'verified_user',
                iconCls: 'text-emerald-600',
              },
              {
                label: 'Pending Review',
                value: pendingCreds.length,
                sub: 'in queue',
                icon: 'pending',
                iconCls: 'text-amber-500',
              },
              {
                label: 'Rejected',
                value: rejectedCreds.length,
                sub: 'need resubmit',
                icon: 'error',
                iconCls: 'text-error',
              },
            ].map(k => (
              <div
                key={k.label}
                className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-center gap-3"
              >
                <span className={`material-symbols-outlined text-[28px] ${k.iconCls}`}>{k.icon}</span>
                <div>
                  <div className="text-2xl font-bold text-on-surface leading-none">{k.value}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">{k.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            CREDENTIALS  (students only)
        ═══════════════════════════════════════════════════════════════ */}
        {!isFaculty && (
          <div className="mt-6 flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Credentials &amp; Achievements</h2>
                <p className="text-sm text-on-surface-variant mt-0.5">
                  Your submitted certifications and faculty verification status.
                </p>
              </div>
              <button
                onClick={() => navigate('/achievements/add')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-sm hover:bg-primary-container transition-all active:scale-[0.98] flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Add Achievement
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'all' as const,      label: 'All',            count: credentials.length,  icon: null },
                { id: 'verified' as const, label: 'Verified',       count: verifiedCreds.length, icon: 'check_circle', iconCls: 'text-emerald-600' },
                { id: 'pending' as const,  label: 'Pending',        count: pendingCreds.length,  icon: 'pending',      iconCls: 'text-amber-500' },
                { id: 'rejected' as const, label: 'Rejected',       count: rejectedCreds.length, icon: 'error',        iconCls: 'text-error' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCredTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    credTab === tab.id
                      ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  {tab.icon && (
                    <span className={`material-symbols-outlined text-[15px] ${credTab === tab.id ? '' : tab.iconCls}`}>
                      {tab.icon}
                    </span>
                  )}
                  {tab.label}
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                      credTab === tab.id
                        ? 'bg-primary/20'
                        : 'bg-surface-container text-outline'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Credential cards */}
            {credsLoading ? (
              <div className="bg-surface-container-lowest rounded-2xl p-10 flex justify-center shadow-sm">
                <div className="w-8 h-8 rounded-full border-4 border-primary-fixed border-t-primary animate-spin" />
              </div>
            ) : visibleCredentials.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-10 text-center shadow-sm flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-[48px] text-outline">workspace_premium</span>
                <div>
                  <p className="text-base font-semibold text-on-surface">
                    {credentials.length === 0
                      ? 'No credentials submitted yet'
                      : `No ${credTab} credentials`}
                  </p>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Submit a certificate or competition result for faculty verification.
                  </p>
                </div>
                {credentials.length === 0 && (
                  <button
                    onClick={() => navigate('/achievements/add')}
                    className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold"
                  >
                    Add New Achievement
                  </button>
                )}
              </div>
            ) : (
              visibleCredentials.map(cred => {
                const status   = cred.verification?.status ?? 'pending';
                const tierInfo = TIER_INFO[cred.tier] ?? TIER_INFO.elite;

                return (
                  <article
                    key={cred._id}
                    className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            status === 'verified'
                              ? 'bg-emerald-50 text-emerald-700'
                              : status === 'rejected'
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[22px]">
                            {status === 'verified' ? 'verified' : status === 'rejected' ? 'error' : 'school'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-on-surface">
                              {getCredentialTitle(cred)}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                status === 'verified'
                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                  : status === 'rejected'
                                  ? 'text-error bg-error-container/60 border border-error/20'
                                  : 'text-amber-700 bg-amber-50 border border-amber-200'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[11px]">
                                {status === 'verified' ? 'verified' : status === 'rejected' ? 'error' : 'pending'}
                              </span>
                              {status === 'verified' ? 'Verified' : status === 'rejected' ? 'Rejected' : 'Pending Review'}
                            </span>
                          </div>
                          <p className="text-sm text-on-surface-variant mt-0.5">{cred.issuer}</p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${tierInfo.cls}`}>
                        {tierInfo.label}
                      </span>
                    </div>

                    {/* Fact grid */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-t border-b border-outline-variant/20">
                      <div>
                        <div className="text-[11px] text-outline uppercase tracking-wider font-medium">Session &amp; Year</div>
                        <div className="text-sm font-semibold text-on-surface mt-1">
                          {cred.session.includes(String(cred.year)) ? cred.session : `${cred.session} ${cred.year}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-outline uppercase tracking-wider font-medium">Certificate ID</div>
                        <div className="text-sm font-semibold text-primary mt-1 break-all font-mono">{cred.certificateId}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-outline uppercase tracking-wider font-medium">
                          {status === 'verified' ? 'Verified By' : 'Submitted'}
                        </div>
                        <div className="text-sm font-semibold text-on-surface mt-1">
                          {status === 'verified'
                            ? `${getVerifierName(cred)} · ${formatDate(cred.verification?.verifiedAt)}`
                            : formatDate(cred.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Rejection note */}
                    {status === 'rejected' && cred.verification?.reason && (
                      <div className="mt-4 bg-error-container/30 rounded-xl p-4 flex items-start gap-2">
                        <span className="material-symbols-outlined text-[20px] text-error flex-shrink-0 mt-0.5">warning</span>
                        <div>
                          <div className="text-sm text-error font-bold mb-0.5">Reviewer Note</div>
                          <p className="text-sm text-on-surface italic">"{cred.verification.reason}"</p>
                        </div>
                      </div>
                    )}

                    {/* Footer actions */}
                    <div className="mt-4 flex items-center justify-end gap-2">
                      {cred.proofUrl && (
                        <a
                          href={cred.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-medium transition-colors"
                        >
                          <span className="material-symbols-outlined text-[17px]">visibility</span>
                          View Proof
                        </a>
                      )}
                      {status === 'rejected' && (
                        <button
                          onClick={() => navigate('/achievements/add', { state: { resubmit: cred } })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-sm font-semibold transition-all shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[17px]">upload_file</span>
                          Resubmit
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

      </main>

      {/* ═══════════════════════════════════════════════════════════════
          EDIT MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6">
              <h3 className="text-lg font-bold text-on-surface">Edit Profile</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-6 pb-6 flex flex-col gap-5">
              {/* Gender */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-2 block">Gender</label>
                <p className="text-xs text-on-surface-variant mb-2">
                  Used to show gender-quota eligibility for hackathons with female mandatory requirements.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['male',              'Male'],
                      ['female',            'Female'],
                      ['other',             'Other'],
                      ['prefer_not_to_say', 'Prefer not to say'],
                    ] as [UserGender, string][]
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEditState(p => ({ ...p, gender: val }))}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                        editState.gender === val
                          ? 'bg-primary-container text-on-primary border-primary/40 font-semibold'
                          : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone-input" className="text-sm font-semibold text-on-surface mb-1.5 block">
                  WhatsApp / Phone Number
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  value={editState.phone}
                  onChange={e => setEditState(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+919876543210"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  7–15 digits, optional + prefix. Shared only when you turn on the phone toggle.
                </p>
              </div>

              {/* Skills (students only) */}
              {!isFaculty && (
                <div>
                  <label className="text-sm font-semibold text-on-surface mb-2 block">Skills</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="e.g. React, Python… then Enter"
                      className="flex-1 px-4 py-3 rounded-xl bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={addSkill}
                      className="px-4 py-3 rounded-xl bg-primary-container text-on-primary text-sm font-semibold hover:opacity-90"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editState.skills.map(s => (
                      <div
                        key={s}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface text-sm"
                      >
                        <span>{s}</span>
                        <button onClick={() => removeSkill(s)} className="text-outline hover:text-error transition-colors">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allow invites */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-on-surface">
                    {isFaculty ? 'Allow student messages' : 'Allow team invites'}
                  </span>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Others can send you join requests &amp; invitations.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={editState.allowInvites}
                  onClick={() => setEditState(p => ({ ...p, allowInvites: !p.allowInvites }))}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                    editState.allowInvites ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 mt-1 ${
                      editState.allowInvites ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Error */}
              {updateMutation.isError && (
                <p className="text-sm text-error bg-error-container/30 px-4 py-2.5 rounded-xl">
                  Could not save. Please check your phone number format (7–15 digits).
                </p>
              )}

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {updateMutation.isPending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    Saving…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">save</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="profile" />
    </div>
  );
}
