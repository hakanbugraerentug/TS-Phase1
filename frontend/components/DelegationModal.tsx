import React, { useState, useEffect, useRef } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';

interface OrgUser {
  username: string;
  fullName: string;
  title: string;
  department: string;
  directorate: string;
}

interface DelegationModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const DURATION_OPTIONS = [
  { value: '1_gun', label: '1 Gün' },
  { value: '1_hafta', label: '1 Hafta' },
  { value: 'suresiz', label: 'Ben Değiştirene Kadar' },
];

export const DelegationModal: React.FC<DelegationModalProps> = ({ user, onClose, onSuccess }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<OrgUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [selectedDuration, setSelectedDuration] = useState('1_hafta');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/users/all-org`, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        if (res.ok) {
          const data: OrgUser[] = await res.json();
          setAllUsers(data.filter(u => u.username !== user.username));
        }
      } catch {
        // ignore
      }
    };
    fetchUsers();
  }, [apiUrl, user.accessToken, user.username]);

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setFilteredUsers([]);
      setShowDropdown(false);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = allUsers.filter(
      u =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.title || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q)
    );
    setFilteredUsers(results.slice(0, 8));
    setShowDropdown(results.length > 0);
  }, [searchQuery, allUsers]);

  const handleSelectUser = (u: OrgUser) => {
    setSelectedUser(u);
    setSearchQuery(u.fullName);
    setShowDropdown(false);
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      setError('Lütfen bir kişi seçin.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/delegations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({
          delegateUsername: selectedUser.username,
          durationType: selectedDuration,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        setError(body || 'Bir hata oluştu.');
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a] border border-blue-500/30 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-visible"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Yetki Delege Et</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Yönetici Paneli Erişimi</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Seçtiğiniz kişi, siz yerine yönetici paneline erişebilecek ve raporlarınızı inceleyebilecektir.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6">
          {/* User Search */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Kişi Seç
            </label>
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (selectedUser && e.target.value !== selectedUser.fullName) {
                    setSelectedUser(null);
                  }
                }}
                placeholder="İsim veya kullanıcı adı ile ara..."
                className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                autoFocus
              />
              {showDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button
                      key={u.username}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-600/10 transition-colors text-left"
                      onClick={() => handleSelectUser(u)}
                    >
                      <UserAvatar
                        username={u.username}
                        displayName={u.fullName}
                        accessToken={user.accessToken}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate">{u.fullName}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {u.title || u.department || u.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected user preview */}
            {selectedUser && (
              <div className="mt-3 flex items-center gap-3 bg-blue-600/10 border border-blue-500/20 rounded-xl px-4 py-3">
                <UserAvatar
                  username={selectedUser.username}
                  displayName={selectedUser.fullName}
                  accessToken={user.accessToken}
                  size="md"
                />
                <div>
                  <p className="text-sm font-black text-white">{selectedUser.fullName}</p>
                  <p className="text-[10px] text-blue-400 font-bold">{selectedUser.title || selectedUser.department}</p>
                </div>
                <button
                  className="ml-auto text-slate-500 hover:text-red-400 transition-colors"
                  onClick={() => { setSelectedUser(null); setSearchQuery(''); searchRef.current?.focus(); }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Duration Selection */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Süre
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedDuration(opt.value)}
                  className={`px-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200 ${
                    selectedDuration === opt.value
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400 font-bold">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white transition-all"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedUser}
            className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Delege Et'}
          </button>
        </div>
      </div>
    </div>
  );
};
