import { Link } from "wouter";
import { useState, useEffect } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import AddNoteModal from "@/components/AddNoteModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Profile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  city: string;
  education: string;
  profession: string;
  caste?: string;
  age?: number;
  profileStatus: 'pending' | 'approved' | 'rejected';
  photo?: string;
  notes?: string;
  enteredBy?: string;
  createdAt: string;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';


function InfoBox({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-[#FDF8F3] px-4 py-3">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-[#1C1917]">{value || '—'}</div>
    </div>
  );
}

export default function StaffProfiles() {
  const [profiles, setProfiles]       = useState<Profile[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [action, setAction]           = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason]           = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode,      setViewMode]      = useState<'card' | 'table'>('card');

  // Search + filter staged state (applied on button click)
  const [searchInput,    setSearchInput]    = useState('');
  const [ageInput,       setAgeInput]       = useState('');
  const [locationInput,  setLocationInput]  = useState('');
  const [educationInput, setEducationInput] = useState('');

  // Active (applied) filter state
  const [activeSearch,    setActiveSearch]    = useState('');
  const [activeAge,       setActiveAge]       = useState('');
  const [activeLocation,  setActiveLocation]  = useState('');
  const [activeEducation, setActiveEducation] = useState('');

  const applyFilters = () => {
    setActiveSearch(searchInput);
    setActiveAge(ageInput);
    setActiveLocation(locationInput);
    setActiveEducation(educationInput);
  };

  const clearFilters = () => {
    setSearchInput(''); setAgeInput(''); setLocationInput(''); setEducationInput('');
    setActiveSearch(''); setActiveAge(''); setActiveLocation(''); setActiveEducation('');
    setFilter('all');
  };

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { alert('Not authenticated. Please login.'); return; }

      const res = await fetch(`${API}/api/staff/profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProfiles(data.data || []);
    } catch (err) {
      alert(`Failed to load profiles: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const submitAction = async () => {
    if (!selectedProfile || !action) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const endpoint = action === 'approve'
        ? `${API}/api/staff/profiles/${selectedProfile._id}/approve`
        : `${API}/api/staff/profiles/${selectedProfile._id}/reject`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: action === 'reject' ? reason : 'Approved by staff' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to process profile');
      }

      const data = await res.json();
      alert(`Profile ${action === 'approve' ? 'approved' : 'rejected'}.${data.emailSent ? ' Email sent.' : ''}`);
      await fetchProfiles();
      setSelectedProfile(null);
      setAction(null);
      setReason('');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Add Note modal state
  const [noteModal, setNoteModal] = useState<{ profileId: string; profileName: string; existing: string } | null>(null);

  const filtered = profiles.filter(p => {
    if (filter !== 'all' && p.profileStatus !== filter) return false;
    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.city.toLowerCase().includes(q)) return false;
    }
    if (activeLocation && !p.city.toLowerCase().includes(activeLocation.toLowerCase())) return false;
    if (activeEducation && !p.education?.toLowerCase().includes(activeEducation.toLowerCase())) return false;
    if (activeAge && p.age) {
      if (activeAge === 'under25' && p.age >= 25) return false;
      if (activeAge === '25-30'  && (p.age < 25 || p.age > 30)) return false;
      if (activeAge === '31-35'  && (p.age < 31 || p.age > 35)) return false;
      if (activeAge === '36+'    && p.age < 36) return false;
    }
    return true;
  });

  const counts = {
    all:      profiles.length,
    pending:  profiles.filter(p => p.profileStatus === 'pending').length,
    approved: profiles.filter(p => p.profileStatus === 'approved').length,
    rejected: profiles.filter(p => p.profileStatus === 'rejected').length,
  };

  const filterTabs: { key: typeof filter; label: string }[] = [
    { key: 'all',      label: `All (${counts.all})` },
    { key: 'pending',  label: `Pending (${counts.pending})` },
    { key: 'approved', label: `Approved (${counts.approved})` },
    { key: 'rejected', label: `Rejected (${counts.rejected})` },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-[#10B981]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1917]">Applicant Profiles</h1>
          <p className="mt-1 text-base text-gray-500">Review and manage all registered applicants.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex rounded-xl border border-[#E8DED3] overflow-hidden">
            {(['card', 'table'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2.5 text-sm font-bold capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-[#10B981] text-white'
                    : 'bg-white text-[#1C1917] hover:bg-emerald-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            onClick={fetchProfiles}
            className="min-h-12.5 px-6 rounded-xl border-2 border-[#E8DED3] text-base font-semibold
                       text-[#1C1917] bg-white hover:bg-[#FDF8F3] transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              filter === key
                ? "bg-[#10B981] text-white"
                : "bg-white text-[#1C1917] border border-[#E8DED3] hover:bg-emerald-50 hover:text-[#10B981]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search + Filter bar */}
      <div className="bg-white rounded-2xl border border-[#E8DED3] p-5 space-y-4 shadow-sm">
        {/* Row 1: Search */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl select-none">
            &#9906;
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
            placeholder="Search by name, location..."
            className="w-full min-h-12.5 pl-11 pr-5 rounded-xl border-2 border-[#E8DED3]
                       bg-[#FDF8F3] text-lg text-[#1C1917] placeholder-gray-400
                       focus:outline-none focus:border-[#10B981] transition-colors"
          />
        </div>

        {/* Row 2: Filter dropdowns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Age Range */}
          <select
            value={ageInput}
            onChange={e => setAgeInput(e.target.value)}
            className="min-h-12.5 px-4 rounded-xl border-2 border-[#E8DED3] bg-[#FDF8F3]
                       text-base font-semibold text-[#10B981] focus:outline-none
                       focus:border-[#10B981] transition-colors cursor-pointer"
          >
            <option value="">Age Range</option>
            <option value="under25">Under 25</option>
            <option value="25-30">25 – 30</option>
            <option value="31-35">31 – 35</option>
            <option value="36+">36 +</option>
          </select>

          {/* Location */}
          <input
            type="text"
            value={locationInput}
            onChange={e => setLocationInput(e.target.value)}
            placeholder="Location"
            className="min-h-12.5 px-4 rounded-xl border-2 border-[#E8DED3] bg-[#FDF8F3]
                       text-base font-semibold text-[#10B981] placeholder-gray-400
                       focus:outline-none focus:border-[#10B981] transition-colors"
          />

          {/* Education */}
          <input
            type="text"
            value={educationInput}
            onChange={e => setEducationInput(e.target.value)}
            placeholder="Education"
            className="min-h-12.5 px-4 rounded-xl border-2 border-[#E8DED3] bg-[#FDF8F3]
                       text-base font-semibold text-[#10B981] placeholder-gray-400
                       focus:outline-none focus:border-[#10B981] transition-colors"
          />

          {/* Status */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as typeof filter)}
            className="min-h-12.5 px-4 rounded-xl border-2 border-[#E8DED3] bg-[#FDF8F3]
                       text-base font-semibold text-[#10B981] focus:outline-none
                       focus:border-[#10B981] transition-colors cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Row 3: Action buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={applyFilters}
            className="min-h-12.5 px-8 rounded-xl bg-[#10B981] hover:bg-[#059669]
                       text-white text-base font-bold transition-colors shadow-sm"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="min-h-12.5 px-8 rounded-xl border-2 border-[#10B981] bg-white
                       text-[#10B981] hover:bg-emerald-50 text-base font-bold transition-colors"
          >
            Clear Filters
          </button>
          {(activeSearch || activeAge || activeLocation || activeEducation) && (
            <span className="self-center text-sm text-gray-500">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E8DED3]">
          <p className="text-xl font-semibold text-gray-400">No profiles found</p>
        </div>
      )}

      {/* ── Table view ── */}
      {viewMode === 'table' && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8DED3] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FDF8F3] border-b-2 border-[#E8DED3]">
                <th className="px-5 py-4 text-xl font-bold text-[#1C1917] w-[250px]">Name</th>
                <th className="px-5 py-4 text-xl font-bold text-[#1C1917] w-[100px]">Age</th>
                <th className="px-5 py-4 text-xl font-bold text-[#1C1917] w-[150px]">Location</th>
                <th className="px-5 py-4 text-xl font-bold text-[#1C1917] w-[120px]">Status</th>
                <th className="px-5 py-4 text-xl font-bold text-[#1C1917] w-[150px]">Joined</th>
                <th className="px-5 py-4 text-xl font-bold text-[#1C1917] w-[200px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((profile, idx) => (
                <tr
                  key={profile._id}
                  className={`border-b border-gray-100 hover:bg-[#F0FDFB] transition-colors min-h-[60px] ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                  }`}
                >
                  {/* Name */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#FDF8F3] shrink-0 flex items-center justify-center">
                        {profile.photo ? (
                          <img src={profile.photo} alt={profile.name}
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <span className="text-gray-300">{profile.gender === 'female' ? '♀' : '♂'}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-base font-bold text-[#1C1917]">{profile.name}</p>
                        <p className="text-sm text-gray-400">{profile.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Age */}
                  <td className="px-5 py-4 text-base font-semibold text-[#1C1917]">
                    {profile.age ?? '—'}
                  </td>
                  {/* Location */}
                  <td className="px-5 py-4 text-base text-[#1C1917]">{profile.city || '—'}</td>
                  {/* Status */}
                  <td className="px-5 py-4">
                    <StatusBadge status={profile.profileStatus} />
                  </td>
                  {/* Joined */}
                  <td className="px-5 py-4 text-base text-gray-500">
                    {new Date(profile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Link href={`/staff/profiles/${profile._id}`}>
                        <button className="min-h-12.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669]
                                           text-white text-sm font-bold transition-colors">
                          View
                        </button>
                      </Link>
                      {profile.profileStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => { setSelectedProfile(profile); setAction('approve'); setReason(''); }}
                            className="min-h-12.5 px-4 rounded-xl border-2 border-[#10B981]
                                       text-[#10B981] bg-white hover:bg-emerald-50 text-sm font-bold transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setSelectedProfile(profile); setAction('reject'); setReason(''); }}
                            className="min-h-12.5 px-4 rounded-xl bg-[#EF4444] hover:bg-red-700
                                       text-white text-sm font-bold transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setNoteModal({ profileId: profile._id, profileName: profile.name, existing: profile.notes || '' })}
                        className="min-h-12.5 px-4 rounded-xl border-2 border-[#E8DED3]
                                   text-[#1C1917] bg-white hover:bg-[#FDF8F3] text-sm font-bold transition-colors"
                      >
                        Add Note
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Card grid ── */}
      {viewMode === 'card' && (
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(profile => (
          <div key={profile._id}
               className="bg-white rounded-2xl border border-[#E8DED3] shadow-sm overflow-hidden
                          flex flex-col hover:shadow-md transition-shadow">

            {/* Photo + name */}
            <div className="p-6 flex gap-4 items-start">
              {/* Photo */}
              <div className="shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-[#FDF8F3] border border-[#E8DED3]
                              flex items-center justify-center">
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    onError={e => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = 'none';
                      el.parentElement!.innerHTML = `<span class="text-3xl text-gray-300">${profile.gender === 'female' ? '♀' : '♂'}</span>`;
                    }}
                  />
                ) : (
                  <span className="text-3xl text-gray-300">{profile.gender === 'female' ? '♀' : '♂'}</span>
                )}
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-[#1C1917] leading-tight truncate">{profile.name}</h3>
                {profile.age && (
                  <p className="text-base text-gray-500 mt-0.5">Age {profile.age}</p>
                )}
                <p className="text-base text-gray-500">{profile.city}</p>
                <div className="mt-2">
                  <StatusBadge status={profile.profileStatus} />
                </div>
              </div>
            </div>

            {/* Info boxes */}
            <div className="px-6 pb-5 grid grid-cols-2 gap-2">
              <InfoBox label="Education"  value={profile.education} />
              <InfoBox label="Profession" value={profile.profession} />
              <InfoBox label="Caste"      value={profile.caste} />
              <InfoBox label="Gender"     value={profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : undefined} />
            </div>

            {/* Action buttons */}
            <div className="mt-auto px-6 pb-6 flex flex-col gap-2">
              <Link href={`/staff/profiles/${profile._id}`}>
                <button className="w-full min-h-12.5 rounded-xl border-2 border-[#10B981] text-[#10B981]
                                   bg-white hover:bg-emerald-50 text-base font-bold transition-colors">
                  View Full Profile
                </button>
              </Link>

              {profile.profileStatus === 'pending' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setSelectedProfile(profile); setAction('approve'); setReason(''); }}
                    className="min-h-12.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white
                               text-base font-bold transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setSelectedProfile(profile); setAction('reject'); setReason(''); }}
                    className="min-h-12.5 rounded-xl border-2 border-red-300 text-red-600
                               bg-red-50 hover:bg-red-100 text-base font-bold transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
              <button
                onClick={() => setNoteModal({ profileId: profile._id, profileName: profile.name, existing: profile.notes || '' })}
                className="w-full min-h-12.5 rounded-xl border-2 border-[#E8DED3] text-base font-bold
                           text-[#1C1917] bg-white hover:bg-[#FDF8F3] transition-colors"
              >
                Add Note
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Add Note modal */}
      <AddNoteModal
        isOpen={noteModal !== null}
        onClose={() => setNoteModal(null)}
        profileId={noteModal?.profileId ?? ''}
        profileName={noteModal?.profileName ?? ''}
        existingNote={noteModal?.existing ?? ''}
        onSaved={note => {
          setProfiles(prev => prev.map(p =>
            p._id === noteModal?.profileId ? { ...p, notes: note } : p
          ));
          setNoteModal(null);
        }}
      />

      {/* Approve / Reject dialog */}
      <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1C1917]">
              {action === 'approve' ? 'Approve Profile' : 'Reject Profile'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-xl bg-[#FDF8F3] px-5 py-4">
              <p className="text-base font-bold text-[#1C1917]">{selectedProfile?.name}</p>
              <p className="text-sm text-gray-500">{selectedProfile?.email}</p>
            </div>

            {action === 'reject' && (
              <div>
                <label className="block text-base font-semibold text-[#1C1917] mb-2">
                  Rejection Reason
                </label>
                <Textarea
                  placeholder="Explain why the profile was rejected..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="min-h-24 text-base"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <button
              onClick={() => setAction(null)}
              disabled={actionLoading}
              className="min-h-12.5 px-6 rounded-xl border-2 border-[#E8DED3] text-base font-bold
                         text-[#1C1917] bg-white hover:bg-[#FDF8F3] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submitAction}
              disabled={actionLoading || (action === 'reject' && !reason.trim())}
              className={`min-h-12.5 px-6 rounded-xl text-base font-bold text-white transition-colors
                          disabled:opacity-50 ${
                action === 'approve'
                  ? 'bg-[#10B981] hover:bg-[#059669]'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {actionLoading
                ? 'Processing...'
                : action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
