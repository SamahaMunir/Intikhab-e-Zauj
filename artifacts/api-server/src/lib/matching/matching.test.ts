import { describe, it, expect } from 'vitest';
import { calculateScore } from './calculateScore';
import { applyHardFilters } from './applyHardFilters';
import type { Profile } from './types';

const base: Profile = {
  gender: 'male', age: 30, city: 'Lahore', caste: 'Rajput',
  profession: 'Engineer', education: 'Masters', height: '5.8',
  houseStatus: 'Owned', houseArea: '10',
};
const female = (over: Partial<Profile> = {}): Profile => ({ ...base, gender: 'female', age: 28, ...over });

describe('calculateScore', () => {
  it('gives full caste credit for an exact match and low for a mismatch', () => {
    const same = calculateScore(base, female({ caste: 'Rajput' }));
    const diff = calculateScore(base, female({ caste: 'Arain' }));
    expect(same.caste).toBe(25);
    expect(diff.caste).toBe(5);
  });

  it('uses neutral caste credit when one side is missing', () => {
    const s = calculateScore({ ...base, caste: undefined }, female());
    expect(s.caste).toBe(10);
  });

  it('scores same city full and different far city low', () => {
    expect(calculateScore(base, female({ city: 'Lahore' })).city).toBe(15);
    expect(calculateScore(base, female({ city: 'Karachi' })).city).toBe(5);
  });

  it('rewards small age gaps and zeroes very large ones', () => {
    expect(calculateScore(base, female({ age: 29 })).ageGap).toBe(15);
    expect(calculateScore(base, female({ age: 50 })).ageGap).toBe(0);
  });

  it('keeps total within 0..100 and sums the breakdown', () => {
    const s = calculateScore(base, female());
    const sum = s.caste + s.profession + s.ageGap + s.city + s.height + s.houseStatus + s.houseArea;
    expect(s.total).toBe(Math.round(sum));
    expect(s.total).toBeGreaterThanOrEqual(0);
    expect(s.total).toBeLessThanOrEqual(100);
  });

  it('is symmetric for total score', () => {
    const ab = calculateScore(base, female()).total;
    const ba = calculateScore(female(), base).total;
    expect(ab).toBe(ba);
  });
});

describe('applyHardFilters', () => {
  it('rejects same gender outright', () => {
    const r = applyHardFilters(base, { ...base, gender: 'male' });
    expect(r.passes).toBe(false);
    expect(r.rejections.some(x => /gender/i.test(x.reason))).toBe(true);
  });

  it('passes a compatible opposite-gender pair', () => {
    expect(applyHardFilters(base, female()).passes).toBe(true);
  });

  it('rejects an age gap beyond 12 years', () => {
    const r = applyHardFilters(base, female({ age: 15 }));
    expect(r.passes).toBe(false);
  });

  it('rejects when same-caste is required and castes differ', () => {
    const user: Profile = { ...base, matchCriteria: 'same caste only' };
    expect(applyHardFilters(user, female({ caste: 'Arain' })).passes).toBe(false);
    expect(applyHardFilters(user, female({ caste: 'Rajput' })).passes).toBe(true);
  });

  it('rejects extreme cross-province distance', () => {
    const r = applyHardFilters(base, female({ city: 'Karachi' }));
    expect(r.passes).toBe(false);
    expect(r.rejections.some(x => /province/i.test(x.reason))).toBe(true);
  });

  it('allows within-province different cities', () => {
    expect(applyHardFilters(base, female({ city: 'Faisalabad' })).passes).toBe(true);
  });
});
