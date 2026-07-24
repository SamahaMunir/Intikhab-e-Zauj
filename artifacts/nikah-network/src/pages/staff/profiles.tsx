import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { getToken } from '@/lib/auth';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Users, RefreshCw, Search, LayoutGrid, List,
  User as UserIcon, Eye, StickyNote, Loader2, Check, X, Trash2, SlidersHorizontal,
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
  const advCount = [ageFilter, locationFilter, educationFilter].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(''); setAgeFilter(''); setLocationFilter(''); setEducationFilter('');
    setFilter('all');
  };
  const hasActiveFilters = !!(search || ageFilter || locationFilter || educationFilter || filter !== 'all');

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const token = getToken('staff');
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
      const token = getToken('staff');
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
    if (p.profileStatus === 'rejected') return false; // rejected profiles are auto-deleted — never list them
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

  const visibleProfiles = profiles.filter(p => p.profileStatus !== 'rejected');
  const counts = {
    all:      visibleProfiles.length,
    pending:  visibleProfiles.filter(p => p.profileStatus === 'pending').length,
    approved: visibleProfiles.filter(p => p.profileStatus === 'approved').length,
  };

  const filterTabs: { key: typeof filter; label: string }[] = [
    { key: 'all',      label: `All (${counts.all})` },
    { key: 'pending',  label: `Pending (${counts.pending})` },
    { key: 'approved', label: `Approved (${counts.approved})` },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-9 h-9 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Applicant Profiles</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and review applicant profiles · <span className="font-semibold text-foreground">{counts.all}</span> total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden bg-card">
            {([
              { mode: 'card',  icon: LayoutGrid },
              { mode: 'table', icon: List },
            ] as const).map(({ mode, icon: Icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`p-2.5 transition-colors ${
                  viewMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`} aria-label={`${mode} view`}>
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
          <button onClick={fetchProfiles}
            className="flex items-center gap-2 h-11 px-4 rounded-xl border border-border bg-card
                       text-sm font-bold text-foreground hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Seamless filter toolbar */}
      <div className="space-y-3">
        {/* Search + status tabs on one line */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or location…"
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-card border border-border text-sm
                         text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary
                         focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>
          <div className="flex gap-1.5 shrink-0">
            {filterTabs.map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3.5 h-11 rounded-xl text-sm font-bold transition-colors border ${
                  filter === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}>
                {label}
              </button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`px-3.5 h-11 rounded-xl text-sm font-bold transition-colors border inline-flex items-center gap-1.5 ${
                    advCount
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-card text-muted-foreground border-border hover:text-foreground"
                  }`}>
                  <SlidersHorizontal className="w-4 h-4" /> Filters
                  {advCount > 0 && (
                    <span className="ml-0.5 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold inline-flex items-center justify-center">
                      {advCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-3">
                <p className="text-sm font-bold text-foreground">Filters</p>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Age</span>
                  <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)}
                    className="h-9 px-3 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer">
                    <option value="">Any age</option>
                    <option value="under25">Under 25</option>
                    <option value="25-30">25 – 30</option>
                    <option value="31-35">31 – 35</option>
                    <option value="36+">36 +</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">City</span>
                  <input type="text" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                    placeholder="Any city"
                    className="h-9 px-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary" />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Education</span>
                  <input type="text" value={educationFilter} onChange={e => setEducationFilter(e.target.value)}
                    placeholder="Any degree"
                    className="h-9 px-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary" />
                </label>

                {advCount > 0 && (
                  <button onClick={() => { setAgeFilter(''); setLocationFilter(''); setEducationFilter(''); }}
                    className="text-sm text-muted-foreground hover:text-foreground font-bold inline-flex items-center gap-1 transition-colors">
                    <X className="w-4 h-4" /> Clear these
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Result count + clear */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            <span className="text-foreground font-bold">{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''}
          </span>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="ml-auto text-muted-foreground hover:text-foreground font-bold inline-flex items-center gap-1 transition-colors">
              <X className="w-4 h-4" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-bold text-muted-foreground">No profiles found</p>
        </div>
      )}

      {/* ── Table view ── */}
      {viewMode === 'table' && filtered.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted border-b border-border">
                  {['Name', 'Age', 'Location', 'Status', 'Joined', 'Actions'].map((h, i) => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${i === 5 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((profile, idx) => (
                  <tr key={profile._id}
                    className={`border-b border-border hover:bg-muted transition-colors ${
                      idx % 2 ? 'bg-card' : 'bg-muted/30'
                    }`}>
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                          {profile.photo ? (
                            <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{profile.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-foreground">{profile.age ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{profile.city || '—'}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={profile.profileStatus} /></td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(profile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Link href={`/staff/profiles/${profile._id}`}>
                          <button className="h-9 px-3.5 rounded-lg bg-primary hover:bg-primary text-white text-xs font-bold transition-colors">
                            View
                          </button>
                        </Link>
                        {profile.profileStatus === 'pending' ? (
                          <>
                            <button onClick={() => { setSelectedProfile(profile); setAction('approve'); setReason(''); }}
                              className="h-9 px-3.5 rounded-lg border border-primary text-primary bg-card hover:bg-primary/10 text-xs font-bold transition-colors">
                              Approve
                            </button>
                            <button onClick={() => { setSelectedProfile(profile); setAction('reject'); setReason(''); }}
                              className="h-9 px-3.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors">
                              Reject
                            </button>
                          </>
                        ) : (
                          <button onClick={() => { setSelectedProfile(profile); setAction('reject'); setReason(''); }}
                            className="h-9 px-3.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors flex items-center gap-1">
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                        <button onClick={() => setNoteModal({ profileId: profile._id, profileName: profile.name, existing: profile.notes || '' })}
                          className="h-9 px-3.5 rounded-lg border border-border text-muted-foreground bg-card hover:bg-muted text-xs font-bold transition-colors">
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
                topRight={<StatusBadge status={profile.profileStatus} />}
                footer={
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Link href={`/staff/profiles/${profile._id}`} className="flex-1">
                        <button className="w-full h-11 rounded-xl bg-linear-to-r from-primary to-primary
                                           text-white text-sm font-bold flex items-center justify-center gap-1.5
                                           shadow-sm hover:shadow-md hover:brightness-105 transition-all">
                          <Eye className="w-4 h-4" /> View Profile
                        </button>
                      </Link>
                      <button onClick={() => setNoteModal({ profileId: profile._id, profileName: profile.name, existing: profile.notes || '' })}
                        className="h-11 px-4 rounded-xl border border-[#E8DED3] text-foreground text-sm font-bold
                                   flex items-center justify-center gap-1.5 hover:bg-[#FDF8F3] hover:border-primary transition-colors">
                        <StickyNote className="w-4 h-4" /> Note
                      </button>
                    </div>
                    {profile.profileStatus === 'pending' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { setSelectedProfile(profile); setAction('approve'); setReason(''); }}
                          className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-primary/10
                                     text-primary hover:bg-primary/20 text-sm font-bold transition-colors">
                          <Check className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => { setSelectedProfile(profile); setAction('reject'); setReason(''); }}
                          className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-red-50
                                     text-red-600 hover:bg-red-100 text-sm font-bold transition-colors">
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setSelectedProfile(profile); setAction('reject'); setReason(''); }}
                        className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl bg-red-50
                                   text-red-600 hover:bg-red-100 text-sm font-bold transition-colors">
                        <Trash2 className="w-4 h-4" /> Remove Profile
                      </button>
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
            <DialogTitle className="text-xl font-bold text-foreground">
              {action === 'approve' ? 'Approve Profile' : 'Reject & Delete Profile'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-xl bg-muted px-5 py-4">
              <p className="text-base font-bold text-foreground">{selectedProfile?.name}</p>
              <p className="text-sm text-muted-foreground">{selectedProfile?.email}</p>
            </div>

            {action === 'reject' && (
              <div>
                <div className="flex items-start gap-2 p-3 mb-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                  <Trash2 className="w-4 h-4 shrink-0 mt-0.5" />
                  Rejecting permanently deletes this profile. This cannot be undone.
                </div>
                <label className="block text-sm font-bold text-foreground mb-2">Reason</label>
                <Textarea
                  placeholder="Explain why the profile is being rejected/removed…"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="min-h-24 text-base"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <button onClick={() => setAction(null)} disabled={actionLoading}
              className="h-11 px-6 rounded-xl border border-border text-sm font-bold
                         text-muted-foreground bg-card hover:bg-muted transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button onClick={submitAction}
              disabled={actionLoading || (action === 'reject' && !reason.trim())}
              className={`h-11 px-6 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                action === 'approve' ? 'bg-primary hover:bg-primary' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {actionLoading ? 'Processing…' : action === 'approve' ? 'Approve' : 'Reject & Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
