import React from 'react';

const SKINS = {
  default: {
    baseColor: '#ff7b00',
    coreColor: '#ffea00',
    glowColor: 'rgba(255, 123, 0, 0.4)',
  },
  toxic: {
    baseColor: '#00ff40',
    coreColor: '#a1ffba',
    glowColor: 'rgba(0, 255, 64, 0.4)',
  },
  divine: {
    baseColor: '#ffd700',
    coreColor: '#ffffff',
    glowColor: 'rgba(255, 215, 0, 0.5)',
  },
  void: {
    baseColor: '#6a0dad',
    coreColor: '#d896ff',
    glowColor: 'rgba(106, 13, 173, 0.6)',
  },
  cyber: {
    baseColor: '#00d0ff',
    coreColor: '#ffffff',
    glowColor: 'rgba(0, 208, 255, 0.5)',
  }
};

export default function Mascot({ skin = 'default', size = 64, streak = 0 }) {
  const currentSkin = SKINS[skin] || SKINS.default;

  const tier1 = streak >= 3;
  const tier2 = streak >= 7;
  const tier3 = streak >= 14;
  const tier4 = streak >= 30;

  return (
    <div style={{
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      {/* Glow effect */}
      {tier4 && (
        <div style={{
          position: 'absolute', width: '90%', height: '90%',
          background: currentSkin.baseColor, filter: 'blur(25px)', borderRadius: '50%',
          animation: 'pulseGlow 2s ease-in-out infinite alternate', opacity: 0.3
        }} />
      )}
      <div style={{
        position: 'absolute',
        width: tier2 ? '75%' : '60%',
        height: tier2 ? '75%' : '60%',
        background: currentSkin.glowColor,
        filter: 'blur(15px)',
        borderRadius: '50%',
        animation: 'pulseGlow 2s ease-in-out infinite alternate'
      }} />

      <svg 
        viewBox="0 0 100 100" 
        style={{
          width: '100%', 
          height: '100%', 
          position: 'relative',
          zIndex: 1,
          animation: 'floatFlame 3s ease-in-out infinite'
        }}
      >
        <defs>
          <linearGradient id={`flameGrad-${skin}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={currentSkin.baseColor} />
            <stop offset="100%" stopColor={currentSkin.coreColor} />
          </linearGradient>
        </defs>

        {/* Crown / Halo (Tier 3) */}
        {tier3 && (
          <path 
            d="M 35 25 L 42 15 L 50 22 L 58 15 L 65 25" 
            fill="none" 
            stroke={currentSkin.coreColor} 
            strokeWidth="3" 
            strokeLinecap="round" 
            style={{ animation: 'floatFlame 2s ease-in-out infinite alternate', opacity: 0.8 }}
          />
        )}

        {/* Base Flame Shape */}
        <path 
          d="M50 10 C50 10, 30 40, 20 60 C10 80, 30 95, 50 95 C70 95, 90 80, 80 60 C70 40, 50 10, 50 10 Z" 
          fill={`url(#flameGrad-${skin})`}
          style={{
            transformOrigin: '50% 90%',
            animation: 'breatheFlame 2s ease-in-out infinite alternate'
          }}
        />

        {/* Side Flames (Tier 1) */}
        {tier1 && (
          <g style={{ animation: 'breatheFlame 1.5s ease-in-out infinite alternate-reverse', transformOrigin: '50% 90%' }}>
            <path d="M 25 65 C 25 65, 15 75, 12 85 C 10 90, 20 95, 25 90 Z" fill={`url(#flameGrad-${skin})`} opacity="0.8" />
            <path d="M 75 65 C 75 65, 85 75, 88 85 C 90 90, 80 95, 75 90 Z" fill={`url(#flameGrad-${skin})`} opacity="0.8" />
          </g>
        )}

        {/* Sparkles (Tier 2) */}
        {tier2 && (
          <g style={{ animation: 'pulseGlow 1s infinite alternate' }}>
            <circle cx="20" cy="40" r="2" fill={currentSkin.coreColor} />
            <circle cx="80" cy="50" r="1.5" fill={currentSkin.coreColor} />
            <circle cx="70" cy="20" r="2" fill={currentSkin.coreColor} />
            <circle cx="30" cy="25" r="1.5" fill={currentSkin.coreColor} />
          </g>
        )}

        {/* Eyes */}
        <g style={{ animation: 'blinkEyes 4s infinite' }}>
          <circle cx="38" cy="65" r="4" fill="#111" />
          <circle cx="62" cy="65" r="4" fill="#111" />
          
          {/* Eye highlights */}
          <circle cx="36" cy="63" r="1.5" fill="#fff" />
          <circle cx="60" cy="63" r="1.5" fill="#fff" />
        </g>

        {/* Smile */}
        <path d="M 42 75 Q 50 82 58 75" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <style>{`
        @keyframes floatFlame {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes breatheFlame {
          0% { transform: scaleY(1) scaleX(1); }
          100% { transform: scaleY(1.05) scaleX(0.95); }
        }
        @keyframes pulseGlow {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes blinkEyes {
          0%, 96%, 98% { transform: scaleY(1); transform-origin: center 65px; }
          97% { transform: scaleY(0.1); transform-origin: center 65px; }
        }
      `}</style>
    </div>
  );
}
