import { useCallback, useEffect, useRef, useState } from 'react';
import { getRoster } from '../services/api.js';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
};

const getAge = (value) => {
  if (!value) return '—';
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 && age < 130 ? `${age}` : '—';
};

export default function RosterModal({ hhId, onClose }) {
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  const load = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    getRoster(hhId, controller.signal)
      .then((data) => setRoster(data))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [hhId, attempt]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusables = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const location = roster
    ? [roster.barangay, roster.municipality, roster.province].filter(Boolean).join(', ')
    : '';

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roster-title"
      >
        <header className="modal-header">
          <div className="modal-heading">
            <span className="modal-eyebrow">Household roster</span>
            <h2 id="roster-title">HHID {hhId}</h2>
            {roster && (
              <p className="modal-subtitle">
                {location} <span aria-hidden="true">·</span> {roster.count} member
                {roster.count === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <button
            type="button"
            className="modal-close"
            ref={closeRef}
            onClick={onClose}
            aria-label="Close family roster"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="modal-body">
          {loading && (
            <div className="modal-state" aria-busy="true">
              <span className="modal-spinner" aria-hidden="true" />
              <p>Loading family roster…</p>
            </div>
          )}

          {!loading && error && (
            <div className="modal-state" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && roster && (
            <div className="roster-table-wrap">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Member name</th>
                    <th scope="col">Birthdate</th>
                    <th scope="col">Age</th>
                    <th scope="col">Sex</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.members.map((member, index) => {
                    const fullName = [member.first_name, member.middle_name, member.last_name]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <tr key={`${member.hh_id}-${index}`}>
                        <td className="roster-index">{index + 1}</td>
                        <td>
                          <span className="roster-name">
                            {fullName || 'Name not recorded'}
                            {member.ext_name ? ` ${member.ext_name}` : ''}
                          </span>
                        </td>
                        <td>{formatDate(member.birthdate)}</td>
                        <td>{getAge(member.birthdate)}</td>
                        <td>
                          {member.sex === 'M'
                            ? 'Male'
                            : member.sex === 'F'
                              ? 'Female'
                              : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {roster.count > roster.members.length && (
                <p className="roster-note">
                  Showing {roster.members.length} of {roster.count} members.
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <span>All records are read-only.</span>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
