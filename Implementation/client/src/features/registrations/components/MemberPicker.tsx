import { useState, useRef, useEffect, useCallback } from 'react';
import { searchStudents, type PersonCard } from '../api/people.api';

interface MemberPickerProps {
  eventId:      string;
  teamSizeMax:  number;
  /** Called each time the selected member list changes */
  onChange:     (members: PersonCard[]) => void;
}

// ── MemberPicker ──────────────────────────────────────────────────────────────
//
// Typeahead that searches students by name via GET /api/v1/people?name=…
// Renders selected members as dismissable chips.
// Respects allowInvites flag — users who disabled invites show a muted indicator.

export function MemberPicker({ eventId, teamSizeMax, onChange }: MemberPickerProps) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<PersonCard[]>([]);
  const [selected, setSelected] = useState<PersonCard[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);

  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const dropRef       = useRef<HTMLDivElement>(null);
  const selectedRef   = useRef<PersonCard[]>(selected); // always current for callbacks
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  // Max invites = teamSize.max - 1 (leader fills one slot)
  const maxInvites = teamSizeMax - 1;
  const selectedIds = new Set(selected.map(p => p.id));

  // ── Debounced search ───────────────────────────────────────────────────────
  const isEmailQuery    = (q: string) => q.includes('@');
  // Email: wait for a complete-looking address; name: wait for >= 2 chars
  const isReadyToSearch = (q: string) =>
    isEmailQuery(q) ? /^[^@]+@[^@]+\.[^@]+/.test(q) : q.trim().length >= 2;

  const runSearch = useCallback(async (q: string) => {
    if (!isReadyToSearch(q)) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const currentIds = new Set(selectedRef.current.map(p => p.id));
      const items = await searchStudents(q, eventId);
      // Filter out already-selected members using the ref (no stale closure)
      setResults(items.filter(p => !currentIds.has(p.id)));
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  // ── Close dropdown on outside click ───────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropRef.current  && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Add / remove ──────────────────────────────────────────────────────────
  function addMember(person: PersonCard) {
    if (selectedIds.has(person.id) || selected.length >= maxInvites) return;
    const next = [...selected, person];
    setSelected(next);
    onChange(next);
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeMember(id: string) {
    const next = selected.filter(p => p.id !== id);
    setSelected(next);
    onChange(next);
  }

  const isFull = selected.length >= maxInvites;

  return (
    <div className="flex flex-col gap-2">
      {/* ── Selected chips ─────────────────────────────────────────────── */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(p => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                         bg-primary/10 border border-primary/20 text-primary
                         font-label-sm text-[11px]"
            >
              <span
                className="material-symbols-outlined text-[13px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                person
              </span>
              {p.name}
              <button
                type="button"
                onClick={() => removeMember(p.id)}
                aria-label={`Remove ${p.name}`}
                className="ml-0.5 rounded-full hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2
                           text-[16px] text-on-surface-variant pointer-events-none">
            search
          </span>
          <input
            ref={inputRef}
            id="member-picker-input"
            type="text"
            value={query}
            disabled={isFull}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            placeholder={
              isFull
                ? `Max ${maxInvites} invite${maxInvites !== 1 ? 's' : ''} reached`
                : 'Name or college email…'
            }
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-container-low
                       text-on-surface font-body-sm text-sm
                       placeholder:text-on-surface-variant/50
                       focus:outline-none focus:ring-2 focus:ring-primary/30
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {loading && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2
                             text-[13px] text-on-surface-variant animate-spin
                             material-symbols-outlined">
              progress_activity
            </span>
          )}
        </div>

        {/* ── Dropdown ─────────────────────────────────────────────────── */}
        {open && results.length > 0 && (
          <div
            ref={dropRef}
            className="absolute z-50 mt-1 w-full rounded-xl border border-outline-variant/20
                       bg-surface-container-lowest shadow-lg overflow-hidden"
          >
            {results.map(person => (
              <button
                key={person.id}
                type="button"
                disabled={!person.allowInvites}
                onClick={() => addMember(person)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left
                           hover:bg-surface-container transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center
                                justify-center shrink-0 text-primary font-bold text-[11px]">
                  {person.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-on-surface truncate">
                    {person.name}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {person.department.code}
                    {person.year ? ` · ${person.year}${['st','nd','rd'][person.year-1]??'th'} yr` : ''}
                  </span>
                </div>

                {/* Invite status */}
                {!person.allowInvites ? (
                  <span className="text-[11px] text-on-surface-variant shrink-0">
                    Invites off
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                    person_add
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* No results state */}
        {open && !loading && results.length === 0 && isReadyToSearch(query) && (
          <div
            ref={dropRef}
            className="absolute z-50 mt-1 w-full rounded-xl border border-outline-variant/20
                       bg-surface-container-lowest shadow-lg px-4 py-3"
          >
            <p className="text-xs text-on-surface-variant">
              {isEmailQuery(query)
                ? `No account found for "${query}". Your friend needs to sign up first.`
                : `No students found for "${query}". They must have an account on this platform.`
              }
            </p>
          </div>
        )}
      </div>

      {/* ── Helper text ────────────────────────────────────────────────── */}
      <p className="font-label-sm text-xs text-on-surface-variant">
        {selected.length}/{maxInvites} invite{maxInvites !== 1 ? 's' : ''} added
        {' '}· Search by name or college email. Friends must have an account to accept.
      </p>
    </div>
  );
}
