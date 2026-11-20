import { useEffect, useRef, useState } from 'react';
import FieldSearchForm from './components/FieldSearchForm.jsx';
import PasskeyGate from './components/PasskeyGate.jsx';
import ResultsList from './components/ResultsList.jsx';
import RosterModal from './components/RosterModal.jsx';
import { getLocations, getStats, searchMembers } from './services/api.js';

const EMPTY_FIELDS = {
  hh_id: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  province: '',
  municipality: '',
  barangay: '',
};

const EMPTY_RESULTS = { data: [], total: 0, totalCapped: false, page: 1, totalPages: 0, took: 0 };
const PAGE_SIZE = 20;

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [termFields, setTermFields] = useState(EMPTY_FIELDS);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [stats, setStats] = useState(null);
  const [locations, setLocations] = useState({ provinces: [], municipalities: [], barangays: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedHhId, setSelectedHhId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!unlocked) return undefined;

    const controller = new AbortController();
    getStats(controller.signal)
      .then(setStats)
      .catch(() => {});
    return () => controller.abort();
  }, [unlocked]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTermFields(fields);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [fields]);

  useEffect(() => {
    if (!Object.values(termFields).some((value) => value.trim())) {
      setResults(EMPTY_RESULTS);
      setError('');
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    searchMembers(termFields, page, PAGE_SIZE, controller.signal)
      .then(setResults)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [termFields, page, reloadKey]);

  const runSearch = (event) => {
    event.preventDefault();
    setTermFields(fields);
    setPage(1);
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearFields = () => {
    setFields(EMPTY_FIELDS);
    setTermFields(EMPTY_FIELDS);
    setResults(EMPTY_RESULTS);
    setError('');
    setPage(1);
  };

  useEffect(() => {
    if (!unlocked) return undefined;

    const controller = new AbortController();
    getLocations(fields.province, fields.municipality, controller.signal)
      .then(setLocations)
      .catch(() => {});
    return () => controller.abort();
  }, [unlocked, fields.province, fields.municipality]);

  const changeField = (key, value) => {
    setFields((current) => {
      if (key === 'province') {
        return { ...current, province: value, municipality: '', barangay: '' };
      }
      if (key === 'municipality') {
        return { ...current, municipality: value, barangay: '' };
      }
      return { ...current, [key]: value };
    });
  };

  if (!unlocked) return <PasskeyGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to search
      </a>

      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-logos">
              <img
                className="brand-logo brand-logo-wgp"
                src="/wgp-logo.png"
                alt="Walang Gutom Program logo"
              />
              <img className="brand-logo brand-logo-dswd" src="/dswd-logo.png" alt="DSWD logo" />
            </div>
            <div>
              <p className="brand-title">Walang Gutom Program</p>
              <p className="brand-subtitle">Household Member Lookup</p>
            </div>
          </div>

          <div className="header-actions">
            <div className="header-stats" aria-label="Database summary">
              <span className="stat-pill">
                <strong>{stats ? stats.members.toLocaleString() : '—'}</strong> members
              </span>
              <span className="stat-pill">
                <strong>{stats ? stats.households.toLocaleString() : '—'}</strong> households
              </span>
            </div>
            <button
              type="button"
              className="lock-button"
              onClick={() => setUnlocked(false)}
              aria-label="Lock roster search"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Lock
            </button>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="hero hero-compact">
          <div className="hero-copy">
            <span className="hero-kicker">Search · Verify · View</span>
            <h1>WGP household lookup.</h1>
            <p>
              Fill any of the boxes below — even one or two letters is enough. Open a matching
              member to see the complete household roster.
            </p>
          </div>
        </section>

        <div className="content-wrap" ref={contentRef}>
          <section className="field-card" aria-label="Field search">
            <FieldSearchForm
              values={fields}
              locations={locations}
              onChange={changeField}
              onSubmit={runSearch}
              onClear={clearFields}
              loading={loading}
            />
          </section>

          <ResultsList
            results={results.data}
            query={Object.values(termFields).find(Boolean) || ''}
            loading={loading}
            error={error}
            page={results.page || 1}
            totalPages={results.totalPages || 0}
            total={results.total || 0}
            totalCapped={!!results.totalCapped}
            took={results.took || 0}
            onPageChange={setPage}
            onSelect={setSelectedHhId}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      </main>

      <footer className="site-footer">
        <p>Walang Gutom Program · Household Member Lookup · Read-only viewer for household roster records</p>
      </footer>

      {selectedHhId && (
        <RosterModal hhId={selectedHhId} onClose={() => setSelectedHhId(null)} />
      )}
    </div>
  );
}
