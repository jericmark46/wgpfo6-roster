import { useEffect, useRef, useState } from 'react';
import { verifyPasskey } from '../services/api.js';

export default function PasskeyGate({ onUnlock }) {
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [agreementError, setAgreementError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) {
      inputRef.current?.focus();
    }
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!passkey || loading) return;

    if (!agreed) {
      setAgreementError(true);
      return;
    }

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
      <div className="gate-shell">
        <header className="gate-brand-bar">
          <img
            className="gate-logo gate-logo-wgp"
            src="/wgp-logo.png"
            alt="Walang Gutom Program logo"
          />
          <span className="gate-brand-divider" aria-hidden="true" />
          <img className="gate-logo gate-logo-dswd" src="/dswd-logo.png" alt="DSWD logo" />
        </header>

        <form className="gate-grid" onSubmit={submit}>
          <section className="privacy-panel" aria-labelledby="privacy-title">
            <div className="privacy-heading">
              <span className="gate-kicker">Data Privacy Act of 2012</span>
              <h2 id="privacy-title">Data Privacy Notice</h2>
              <p className="privacy-law">Republic Act No. 10173</p>
            </div>

            <div className="privacy-copy" tabIndex={0} aria-label="Data privacy notice text">
              <p>
                The Department of Social Welfare and Development (DSWD) Field Office VI respects
                your right to data privacy and privacy of our beneficiaries. In accordance with the Data Privacy Act of 2012, this
                notice explains how personal information is handled in the Walang Gutom Program
                Household Member Lookup.
              </p>

              <h3>Who is responsible</h3>
              <p>
                Information System Analysts of WGP Innovations Division, DSWD Field Office VI acts as the Personal Information Controller for this lookup
                tool. Access is restricted to authorized personnel and is verified by passkey.
              </p>

              <h3>Information processed</h3>
              <p>
                The lookup processes names, household identification numbers, and location details
                such as province, municipality, and barangay to find a household and display its
                family roster.
              </p>

              <h3>Purpose of processing</h3>
              <p>
                Personal information is processed only for authorized lookup and verification of
                Walang Gutom Program household records. In line with the principles of transparency,
                legitimate purpose, and proportionality, only information necessary for that
                purpose is accessed. We have deployed this website for smoother and faster process.
              </p>

              <h3>Family data rights as a data subject</h3>
              <p>
                Under Republic Act No. 10173, it is the right to be informed whether the
                family information is being processed, to access it, to request its correction,
                to request its erasure or blocking when allowed by law, they have the right to file a complaint with the
                National Privacy Commission, and to seek damages for violations of the data privacy
                rights.
              </p>

              <h3>Security and retention</h3>
              <p>
                Reasonable organizational, physical, and technical safeguards are observed to
                protect personal information against unauthorized access, alteration, disclosure, or
                loss. Records are retained only as long as necessary for the stated purpose, and
                suspected data breaches are reported as required by law.
              </p>

              <p className="privacy-disclaimer">
                This notice summarizes key provisions of Republic Act No. 10173 and does not replace
                the official text of the law.
              </p>
            </div>

            <label
              className={`privacy-agree ${agreementError ? 'has-error' : ''}`}
              htmlFor="agree-privacy"
            >
              <input
                id="agree-privacy"
                type="checkbox"
                checked={agreed}
                onChange={(event) => {
                  setAgreed(event.target.checked);
                  if (event.target.checked) setAgreementError(false);
                }}
                aria-invalid={agreementError}
                aria-describedby={agreementError ? 'agreement-error' : undefined}
              />
              <span>
                I have read and understood the Data Privacy Notice and agree to the terms and
                conditions based on Republic Act No. 10173 (Data Privacy Act of 2012).
              </span>
            </label>

            {agreementError && (
              <p id="agreement-error" className="gate-error" role="alert">
                Please agree to the Data Privacy Notice before continuing.
              </p>
            )}
          </section>

          <section className="gate-access" aria-labelledby="gate-title">
            <div className="gate-access-heading">
              <p className="gate-kicker">Restricted access</p>
              <h1 id="gate-title">
                <span>Walang Gutom Program</span>
                <span>Household Member Lookup</span>
              </h1>
              <p className="gate-copy">
                Agree to the Data Privacy Notice, then enter your passkey to continue to the
                household lookup dashboard.
              </p>
            </div>

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

            <button
              type="submit"
              className="gate-submit"
              disabled={loading || !passkey || !agreed}
            >
              {loading ? <span className="button-spinner" aria-hidden="true" /> : 'Continue to dashboard'}
            </button>

            <p className="gate-footnote">Access is limited to authorized DSWD personnel.</p>
            <p className="gate-notice">
              Note: Please read and agree to the Data Privacy Notice before continuing.
            </p>
          </section>
        </form>
      </div>
    </div>
  );
}
