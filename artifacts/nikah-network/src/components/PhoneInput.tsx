import { useState, useRef } from 'react';
import { COUNTRY_CODES, type CountryCode } from '@/lib/profile-options';

interface Props {
  label: string;
  value: string;           // stored as +CCXXXXXXXXXX
  onChange: (normalized: string, display: string) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  placeholder?: string;
}

function detectCountry(stored: string): CountryCode {
  const pk = COUNTRY_CODES.find(c => c.code === 'PK')!;
  if (!stored) return pk;
  const match = COUNTRY_CODES.find(c => stored.startsWith(c.dial));
  return match ?? pk;
}

function localDigits(stored: string, cc: CountryCode): string {
  if (!stored) return '';
  if (stored.startsWith(cc.dial)) return stored.slice(cc.dial.length).replace(/\D/g, '');
  return stored.replace(/\D/g, '');
}

export default function PhoneInput({ label, value, onChange, required, error, helperText, disabled, placeholder }: Props) {
  const [country, setCountry] = useState<CountryCode>(() => detectCountry(value));
  const [local, setLocal] = useState<string>(() => localDigits(value, detectCountry(value)));
  const [showDrop, setShowDrop] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? COUNTRY_CODES.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.dial.includes(query)
      )
    : COUNTRY_CODES;

  const commit = (digits: string, cc: CountryCode) => {
    const clean = digits.replace(/\D/g, '');
    const normalized = clean ? `${cc.dial}${clean}` : '';
    // Display format: 0XXX-XXXXXXX for Pakistan, +CC XXXXX for others
    const display = cc.code === 'PK' && clean.length === 10
      ? `0${clean.slice(0, 3)}-${clean.slice(3)}`
      : normalized;
    onChange(normalized, display);
  };

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, country.localLength);
    setLocal(digits);
    commit(digits, country);
  };

  const selectCountry = (cc: CountryCode) => {
    setCountry(cc);
    setLocal('');
    setShowDrop(false);
    setQuery('');
    onChange('', '');
    inputRef.current?.focus();
  };

  const isValid = !local || country.pattern.test(local);

  const hint = placeholder ?? `e.g. ${country.format}`;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex gap-0 relative">
        {/* Country code dropdown trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowDrop(v => !v)}
          className="flex items-center gap-1 px-3 py-2 border border-gray-300 border-r-0 rounded-l-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 whitespace-nowrap"
        >
          <span className="text-xs font-mono">{country.dial}</span>
          <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Country dropdown */}
        {showDrop && (
          <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-white rounded-lg border border-gray-200 shadow-xl">
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                type="text"
                placeholder="Search country…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <ul className="max-h-48 overflow-auto">
              {filtered.map(cc => (
                <li key={cc.code}
                  onClick={() => selectCountry(cc)}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-green-50 text-sm ${cc.code === country.code ? 'bg-green-50 font-semibold text-green-800' : 'text-gray-800'}`}
                >
                  <span>{cc.name}</span>
                  <span className="text-xs text-gray-500 font-mono ml-2">{cc.dial}</span>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-400 italic">No country found</li>
              )}
            </ul>
          </div>
        )}

        {/* Phone number input */}
        <input
          ref={inputRef}
          type="tel"
          value={local}
          disabled={disabled}
          placeholder={hint}
          maxLength={country.localLength}
          onChange={handleLocalChange}
          onBlur={() => setShowDrop(false)}
          className={[
            'flex-1 px-3 py-2 border rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500',
            error || (local && !isValid) ? 'border-red-400' : 'border-gray-300',
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
          ].join(' ')}
        />
      </div>

      {/* Inline validation */}
      {local && !isValid && (
        <p className="text-xs text-red-600 mt-1">
          Invalid {country.name} mobile number. Format: {country.dial} {country.format}
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
    </div>
  );
}
