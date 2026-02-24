
import React, { useState, useEffect } from 'react';

interface UserAvatarProps {
  username: string;
  displayName: string;
  accessToken: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ username, displayName, accessToken, size = 'md', className = '' }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl text-[9px]',
    md: 'w-10 h-10 rounded-xl text-sm',
    lg: 'w-20 h-20 rounded-3xl text-4xl',
  };

  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchPhoto = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/users/${username}/photo`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const blob = await res.blob();
          objectUrl = URL.createObjectURL(blob);
          setPhotoUrl(objectUrl);
        }
      } catch { /* fallback */ }
    };
    fetchPhoto();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [username, accessToken]);

  const baseClasses = `${sizeClasses[size]} flex items-center justify-center font-black overflow-hidden flex-shrink-0 ${className}`;

  if (photoUrl) {
    return (
      <img src={photoUrl} alt={displayName} className={baseClasses} style={{ objectFit: 'cover' }} />
    );
  }

  return (
    <div className={`${baseClasses} bg-slate-800 border border-white/10 text-blue-400`}>
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
};
