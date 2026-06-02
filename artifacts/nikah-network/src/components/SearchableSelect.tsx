import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface Props {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  allowCustom?: boolean;   // allow value not in list
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  label, name, value, options, onChange,
  placeholder = 'Search or select…',
  required, allowCustom = false, error, helperText, disabled,
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display value when controlled value changes externally
  useEffect(() => { setQuery(value); }, [value]);

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const commit = (val: string) => {
    onChange(val);
    setQuery(val);
    setOpen(false);
    setActiveIdx(-1);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && filtered[activeIdx]) {
        commit(filtered[activeIdx]);
      } else if (allowCustom && query.trim()) {
        commit(query.trim());
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery(value); // revert to last saved value
    }
  };

  // Scroll active option into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // If custom not allowed, revert to last saved value on blur
        if (!allowCustom) setQuery(value);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value, allowCustom]);

  const inputClass = [
    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-8',
    error ? 'border-red-400' : 'border-gray-300',
    disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-text',
  ].join(' ');

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={inputClass}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
            if (allowCustom) onChange(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          aria-autocomplete="list"
          aria-expanded={open}
        />

        {/* Clear button */}
        {query && !disabled && (
          <button
            type="button"
            onClick={() => { commit(''); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            tabIndex={-1}
            aria-label="Clear"
          >×</button>
        )}
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm"
          role="listbox"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={() => commit(opt)}
              onMouseEnter={() => setActiveIdx(i)}
              className={[
                'px-3 py-2 cursor-pointer',
                i === activeIdx ? 'bg-green-50 text-green-800 font-medium' : 'hover:bg-gray-50',
                opt === value ? 'font-semibold text-green-700' : 'text-gray-800',
              ].join(' ')}
            >
              {opt}
            </li>
          ))}
          {allowCustom && query.trim() && !options.includes(query.trim()) && (
            <li
              role="option"
              onMouseDown={() => commit(query.trim())}
              className="px-3 py-2 cursor-pointer text-gray-500 italic hover:bg-gray-50 border-t border-gray-100"
            >
              Use "{query.trim()}"
            </li>
          )}
        </ul>
      )}

      {helperText && !error && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
