import Highlight from './Highlight.jsx';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

function SkeletonRows() {
  return Array.from({ length: 6 }, (_, index) => (
    <div className="result-row skeleton-row" key={index} aria-hidden="true">
      <span className="skeleton skeleton-name" />
      <span className="skeleton skeleton-hh" />
      <span className="skeleton skeleton-date" />
      <span className="skeleton skeleton-loc" />
    </div>
  ));
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(5, start + 4));

  for (let index = start; index <= end; index += 1) pages.push(index);

  return (
    <nav className="pagination" aria-label="Search result pages">
      <button
        type="button"
        className="page-button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        ‹
      </button>
      {pages.map((number) => (
        <button
          key={number}
          type="button"
          className={`page-button ${number === page ? 'is-active' : ''}`}
          onClick={() => onChange(number)}
          aria-current={number === page ? 'page' : undefined}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        className="page-button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}

export default function ResultsList({
  results,
  query,
  loading,
  error,
  page,
  totalPages,
  total,
  totalCapped,
  took,
  onPageChange,
  onSelect,
  onRetry,
}) {
  return (
    <section className="results-card" aria-label="Search results">
      <div className="results-head">
        <div>
          <h2>Search results</h2>
          <p className="results-sub" aria-live="polite">
            {loading
              ? 'Searching the roster…'
              : results.length
                ? `${totalCapped ? '10,000+' : total.toLocaleString()} match${total === 1 && !totalCapped ? '' : 'es'} found${took ? ` in ${took} ms` : ''}`
                : 'No records to display'}
          </p>
        </div>
        {!!results.length && !loading && (
          <span className="result-count">Page {page} of {totalPages}</span>
        )}
      </div>

      {error && (
        <div className="state-panel error-state" role="alert">
          <div className="state-icon" aria-hidden="true">!</div>
          <h3>Search unavailable</h3>
          <p>{error}</p>
          <button type="button" className="secondary-button" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      {!error && loading && (
        <div className="result-table" aria-busy="true">
          <SkeletonRows />
        </div>
      )}

      {!error && !loading && !results.length && (
        <div className="state-panel">
          <div className="state-icon" aria-hidden="true">⌕</div>
          <h3>{query ? 'No matching records' : 'Ready when you are'}</h3>
          <p>
            {query
              ? 'Try a different name, household ID, or location. You can also switch the search field.'
              : 'Type a household ID, first name, middle name, last name, province, municipality, or barangay above.'}
          </p>
        </div>
      )}

      {!error && !loading && !!results.length && (
        <>
          <div className="table-head" aria-hidden="true">
            <span>Member</span>
            <span>Household ID</span>
            <span>Birthdate</span>
            <span>Location</span>
            <span />
          </div>
          <div className="result-table">
            {results.map((member) => {
              const fullName = [member.first_name, member.middle_name, member.last_name]
                .filter(Boolean)
                .join(' ');
              const nameWithExt = member.ext_name ? `${fullName} ${member.ext_name}` : fullName;
              const location = [member.barangay, member.municipality, member.province]
                .filter(Boolean)
                .join(', ');
              const searchKey = `${member.hh_id}-${member.first_name}-${member.middle_name}-${member.last_name}`;

              return (
                <div className="result-row" key={searchKey}>
                  <div className="cell-name">
                    <span className="avatar" aria-hidden="true">
                      {(member.first_name || '?').charAt(0)}
                    </span>
                    <div className="name-block">
                      <button
                        type="button"
                        className="name-button"
                        onClick={() => onSelect(member.hh_id)}
                        aria-label={`View family roster for ${nameWithExt}, household ${member.hh_id}`}
                      >
                        <Highlight text={nameWithExt} query={query} />
                      </button>
                      <span className="cell-meta">
                        {member.sex === 'M' ? 'Male' : member.sex === 'F' ? 'Female' : 'Sex not recorded'}
                        {member.sex ? ` · ${member.sex}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="cell-hh" data-label="Household ID">
                    <button
                      type="button"
                      className="hh-button"
                      onClick={() => onSelect(member.hh_id)}
                      aria-label={`View roster for household ${member.hh_id}`}
                    >
                      <Highlight text={member.hh_id} query={query} />
                    </button>
                  </div>

                  <div className="cell-date" data-label="Birthdate">
                    {formatDate(member.birthdate)}
                  </div>

                  <div className="cell-location" data-label="Location">
                    <Highlight text={location} query={query} />
                  </div>

                  <div className="cell-action">
                    <button
                      type="button"
                      className="row-open"
                      onClick={() => onSelect(member.hh_id)}
                      aria-label={`Open roster for ${member.hh_id}`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="results-foot">
            <p>Select a name or household ID to view the complete family roster.</p>
            <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
          </div>
        </>
      )}
    </section>
  );
}
