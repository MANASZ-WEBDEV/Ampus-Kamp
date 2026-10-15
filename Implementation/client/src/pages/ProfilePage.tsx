import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context/AuthContext';
import * as authApi from '@/features/auth/api/auth.api';
import { ApiError } from '@/lib/apiClient';
import { BottomNav } from '@/components/layout/BottomNav';

export default function ProfilePage() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Full profile (includes phone)
  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    staleTime: 60_000,
  });

  const [editState, setEditState] = useState({
    skills: profile?.skills ?? [],
    phoneVisible: profile?.phoneVisible ?? false,
    allowInvites: profile?.allowInvites ?? true,
  });

  const updateMutation = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditing(false);
      showToast('Profile updated successfully');
    },
  });

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2400);
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

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const dept = profile?.department;
  const deptName = typeof dept === 'object' && dept !== null ? (dept as { name: string }).name : String(dept ?? '');
  const deptCode = typeof dept === 'object' && dept !== null ? (dept as { code: string }).code : '';
  const initials = (profile?.name ?? authUser?.name ?? '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <div className="flex-1 px-4 pt-16 pb-20 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface-container-lowest rounded-xl p-4 animate-pulse h-28" />
          ))}
        </div>
        <BottomNav active="profile" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col font-body-md text-body-md text-on-surface antialiased">
      {/* Toast */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 flex items-center gap-2 px-4 py-2 bg-inverse-surface text-inverse-on-surface rounded-full shadow-lg font-label-md text-label-md ${toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <span className="material-symbols-outlined text-primary-fixed-dim text-lg">verified</span>
        <span>{toastMsg}</span>
      </div>

      <main className="flex-1 w-full pt-4 pb-24 flex flex-col gap-3 max-w-2xl mx-auto px-4">

        {/* ── Profile Hero Card ────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm p-4">
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-primary-fixed/20 blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between relative z-10">
            <div className="flex gap-4 items-center">
              {/* Avatar */}
              <div className="relative">
                <div className="w-[72px] h-[72px] rounded-full bg-primary-container flex items-center justify-center text-on-primary font-headline-lg text-headline-lg font-bold shadow-sm">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-col min-w-0">
                <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold truncate">
                  {profile?.name ?? authUser?.name}
                </h1>
                <p className="font-label-lg text-label-lg text-primary-container font-semibold">
                  B.Tech {deptName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-on-surface-variant font-code-sm text-code-sm">
                  <span className="bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface font-semibold">
                    {profile?.year ? `${profile.year}${['st', 'nd', 'rd'][profile.year - 1] ?? 'th'} Year` : deptCode}
                  </span>
                  <span>•</span>
                  <span>{profile?.enrollmentNo ?? authUser?.enrollmentNo}</span>
                </div>
              </div>
            </div>

            {/* Share */}
            <button
              id="profile-share-btn"
              onClick={() => showToast('Portfolio card link copied!')}
              className="w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary active:scale-95 transition-all flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">share</span>
            </button>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2 mt-4 relative z-10">
            <button id="edit-profile-btn"
              onClick={() => {
                setEditState({ skills: profile?.skills ?? [], phoneVisible: profile?.phoneVisible ?? false, allowInvites: profile?.allowInvites ?? true });
                setIsEditing(true);
              }}
              className="h-11 px-4 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              Edit Profile
            </button>
            <button id="logout-btn" onClick={handleLogout}
              className="h-11 px-4 rounded-xl bg-surface-container-low text-on-surface hover:bg-error-container hover:text-on-error-container font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sign Out
            </button>
          </div>
        </section>

        {/* ── Stats Grid ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-3 gap-2">
          {[
            { icon: 'military_tech', value: '—', label: 'Milestones', color: 'bg-surface-container-low text-primary-container', fill: true },
            { icon: 'school', value: '—', label: 'Verified Credits', color: 'bg-primary-fixed text-on-primary-fixed-variant', fill: false },
            { icon: 'rocket_launch', value: '—', label: 'Active Squads', color: 'bg-secondary-fixed text-on-secondary-fixed-variant', fill: true },
          ].map(({ icon, value, label, color, fill }) => (
            <div key={icon} className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center mb-2`}>
                <span className="material-symbols-outlined text-[20px]" style={fill ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
              </div>
              <div>
                <span className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold">{value}</span>
                <p className="font-label-sm text-label-sm text-on-surface-variant leading-tight mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Privacy / Contact Guard ──────────────────────────────────── */}
        <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <div>
                <span className="font-label-lg text-label-lg text-on-surface font-semibold">Phone Visibility</span>
                <span className="font-label-md text-label-md text-on-surface-variant block">Confidential Contact Shield</span>
              </div>
            </div>
            {/* Toggle */}
            <button
              id="phone-privacy-toggle"
              role="switch"
              aria-checked={profile?.phoneVisible}
              onClick={() => {
                const next = !profile?.phoneVisible;
                authApi.updateMe({ phoneVisible: next }).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['me'] });
                  showToast(next ? 'Phone visible to squad teammates' : 'Phone shielded from all peers');
                });
              }}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${profile?.phoneVisible ? 'bg-primary-container' : 'bg-surface-container-high'}`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-container-lowest shadow-md transition duration-200 ease-in-out mt-1 ${profile?.phoneVisible ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-start gap-2 bg-surface-container-low p-3 rounded-xl">
            <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">shield</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              <strong className="text-on-surface">Protects your personal contact:</strong> Phone details are hidden until you mutually join an approved hackathon or incubator squad.
            </p>
          </div>
        </section>

        {/* ── Skills ────────────────────────────────────────────────────── */}
        <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-[20px]">hub</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Skills & Proficiencies</h2>
            </div>
            <span className="font-label-sm text-label-sm text-primary-container bg-primary-fixed/40 px-2 py-0.5 rounded-full font-semibold">
              {profile?.skills?.length ?? 0} Listed
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(profile?.skills ?? []).map(skill => (
              <div key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md shadow-sm">
                <span>{skill}</span>
                <span className="material-symbols-outlined text-primary-container text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
            ))}
            <button id="add-skill-btn" onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant font-label-md text-label-md hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Skill</span>
            </button>
          </div>
        </section>

        {/* ── Account info ────────────────────────────────────────────── */}
        <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary-container text-[20px]">manage_accounts</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Account Details</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Email', value: profile?.email, icon: 'alternate_email' },
              { label: 'Role', value: profile?.role, icon: 'badge' },
              { label: 'Status', value: profile?.status, icon: 'circle' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-surface-container-high last:border-0">
                <div className="flex items-center gap-2 text-on-surface-variant font-label-lg text-label-lg">
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  {label}
                </div>
                <span className="font-code-sm text-code-sm text-on-surface">{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Edit Profile</h3>
              <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Skills editor */}
            <div>
              <label className="font-label-lg text-label-lg text-on-surface mb-2 block">Skills</label>
              <div className="flex gap-2 mb-3">
                <input
                  id="skill-input"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Type a skill and press Enter"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={addSkill} className="px-4 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg hover:opacity-90 active:scale-95 transition-all">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editState.skills.map(s => (
                  <div key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md">
                    <span>{s}</span>
                    <button onClick={() => removeSkill(s)} className="text-outline hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-on-surface">Allow team invites</span>
              <button role="switch" aria-checked={editState.allowInvites}
                onClick={() => setEditState(p => ({ ...p, allowInvites: !p.allowInvites }))}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${editState.allowInvites ? 'bg-primary-container' : 'bg-surface-container-high'}`}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-container-lowest shadow-md transition duration-200 mt-1 ${editState.allowInvites ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Save */}
            <button
              id="save-profile-btn"
              onClick={() => updateMutation.mutate({ skills: editState.skills, allowInvites: editState.allowInvites })}
              disabled={updateMutation.isPending}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {updateMutation.isPending ? (
                <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Saving…</>
              ) : (
                <><span className="material-symbols-outlined text-xl">save</span>Save Changes</>
              )}
            </button>
          </div>
        </div>
      )}

      <BottomNav active="profile" />
    </div>
  );
}
