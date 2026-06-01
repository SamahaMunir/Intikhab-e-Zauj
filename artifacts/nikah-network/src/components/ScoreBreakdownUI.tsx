import React from 'react';

export interface ScoreBreakdown {
  caste: number;
  profession: number;
  ageGap: number;
  city: number;
  height: number;
  houseStatus: number;
  houseArea: number;
  total: number;
}

export function calculateScore(user: any, candidate: any): ScoreBreakdown {
  const breakdown: ScoreBreakdown = {
    caste: 0, profession: 0, ageGap: 0, city: 0,
    height: 0, houseStatus: 0, houseArea: 0, total: 0,
  };

  if (user.caste && candidate.caste) {
    breakdown.caste = user.caste.toLowerCase() === candidate.caste.toLowerCase() ? 25 : 5;
  }
  if (user.profession && candidate.profession) {
    const up = user.profession.toLowerCase();
    const cp = candidate.profession.toLowerCase();
    if (up === cp) breakdown.profession = 15;
    else if (up.includes('engineer') && cp.includes('engineer')) breakdown.profession = 12;
    else if (up.includes('doctor') && cp.includes('health')) breakdown.profession = 10;
    else if (up.includes('business') || cp.includes('business')) breakdown.profession = 8;
    else breakdown.profession = 3;
  }
  if (user.age && candidate.age) {
    const d = Math.abs(user.age - candidate.age);
    if (d <= 2) breakdown.ageGap = 15;
    else if (d <= 5) breakdown.ageGap = 12;
    else if (d <= 8) breakdown.ageGap = 8;
    else if (d <= 12) breakdown.ageGap = 4;
    else breakdown.ageGap = 0;
  }
  if (user.city && candidate.city) {
    const uc = user.city.toLowerCase().trim();
    const cc = candidate.city.toLowerCase().trim();
    if (uc === cc) breakdown.city = 15;
    else if (['lahore','lahore city','cantonment lahore'].some(v => uc.includes(v)) &&
             ['lahore','lahore city','cantonment lahore'].some(v => cc.includes(v))) breakdown.city = 12;
    else breakdown.city = 5;
  }
  if (user.height && candidate.height) {
    const d = Math.abs(parseFloat(user.height) - parseFloat(candidate.height));
    if (d <= 0.2) breakdown.height = 10;
    else if (d <= 0.5) breakdown.height = 8;
    else if (d <= 0.8) breakdown.height = 5;
    else if (d <= 1.2) breakdown.height = 2;
    else breakdown.height = 0;
  }
  if (user.houseStatus && candidate.houseStatus) {
    const us = user.houseStatus.toLowerCase();
    const cs = candidate.houseStatus.toLowerCase();
    breakdown.houseStatus = (us === cs || (us.includes('own') && cs.includes('own')) ||
      (us.includes('rent') && cs.includes('rent'))) ? 10 : 5;
  }
  if (user.houseArea && candidate.houseArea) {
    const ua = parseInt(user.houseArea) || 0;
    const ca = parseInt(candidate.houseArea) || 0;
    if (ua > 0 && ca > 0) {
      const pct = (Math.abs(ua - ca) / Math.max(ua, ca)) * 100;
      if (pct <= 10) breakdown.houseArea = 10;
      else if (pct <= 25) breakdown.houseArea = 8;
      else if (pct <= 50) breakdown.houseArea = 5;
      else breakdown.houseArea = 2;
    }
  }

  breakdown.total = Math.round(
    breakdown.caste + breakdown.profession + breakdown.ageGap +
    breakdown.city + breakdown.height + breakdown.houseStatus + breakdown.houseArea
  );
  return breakdown;
}

const CATEGORIES: Array<{ key: keyof Omit<ScoreBreakdown,'total'>; label: string; max: number }> = [
  { key: 'caste',       label: 'Caste Match',              max: 25 },
  { key: 'profession',  label: 'Profession Compatibility',  max: 15 },
  { key: 'ageGap',      label: 'Age Gap Suitability',       max: 15 },
  { key: 'city',        label: 'City Match',                max: 15 },
  { key: 'height',      label: 'Height Preference',         max: 10 },
  { key: 'houseStatus', label: 'House Ownership',           max: 10 },
  { key: 'houseArea',   label: 'House Area',                max: 10 },
];

interface ScoreBreakdownPanelProps {
  scoreBreakdown: ScoreBreakdown;
}

export default function ScoreBreakdownPanel({ scoreBreakdown }: ScoreBreakdownPanelProps) {
  const total = scoreBreakdown.total;
  const totalColor =
    total >= 75 ? 'text-green-600' :
    total >= 60 ? 'text-orange-500' :
    total >= 40 ? 'text-yellow-500' : 'text-red-500';
  const totalLabel =
    total >= 75 ? 'Excellent Match' :
    total >= 60 ? 'Good Match' :
    total >= 40 ? 'Fair Match' : 'Low Match';

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-800 text-sm">Compatibility Breakdown (100 pts)</h4>
        <div className="text-right">
          <span className={"text-2xl font-bold " + totalColor}>{total}</span>
          <span className="text-gray-400 text-sm">/100</span>
          <p className={"text-xs font-medium mt-0.5 " + totalColor}>{totalLabel}</p>
        </div>
      </div>
      <div className="space-y-3">
        {CATEGORIES.map(({ key, label, max }) => {
          const score = scoreBreakdown[key] as number;
          const pct = Math.round((score / max) * 100);
          const barColor =
            pct >= 80 ? 'bg-green-500' :
            pct >= 50 ? 'bg-yellow-400' : 'bg-red-400';
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{label}</span>
                <span className="font-semibold">{score}<span className="text-gray-400">/{max}</span></span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={"h-full rounded-full " + barColor}
                  style={{ width: pct + '%' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
