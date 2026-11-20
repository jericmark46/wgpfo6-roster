const TEXT_FIELDS = [
  { key: 'hh_id', label: 'Household ID (HHID)', placeholder: 'e.g. 060001' },
  { key: 'first_name', label: 'First name', placeholder: 'e.g. MA' },
  { key: 'middle_name', label: 'Middle name', placeholder: 'e.g. DAL' },
  { key: 'last_name', label: 'Last name', placeholder: 'e.g. BON' },
];

const SELECT_FIELDS = [
  { key: 'province', label: 'Province', placeholder: 'All provinces', optionsKey: 'provinces' },
  {
    key: 'municipality',
    label: 'Municipality',
    placeholder: 'All municipalities',
    optionsKey: 'municipalities',
  },
  { key: 'barangay', label: 'Barangay', placeholder: 'All barangays', optionsKey: 'barangays' },
];

export default function FieldSearchForm({
  values,
  locations,
  onChange,
  onSubmit,
  onClear,
  loading,
}) {
  const filled = Object.values(values).some((value) => value.trim());

  return (
    <form className="field-form" onSubmit={onSubmit}>
      <div className="field-form-head">
        <div>
          <h2>Search by field</h2>
          <p>
            Type even one or two letters, or pick a province, municipality, and barangay from the
            lists.
          </p>
        </div>
      </div>

      <div className="field-grid">
        {TEXT_FIELDS.map((field) => (
          <div className="field-item" key={field.key}>
            <label htmlFor={`field-${field.key}`}>{field.label}</label>
            <input
              id={`field-${field.key}`}
              type="text"
              autoComplete="off"
              spellCheck="false"
              value={values[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder={field.placeholder}
              maxLength={100}
            />
          </div>
        ))}

        {SELECT_FIELDS.map((field) => {
          const options = locations[field.optionsKey] || [];
          const disabled = !options.length && field.key !== 'province';

          return (
            <div className="field-item" key={field.key}>
              <label htmlFor={`field-${field.key}`}>{field.label}</label>
              <select
                id={`field-${field.key}`}
                value={values[field.key]}
                onChange={(event) => onChange(field.key, event.target.value)}
                disabled={disabled}
              >
                <option value="">{field.placeholder}</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="field-form-actions">
        <p className="field-note">Leave any box empty to skip that field.</p>
        <div className="field-form-buttons">
          <button type="button" className="clear-all" onClick={onClear} disabled={!filled}>
            Clear filter
          </button>
          <button type="submit" className="search-submit" disabled={loading || !filled}>
            {loading ? <span className="button-spinner" aria-hidden="true" /> : 'Search roster'}
          </button>
        </div>
      </div>
    </form>
  );
}
