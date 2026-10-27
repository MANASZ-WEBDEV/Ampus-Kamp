import { useState, useEffect, useRef, useCallback } from 'react';
import { useCourseSearch } from '../hooks/useCredentials';
import type { Course } from '../types';

interface Props {
  value:    Course | null | undefined;   // undefined = nothing selected; null = "Other"
  onSelect: (course: Course | null | undefined) => void;
}

const DEBOUNCE_MS = 300;

/**
 * CourseSearchInput
 * – Text search (300 ms debounce) against the course catalog.
 * – "Other / Not listed" escape hatch → passes null to onSelect.
 * – Keyboard-navigable dropdown (↑ ↓ Enter Escape).
 */
export function CourseSearchInput({ value, onSelect }: Props) {
  const [query,       setQuery]       = useState(value?.name ?? '');
  const [debouncedQ,  setDebouncedQ]  = useState('');
  const [open,        setOpen]        = useState(false);
  const [focused,     setFocused]     = useState(-1);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLUListElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout>>();

  const { data: courses = [], isFetching } = useCourseSearch(debouncedQ || undefined);

  // Debounce: update debouncedQ 300ms after query changes
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQ(query), DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  // Sync display when external value changes
  useEffect(() => {
    if (value) setQuery(value.name);
    else if (value === null && query !== 'Other / Not listed') {
      // keeps the "Other" label if already chosen
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSelect = useCallback((course: Course | null | undefined) => {
    onSelect(course);
    setQuery(course ? course.name : course === null ? 'Other / Not listed' : '');
    setOpen(false);
    setFocused(-1);
  }, [onSelect]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const total = courses.length + 1; // +1 for "Other"
    if (!open) { if (e.key === 'ArrowDown') setOpen(true); return; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setFocused(f => Math.min(f + 1, total - 1)); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setFocused(f => Math.max(f - 1, -1)); }
    if (e.key === 'Escape')     { setOpen(false); setFocused(-1); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (focused === courses.length) { handleSelect(null); return; }
      if (focused >= 0) { handleSelect(courses[focused]); return; }
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focused >= 0 && listRef.current) {
      const el = listRef.current.children[focused] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focused]);

  const isOtherSelected = value === null && query === 'Other / Not listed';

  return (
    <div className="relative w-full" role="combobox" aria-expanded={open}>
      {/* Search input */}
      <div className={`relative flex items-center gap-2 px-4 py-3 rounded-xl transition-all
        bg-surface-container-low
        ${open ? 'ring-2 ring-primary/40' : 'ring-1 ring-outline-variant/30 focus-within:ring-2 focus-within:ring-primary/30'}`}>
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">
          {isFetching ? 'sync' : 'search'}
        </span>
        <input
          ref={inputRef}
          id="course-search-input"
          type="text"
          autoComplete="off"
          value={query}
          placeholder="Search course name, e.g. NPTEL Python…"
          className="flex-1 bg-transparent text-on-surface text-sm font-body-md
                     placeholder:text-on-surface-variant/50 focus:outline-none"
          onChange={e => { setQuery(e.target.value); setOpen(true); setFocused(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          aria-label="Search course catalog"
          aria-autocomplete="list"
        />
        {/* Clear */}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onSelect(undefined); setOpen(true); inputRef.current?.focus(); }}
            className="shrink-0 text-on-surface-variant/60 hover:text-on-surface transition-colors"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl
                     bg-surface-container shadow-[0_8px_24px_rgba(0,0,0,0.12)]
                     border border-outline-variant/20 divide-y divide-outline-variant/10"
          style={{ animation: 'slideUpFade 150ms ease-out' }}
        >
          {/* Course results */}
          {courses.map((course, i) => (
            <li
              key={course._id}
              role="option"
              aria-selected={value?._id === course._id}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                ${focused === i ? 'bg-primary/8' : 'hover:bg-surface-container-high'}`}
              onMouseEnter={() => setFocused(i)}
              onMouseDown={() => handleSelect(course)}
            >
              <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-on-surface truncate">{course.name}</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  {course.issuer}
                  {course.code ? ` · ${course.code}` : ''}
                  {' · '}
                  <span className="capitalize">{course.category.replace('_', ' ')}</span>
                </p>
              </div>
              {course.verificationMethod === 'issuer_qr' && (
                <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded-md bg-tertiary/10 text-tertiary
                                 text-[10px] font-semibold uppercase tracking-wide">
                  QR
                </span>
              )}
            </li>
          ))}

          {/* Empty state */}
          {!isFetching && courses.length === 0 && query.length > 0 && (
            <li className="px-4 py-3 text-sm text-on-surface-variant/60 italic">
              No courses found for "{query}"
            </li>
          )}

          {/* "Other" escape hatch — always at bottom */}
          <li
            role="option"
            aria-selected={isOtherSelected}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
              ${focused === courses.length ? 'bg-secondary/8' : 'hover:bg-surface-container-high'}`}
            onMouseEnter={() => setFocused(courses.length)}
            onMouseDown={() => handleSelect(null)}
          >
            <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
              help_outline
            </span>
            <div>
              <p className="text-sm font-medium text-on-surface">Other / Not listed</p>
              <p className="text-[11px] text-on-surface-variant">
                Will go to admin queue for manual review
              </p>
            </div>
          </li>
        </ul>
      )}

      {/* Selected chip */}
      {value && (
        <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg
                        bg-primary/8 border border-primary/20 w-fit">
          <span className="material-symbols-outlined text-[14px] text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          <span className="text-[11px] font-semibold text-primary">{value.issuer}</span>
          <span className="text-[11px] text-on-surface-variant">·</span>
          <span className="text-[11px] text-on-surface">{value.name}</span>
        </div>
      )}
      {isOtherSelected && (
        <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg
                        bg-secondary/8 border border-secondary/20 w-fit">
          <span className="material-symbols-outlined text-[14px] text-secondary">help_outline</span>
          <span className="text-[11px] font-semibold text-secondary">Other</span>
          <span className="text-[11px] text-on-surface-variant">—</span>
          <span className="text-[11px] text-on-surface">Admin review queue</span>
        </div>
      )}
    </div>
  );
}
