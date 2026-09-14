import React, { useEffect, useState, useCallback, useRef } from 'react';

interface AppSplashProps {
  isSuspenseFallback?: boolean;
}

export const AppSplash: React.FC<AppSplashProps> = ({ isSuspenseFallback = false }) => {
  const [phase, setPhase] = useState<'animating' | 'exiting' | 'finished'>('animating');
  const [statusText, setStatusText] = useState('Connecting Network...');
  const startTimeRef = useRef<number>(Date.now());
  const minDurationMs = 750; // Guaranteed minimum presence so the motion is felt but remains snappy
  const maxTimeoutMs = 2500; // Hard timeout safety net

  const triggerExit = useCallback(() => {
    setPhase((prev) => {
      if (prev === 'finished' || prev === 'exiting') return prev;
      setStatusText('Network Ready');
      return 'exiting';
    });

    // After the exit morph animation finishes (380ms), completely unmount
    setTimeout(() => {
      setPhase('finished');
    }, 400);
  }, []);

  const handleMapReady = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, minDurationMs - elapsed);
    setTimeout(triggerExit, remaining);
  }, [triggerExit]);

  useEffect(() => {
    if (isSuspenseFallback) return;

    // Listen for custom event from MetroMap or timetable readiness
    const onMapReady = () => handleMapReady();
    window.addEventListener('ahm-map-ready', onMapReady);

    // Dynamic status text transition
    const t1 = setTimeout(() => {
      setStatusText('Loading Live Metros...');
    }, 400);

    // Hard fallback timer in case tile network is slow
    const fallbackTimer = setTimeout(() => {
      handleMapReady();
    }, maxTimeoutMs);

    return () => {
      window.removeEventListener('ahm-map-ready', onMapReady);
      clearTimeout(t1);
      clearTimeout(fallbackTimer);
    };
  }, [handleMapReady, isSuspenseFallback]);

  // If unmounted or finished, render nothing
  if (phase === 'finished') {
    return null;
  }

  const isExiting = phase === 'exiting';

  return (
    <div
      role="status"
      aria-label="Starting AhmMetro"
      onClick={triggerExit}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer transition-all duration-400 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
        isExiting ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'
      }`}
      style={{
        backgroundColor: '#090D16',
        willChange: 'opacity, transform',
      }}
    >
      {/* Background Multi-Line Ambient Glows (Ahmedabad Metro Corridors: Blue, Green, Red, Purple) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Blue Line Ambient (North-West) */}
        <div
          className={`absolute -top-24 -left-24 w-80 h-80 rounded-full bg-blue-600/20 blur-[90px] transition-all duration-700 ${
            isExiting ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
          }`}
        />
        {/* Green Line Ambient (North-East) */}
        <div
          className={`absolute -top-20 -right-20 w-80 h-80 rounded-full bg-emerald-600/15 blur-[90px] transition-all duration-700 ${
            isExiting ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
          }`}
        />
        {/* Red Line Ambient (South-West) */}
        <div
          className={`absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-red-600/15 blur-[90px] transition-all duration-700 ${
            isExiting ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
          }`}
        />
        {/* Purple Line Ambient (South-East) */}
        <div
          className={`absolute -bottom-24 -right-20 w-80 h-80 rounded-full bg-purple-600/15 blur-[90px] transition-all duration-700 ${
            isExiting ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
          }`}
        />
      </div>

      {/* Central Content Box with Momentum Zoom Morph */}
      <div
        className={`relative z-10 flex flex-col items-center text-center px-6 transition-all duration-400 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
          isExiting ? 'scale-110 -translate-y-4 blur-[3px] opacity-0' : 'scale-100 translate-y-0 blur-0 opacity-100'
        }`}
      >
        {/* Emblem Container with Subtle Frosted Glass & Border Light */}
        <div className="relative group flex items-center justify-center mb-6">
          {/* Breathing Core Aura */}
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-blue-500/25 via-emerald-500/20 to-purple-500/25 blur-xl animate-pulse" />

          {/* Frosted Badge Frame */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-0.5 bg-gradient-to-b from-white/20 via-white/10 to-white/5 shadow-2xl backdrop-blur-md">
            <div className="w-full h-full rounded-[22px] bg-[#0c1322]/90 flex items-center justify-center p-3 sm:p-4 overflow-hidden shadow-inner">
              {/* Custom SVG AhmMetro Train Emblem */}
              <svg
                viewBox="0 0 120 120"
                className="w-full h-full drop-shadow-[0_4px_12px_rgba(37,99,235,0.4)]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Aero Train Body */}
                <path
                  d="M20 74L30 38C32.5 29 40.5 22 50.5 22H69.5C79.5 22 87.5 29 90 38L100 74C102 81 97 88 89.5 88H30.5C23 88 18 81 20 74Z"
                  fill="url(#train_grad)"
                  stroke="#3B82F6"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />

                {/* Aerodynamic Windshield */}
                <path
                  d="M32 46L36 34C38 30 43 28 48 28H72C77 28 82 30 84 34L88 46C89.5 50 86.5 54 82 54H38C33.5 54 30.5 50 32 46Z"
                  fill="#0B132B"
                  stroke="#60A5FA"
                  strokeWidth="2"
                />
                {/* Windshield Reflection Glare */}
                <path
                  d="M40 32L36 44"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Speed Line Accents */}
                <path
                  d="M28 64H92"
                  stroke="#1D4ED8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Dual Luminous LED Headlights */}
                <circle cx="38" cy="74" r="5" fill="#F8FAFC" filter="drop-shadow(0 0 4px #60A5FA)" />
                <circle cx="82" cy="74" r="5" fill="#F8FAFC" filter="drop-shadow(0 0 4px #60A5FA)" />

                {/* Metro Nose Badge Accent */}
                <circle cx="60" cy="74" r="3.5" fill="#3B82F6" />

                {/* Lower Guard Rails */}
                <path
                  d="M44 88L40 96M76 88L80 96"
                  stroke="#64748B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                <defs>
                  <linearGradient id="train_grad" x1="60" y1="22" x2="60" y2="88" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1E3A8A" />
                    <stop offset="0.6" stopColor="#1E40AF" />
                    <stop offset="1" stopColor="#172554" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* Brand Name Typography */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-sans drop-shadow-sm">
              Ahm<span className="text-blue-500">Metro</span>
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">
            Ahmedabad & Gandhinagar
          </p>
        </div>

        {/* Dynamic Electric Track Line Sweep */}
        <div className="relative w-48 sm:w-56 h-1 mt-7 rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
          {/* Luminous High-Speed Photon Beam */}
          <div
            className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
            style={{
              animation: 'track-sweep 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            }}
          />
        </div>

        {/* Micro-Status Pill with Live Signal Pulse */}
        <div className="flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium text-slate-300 tracking-wide font-sans">
            {statusText}
          </span>
        </div>
      </div>

      {/* Embedded CSS Keyframes for Track Beam */}
      <style>{`
        @keyframes track-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(250%);
          }
        }
      `}</style>
    </div>
  );
};

export default AppSplash;
