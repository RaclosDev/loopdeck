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

export default function Mascot({ skin = 'default', size = 64 }) {
  const currentSkin = SKINS[skin] || SKINS.default;

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
      <div style={{
        position: 'absolute',
        width: '60%',
        height: '60%',
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

        {/* Base Flame Shape */}
        <path 
          d="M50 10 C50 10, 30 40, 20 60 C10 80, 30 95, 50 95 C70 95, 90 80, 80 60 C70 40, 50 10, 50 10 Z" 
          fill={`url(#flameGrad-${skin})`}
          style={{
            transformOrigin: '50% 90%',
            animation: 'breatheFlame 2s ease-in-out infinite alternate'
          }}
        />

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
