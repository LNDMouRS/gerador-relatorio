import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-3 right-3 z-40 flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border border-slate-700 backdrop-blur-xs animate-pulse"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>Modo Offline (Tesseract e salvamento local ativos)</span>
    </div>
  );
};
