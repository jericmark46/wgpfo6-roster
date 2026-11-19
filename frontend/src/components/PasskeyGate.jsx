import { useEffect, useRef, useState } from 'react';
import { verifyPasskey } from '../services/api.js';

export default function PasskeyGate({ onUnlock }) {
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reveal, setReveal] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!passkey || loading) return;

    setLoading(true);
    setError('');

    try {
      await verifyPasskey(passkey);
      onUnlock();
    } catch (err) {
      setError(err.message || 'Unable to verify the passkey.');
      setPasskey('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gate-screen">
      <form className="gate-card" onSubmit={submit}>
        <span className="gate-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <rect x="7" y="14" width="18" height="14" rx="3" />
            <path d="M11 14v-4a5 5 0 0 1 10 0v4" />
            <circle cx="16" cy="21" r="1.6" />
          </svg>
        </span>

        <p className="gate-kicker">Restricted access</p>
        <h1>Enter the roster passkey</h1>
        <p className="gate-copy">
          This lookup tool requires a passkey before searching household records.
        </p>

        <label className="gate-label" htmlFor="passkey">
          Passkey
        </label>
        <div className="gate-input-wrap">
          <input
            id="passkey"
            ref={inputRef}
            type={reveal ? 'text' : 'password'}
            autoComplete="current-password"
            value={passkey}
            onChange={(event) => {
              setPasskey(event.target.value);
              setError('');
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'passkey-error' : undefined}
            placeholder="Enter passkey"
          />
          <button
            type="button"
            className="gate-reveal"
            onClick={() => setReveal((value) => !value)}
            aria-label={reveal ? 'Hide passkey' : 'Show passkey'}
          >
            {reveal ? 'Hide' : 'Show'}
          </button>
        </div>

        {error && (
          <p id="passkey-error" className="gate-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="gate-submit" disabled={loading || !passkey}>
          {loading ? <span className="button-spinner" aria-hidden="true" /> : 'Unlock roster'}
        </button>

        <p className="gate-footnote">Access is limited to authorized personnel.</p>
      </form>
    </div>
  );
}
