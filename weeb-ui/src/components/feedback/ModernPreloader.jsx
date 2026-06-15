import React, { useEffect, useState } from 'react';

const ModernPreloader = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Simulasi loading selesai atau tunggu sampai window load
    const handleLoad = () => {
      setTimeout(() => {
        setIsRemoving(true);
        setTimeout(() => setIsVisible(false), 800); // Durasi animasi fade out
      }, 2000); // Tampilkan minimal 2 detik untuk estetika
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B1120] transition-all duration-700 ease-in-out ${
        isRemoving ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Animated Logo Container */}
        <div className="relative w-24 h-24 mb-8">
          {/* Rotating Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500/30 animate-spin" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-blue-400 border-l-blue-400/30 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
          
          {/* Center Logo */}
          <div className="absolute inset-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 p-0.5 shadow-lg shadow-blue-500/20 overflow-hidden group">
            <div className="w-full h-full rounded-[14px] bg-[#0B1120] flex items-center justify-center overflow-hidden">
               <img 
                src="/logo-pwa.png" 
                alt="WeeBudget Logo" 
                className="w-10 h-10 object-contain animate-bounce"
                style={{ animationDuration: '2s' }}
              />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white animate-pulse">
            WeeBudget
          </h1>
          <p className="mt-2 text-blue-400/60 text-xs tracking-[0.3em] uppercase font-medium">
            Smart Personal Finance
          </p>
        </div>

        {/* Loading Bar */}
        <div className="mt-12 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full animate-progress" />
        </div>
      </div>

      <style jsx="true">{`
        @keyframes progress {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 70%; transform: translateX(0%); }
          100% { width: 100%; transform: translateX(100%); }
        }
        .animate-progress {
          animation: progress 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default ModernPreloader;
