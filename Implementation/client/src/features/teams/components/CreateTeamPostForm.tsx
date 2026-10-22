import { useState, type FormEvent } from 'react';
import { useCreateTeamPost } from '../hooks/useTeams';
import type { CreateTeamPostInput } from '../types';

interface CreateTeamPostFormProps {
  eventId:  string;
  onSuccess: () => void;
  onCancel:  () => void;
}

const MAX_ROLES = 5;

export function CreateTeamPostForm({ eventId, onSuccess, onCancel }: CreateTeamPostFormProps) {
  const { mutateAsync: createPost, isPending, error } = useCreateTeamPost();

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [spotsTotal,  setSpotsTotal]  = useState(2);
  const [roleInput,   setRoleInput]   = useState('');
  const [roles,       setRoles]       = useState<string[]>([]);
  const [formError,   setFormError]   = useState('');

  function addRole() {
    const trimmed = roleInput.trim();
    if (!trimmed || roles.includes(trimmed) || roles.length >= MAX_ROLES) return;
    setRoles(r => [...r, trimmed]);
    setRoleInput('');
  }

  function removeRole(role: string) {
    setRoles(r => r.filter(x => x !== role));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const input: CreateTeamPostInput = {
      eventId,
      title: title.trim(),
      description: description.trim() || undefined,
      rolesNeeded: roles,
      spotsTotal,
    };
    try {
      await createPost(input);
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create post.');
    }
  }

  const serverError = error instanceof Error ? error.message : null;
  const displayError = formError || serverError;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Error banner */}
      {displayError && (
        <div className="p-3 rounded-xl bg-error-container text-on-error-container
                        font-body-sm text-xs flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
          {displayError}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="tp-title" className="font-label-lg text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">
          Post Title *
        </label>
        <input
          id="tp-title"
          type="text"
          required
          maxLength={100}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Looking for 2 frontend devs for SIH"
          className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface
                     font-body-md text-sm placeholder:text-on-surface-variant/50
                     focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="tp-desc" className="font-label-lg text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">
          Description
          <span className="ml-1 text-on-surface-variant/50 normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="tp-desc"
          rows={3}
          maxLength={500}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What are you working on? What skills are you looking for?"
          className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface
                     font-body-md text-sm placeholder:text-on-surface-variant/50 resize-none
                     focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        <p className="text-right font-label-sm text-[10px] text-on-surface-variant mt-0.5">
          {description.length}/500
        </p>
      </div>

      {/* Spots */}
      <div>
        <label htmlFor="tp-spots" className="font-label-lg text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">
          Team Spots Needed *
        </label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setSpotsTotal(s => Math.max(1, s - 1))}
            className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center
                       text-on-surface hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-[20px]">remove</span>
          </button>
          <span id="tp-spots" className="font-headline-lg text-xl text-on-surface font-bold w-8 text-center">
            {spotsTotal}
          </span>
          <button type="button" onClick={() => setSpotsTotal(s => Math.min(10, s + 1))}
            className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center
                       text-on-surface hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
          <span className="font-body-sm text-xs text-on-surface-variant">members</span>
        </div>
      </div>

      {/* Roles */}
      <div>
        <label className="font-label-lg text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">
          Roles Needed
          <span className="ml-1 text-on-surface-variant/50 normal-case tracking-normal">(up to {MAX_ROLES})</span>
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={roleInput}
            onChange={e => setRoleInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } }}
            maxLength={50}
            placeholder="e.g. Frontend, ML, Designer"
            className="flex-1 px-4 py-2 rounded-xl bg-surface-container-low text-on-surface
                       font-body-md text-sm placeholder:text-on-surface-variant/50
                       focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <button
            type="button"
            onClick={addRole}
            disabled={roles.length >= MAX_ROLES || !roleInput.trim()}
            className="px-3 py-2 rounded-xl bg-primary/10 text-primary font-label-lg text-sm
                       hover:bg-primary/20 transition-all disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {roles.map(role => (
              <button
                key={role}
                type="button"
                onClick={() => removeRole(role)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg
                           bg-secondary/10 text-secondary font-label-sm text-[11px]
                           hover:bg-error/10 hover:text-error transition-all"
              >
                {role}
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-outline-variant/40
                     font-label-lg text-sm text-on-surface-variant
                     hover:border-outline-variant transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary
                     font-label-lg text-sm font-medium
                     hover:bg-primary/90 active:scale-[0.99] transition-all
                     disabled:opacity-50"
        >
          {isPending ? 'Creating…' : 'Create Post'}
        </button>
      </div>
    </form>
  );
}
