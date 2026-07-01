import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { getToken } from '@/lib/auth';

type Weights = {
  caste: number; profession: number; ageGap: number; city: number;
  height: number; houseStatus: number; houseArea: number;
};

const LABELS: Record<keyof Weights, string> = {
  caste: 'Caste',
  profession: 'Profession',
  ageGap: 'Age Gap',
  city: 'City',
  height: 'Height',
  houseStatus: 'House Status',
  houseArea: 'House Area',
};

const DEFAULTS: Weights = {
  caste: 25, profession: 15, ageGap: 15, city: 15, height: 10, houseStatus: 10, houseArea: 10,
};

const KEYS = Object.keys(DEFAULTS) as (keyof Weights)[];
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function StaffConfig() {
  const [weights, setWeights] = useState<Weights>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const total = useMemo(() => KEYS.reduce((s, k) => s + weights[k], 0), [weights]);
  const canSave = total === 100 && !saving;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/staff/config/weights`, {
          headers: { Authorization: `Bearer ${getToken('staff')}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load weights');
        setWeights({ ...DEFAULTS, ...data.weights });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load weights');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k: keyof Weights, v: number) => {
    setSaved(false);
    setWeights((w) => ({ ...w, [k]: v }));
  };

  const save = async () => {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/staff/config/weights`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken('staff')}` },
        body: JSON.stringify({ weights }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setWeights({ ...DEFAULTS, ...data.weights });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Tune how much each factor counts toward the compatibility score.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matching Algorithm Weights</CardTitle>
          <CardDescription>Each factor's maximum points. Must total 100.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              {KEYS.map((k) => (
                <div key={k} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>{LABELS[k]}</Label>
                    <span className="font-semibold">{weights[k]}</span>
                  </div>
                  <Slider
                    value={[weights[k]]}
                    onValueChange={([v]) => set(k, v)}
                    max={50}
                    step={1}
                  />
                </div>
              ))}

              <div className={`flex justify-between items-center text-sm font-semibold ${total === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
                <span>Total</span>
                <span>{total} / 100</span>
              </div>

              {total !== 100 && (
                <p className="text-xs text-red-600">Weights must total exactly 100 to save (currently {total}).</p>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
              {saved && <p className="text-xs text-emerald-600">✓ Saved. New matches will use these weights.</p>}

              <div className="flex gap-3">
                <Button className="flex-1" onClick={save} disabled={!canSave}>
                  {saving ? 'Saving…' : 'Save Algorithm Settings'}
                </Button>
                <Button variant="outline" onClick={() => { setWeights(DEFAULTS); setSaved(false); }}>
                  Reset to defaults
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
