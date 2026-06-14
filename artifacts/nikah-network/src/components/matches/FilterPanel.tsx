import { useEffect, useState } from 'react';
import { X, MapPin, BookOpen, Star, User, RotateCcw } from 'lucide-react';
import { MatchFilters, DEFAULT_FILTERS } from './types';

export default function FilterPanel({
  open, filters, cities, educations, onClose, onApply,
}: {
  open: boolean;
  filters: MatchFilters;
  cities: string[];
  educations: string[];
  onClose: () => void;
  onApply: (f: MatchFilters) => void;
}) {
  const [draft, setDraft] = useState<MatchFilters>(filters);

  // Reseed when opened
  useEffect(() => { if (open) setDraft(filters); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const toggle = (key: 'cities' | 'educations', val: string) =>
    setDraft(d => ({
      ...d,
      [key]: d[key].includes(val) ? d[key].filter(v => v !== val) : [...d[key], val],
    }));

  const sectionCls = 'pb-5 mb-5 border-b border-[#E8DED3]';
  const titleCls = 'text-sm font-bold text-[#1C1917] mb-3 flex items-center gap-2';
  const checkRow = (active: boolean) =>
    `flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg cursor-pointer text-sm transition-colors ${
      active ? 'text-[#10B981] font-bold' : 'text-gray-600 hover:bg-gray-50'
    }`;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose} aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog" aria-modal="true" aria-label="Filters"
        className={`fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl
                    flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#E8DED3] shrink-0">
          <h2 className="text-xl font-bold text-[#1C1917]">Filters</h2>
          <button onClick={onClose} aria-label="Close filters"
            className="p-2 -mr-2 text-gray-400 hover:text-[#1C1917] rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* Age range */}
          <div className={sectionCls}>
            <p className={titleCls}><User className="w-4 h-4 text-gray-400" /> Age Range</p>
            <div className="flex items-center gap-3">
              <input type="number" min={18} max={draft.ageMax} value={draft.ageMin}
                onChange={e => setDraft(d => ({ ...d, ageMin: Math.min(+e.target.value || 18, d.ageMax) }))}
                className="w-20 h-10 px-3 rounded-xl bg-[#F4F6F5] border border-gray-200 text-sm text-center focus:outline-none focus:border-[#10B981]" />
              <span className="text-gray-400">—</span>
              <input type="number" min={draft.ageMin} max={80} value={draft.ageMax}
                onChange={e => setDraft(d => ({ ...d, ageMax: Math.max(+e.target.value || 60, d.ageMin) }))}
                className="w-20 h-10 px-3 rounded-xl bg-[#F4F6F5] border border-gray-200 text-sm text-center focus:outline-none focus:border-[#10B981]" />
              <span className="text-sm text-gray-400">years</span>
            </div>
          </div>

          {/* Compatibility score */}
          <div className={sectionCls}>
            <p className={titleCls}><Star className="w-4 h-4 text-gray-400" /> Minimum Compatibility</p>
            <input type="range" min={0} max={100} step={5} value={draft.scoreMin}
              onChange={e => setDraft(d => ({ ...d, scoreMin: +e.target.value }))}
              className="w-full accent-[#10B981]" />
            <p className="text-sm font-bold text-[#10B981] mt-1">{draft.scoreMin}+ points</p>
          </div>

          {/* City */}
          {cities.length > 0 && (
            <div className={sectionCls}>
              <p className={titleCls}><MapPin className="w-4 h-4 text-gray-400" /> City</p>
              <div className="space-y-0.5 max-h-44 overflow-y-auto">
                {cities.map(city => {
                  const active = draft.cities.includes(city);
                  return (
                    <label key={city} className={checkRow(active)}>
                      <input type="checkbox" checked={active} onChange={() => toggle('cities', city)}
                        className="w-4 h-4 accent-[#10B981]" />
                      {city}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Education */}
          {educations.length > 0 && (
            <div className={sectionCls}>
              <p className={titleCls}><BookOpen className="w-4 h-4 text-gray-400" /> Education</p>
              <div className="space-y-0.5 max-h-44 overflow-y-auto">
                {educations.map(ed => {
                  const active = draft.educations.includes(ed);
                  return (
                    <label key={ed} className={checkRow(active)}>
                      <input type="checkbox" checked={active} onChange={() => toggle('educations', ed)}
                        className="w-4 h-4 accent-[#10B981]" />
                      {ed}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#E8DED3] shrink-0 flex gap-3">
          <button onClick={() => setDraft(DEFAULT_FILTERS)}
            className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-gray-200
                       text-gray-600 hover:bg-gray-50 text-sm font-bold transition-colors">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={() => { onApply(draft); onClose(); }}
            className="flex-1 h-11 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold transition-colors">
            Apply Filters
          </button>
        </div>
      </aside>
    </>
  );
}
