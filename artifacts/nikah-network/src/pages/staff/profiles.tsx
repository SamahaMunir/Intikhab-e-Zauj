import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import AddNoteModal from "@/components/AddNoteModal";
import ProfileImageCard from "@/components/matches/ProfileImageCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, RefreshCw, Search, LayoutGrid, List,
  User as UserIcon, Eye, StickyNote, Loader2, Check, X, Clock,
} from "lucide-react";

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

export default function StaffProfiles() {
  const [, setLocation] = useLocation();
  const [profiles, setProfiles]       = useState<Profile[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [action, setAction]           = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason]           = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode,      setViewMode]      = useState<'card' | 'table'>('card');

  // Live filter state (applied as you type/select)
  const [search,         setSearch]         = useState('');
  const [ageFilter,      setAgeFilter]      = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [educationFilter, setEducationFilter] = useState('');

  const clearFilters = () => {
    setSearch(''); setAgeFilter(''); setLocationFilter(''); setEducationFilter('');
    setFilter('all');
  };
  const hasActiveFilters = !!(search || ageFilter || locationFilter || educationFilter || filter !== 'all');

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
    if (search) {
      const q = search.toLowerCase();
      if (!p.name?.toLowerCase().includes(q) && !p.city?.toLowerCase().includes(q)) return false;
    }
    if (locationFilter && !p.city?.toLowerCase().includes(locationFilter.toLowerCase())) return false;
    if (educationFilter && !p.education?.toLowerCase().includes(educationFilter.toLowerCase())) return false;
    if (ageFilter) {
      const a = p.age;
      if (a == null) return false; // exclude profiles with no age when filtering by age
      if (ageFilter === 'under25' && a >= 25) return false;
      if (ageFilter === '25-30'  && (a < 25 || a > 30)) return false;
      if (ageFilter === '31-35'  && (a < 31 || a > 35)) return false;
      if (ageFilter === '36+'    && a < 36) return false;
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

  const inputCls =
    'h-11 px-4 rounded-xl bg-[#F4F6F5] border border-gray-200 text-sm text-[#1C1917] ' +
    'placeholder-gray-400 focus:outline-none focus:border-[#10B981] focus:bg-white transition-colors';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-9 h-9 animate-spin text-[#10B981]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-[#10B981]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#1C1917]">Recommended Profiles</h1>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-[#10B981]">Islamic Matrimonial</span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-[#D97706]">Family-Friendly</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage and review applicant profiles · <span className="font-semibold text-[#1C1917]">{counts.all}</span> total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
            {([
              { mode: 'card',  icon: LayoutGrid },
              { mode: 'table', icon: List },
            ] as const).map(({ mode, icon: Icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`p-2.5 transition-colors ${
                  viewMode === mode ? 'bg-[#10B981] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`} aria-label={`${mode} view`}>
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
          <button onClick={fetchProfiles}
            className="flex items-center gap-2 h-11 px-4 rounded-xl border border-gray-200 bg-white
                       text-sm font-bold text-[#1C1917] hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              filter === key
                ? "bg-[#10B981] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50 hover:text-[#10B981]"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Search + Filter bar (live) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#10B981] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or location…"
            className="w-full h-12 pl-11 pr-5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-sm
                       text-[#1C1917] placeholder-[#10B981]/60 focus:outline-none focus:border-[#10B981]
                       focus:bg-white transition-colors"
          />
        </div>

        {/* Filter fields w/ labels */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide ml-1">Age</span>
            <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)} className={inputCls + ' cursor-pointer'}>
              <option value="">Any age</option>
              <option value="under25">Under 25</option>
              <option value="25-30">25 – 30</option>
              <option value="31-35">31 – 35</option>
              <option value="36+">36 +</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide ml-1">Location</span>
            <input type="text" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
              placeholder="Any city" className={inputCls} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide ml-1">Education</span>
            <input type="text" value={educationFilter} onChange={e => setEducationFilter(e.target.value)}
              placeholder="Any degree" className={inputCls} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide ml-1">Status</span>
            <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className={inputCls + ' cursor-pointer'}>
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>

        {/* Result count + clear */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-sm font-semibold text-gray-500">
            <span className="text-[#10B981] font-bold">{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''}
            {hasActiveFilters && <span className="text-gray-400"> · filtered from {profiles.length}</span>}
          </span>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-600
                         hover:bg-gray-50 text-sm font-bold transition-colors">
              <X className="w-4 h-4" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-500">No profiles found</p>
        </div>
      )}

      {/* ── Table view ── */}
      {viewMode === 'table' && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F4F6F5] border-b border-gray-100">
                  {['Name', 'Age', 'Location', 'Status', 'Joined', 'Actions'].map((h, i) => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap ${i === 5 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((profile, idx) => (
                  <tr key={profile._id}
                    className={`border-b border-gray-50 hover:bg-[#F4F6F5] transition-colors ${
                      idx % 2 ? 'bg-white' : 'bg-gray-50/30'
                    }`}>
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#F4F6F5] shrink-0 flex items-center justify-center">
                          {profile.photo ? (
                            <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <UserIcon className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1C1917] truncate">{profile.name}</p>
                          <p className="text-xs text-gray-400 truncate">{profile.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#1C1917]">{profile.age ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{profile.city || '—'}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={profile.profileStatus} /></td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(profile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Link href={`/staff/profiles/${profile._id}`}>
                          <button className="h-9 px-3.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold transition-colors">
                            View
                          </button>
                        </Link>
                        {profile.profileStatus === 'pending' && (
                          <>
                            <button onClick={() => { setSelectedProfile(profile); setAction('approve'); setReason(''); }}
                              className="h-9 px-3.5 rounded-lg border border-[#10B981] text-[#10B981] bg-white hover:bg-emerald-50 text-xs font-bold transition-colors">
                              Approve
                            </button>
                            <button onClick={() => { setSelectedProfile(profile); setAction('reject'); setReason(''); }}
                              className="h-9 px-3.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                        <button onClick={() => setNoteModal({ profileId: profile._id, profileName: profile.name, existing: profile.notes || '' })}
                          className="h-9 px-3.5 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 text-xs font-bold transition-colors">
                          Note
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Card grid (shared profile card) ── */}
      {viewMode === 'card' && filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(profile => {
            const sb = {
              approved: { Icon: Check, cls: 'bg-[#10B981] text-white' },
              rejected: { Icon: X,     cls: 'bg-red-500 text-white' },
              pending:  { Icon: Clock, cls: 'bg-[#D97706] text-white' },
            }[profile.profileStatus] ?? { Icon: Clock, cls: 'bg-gray-400 text-white' };

            const lines = [
              profile.education,
              profile.profession,
              profile.city,
              profile.caste,
              profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : '',
            ].filter(Boolean) as string[];

            return (
              <ProfileImageCard key={profile._id}
                photo={profile.photo} name={profile.name} age={profile.age} lines={lines}
                heightClass="h-80" onClick={() => setLocation(`/staff/profiles/${profile._id}`)}
                topRight={
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md ${sb.cls}`}
                       title={profile.profileStatus}>
                    <sb.Icon className="w-5 h-5" />
                  </div>
                }
                footer={
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Link href={`/staff/profiles/${profile._id}`} className="flex-1">
                        <button className="w-full h-11 rounded-xl bg-linear-to-r from-[#10B981] to-[#059669]
                                           text-white text-sm font-bold flex items-center justify-center gap-1.5
                                           shadow-sm hover:shadow-md hover:brightness-105 transition-all">
                          <Eye className="w-4 h-4" /> View Profile
                        </button>
                      </Link>
                      <button onClick={() => setNoteModal({ profileId: profile._id, profileName: profile.name, existing: profile.notes || '' })}
                        className="h-11 px-4 rounded-xl border border-[#E8DED3] text-[#1C1917] text-sm font-bold
                                   flex items-center justify-center gap-1.5 hover:bg-[#FDF8F3] hover:border-[#10B981] transition-colors">
                        <StickyNote className="w-4 h-4" /> Note
                      </button>
                    </div>
                    {profile.profileStatus === 'pending' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { setSelectedProfile(profile); setAction('approve'); setReason(''); }}
                          className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-emerald-50
                                     text-[#10B981] hover:bg-emerald-100 text-sm font-bold transition-colors">
                          <Check className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => { setSelectedProfile(profile); setAction('reject'); setReason(''); }}
                          className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-red-50
                                     text-red-600 hover:bg-red-100 text-sm font-bold transition-colors">
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                }
              />
            );
          })}
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
            <div className="rounded-xl bg-[#F4F6F5] px-5 py-4">
              <p className="text-base font-bold text-[#1C1917]">{selectedProfile?.name}</p>
              <p className="text-sm text-gray-500">{selectedProfile?.email}</p>
            </div>

            {action === 'reject' && (
              <div>
                <label className="block text-sm font-bold text-[#1C1917] mb-2">Rejection Reason</label>
                <Textarea
                  placeholder="Explain why the profile was rejected…"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="min-h-24 text-base"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <button onClick={() => setAction(null)} disabled={actionLoading}
              className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-bold
                         text-gray-600 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button onClick={submitAction}
              disabled={actionLoading || (action === 'reject' && !reason.trim())}
              className={`h-11 px-6 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                action === 'approve' ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {actionLoading ? 'Processing…' : action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
