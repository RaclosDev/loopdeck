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
  const tier5 = streak >= 60;
  const tier6 = streak >= 100;
  const tier7 = streak >= 365;

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
      {(tier4 || tier7) && (
        <div style={{
          position: 'absolute', width: tier7 ? '120%' : '90%', height: tier7 ? '120%' : '90%',
          background: tier7 ? currentSkin.coreColor : currentSkin.baseColor, 
          filter: tier7 ? 'blur(35px)' : 'blur(25px)', borderRadius: '50%',
          animation: tier7 ? 'pulseGlow 1s ease-in-out infinite alternate' : 'pulseGlow 2s ease-in-out infinite alternate', 
          opacity: tier7 ? 0.5 : 0.3
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

      {/* Magic Runes / Orbit (Tier 5) */}
      {tier5 && (
        <div style={{
          position: 'absolute',
          width: '110%',
          height: '110%',
          border: `2px dashed ${currentSkin.coreColor}`,
          borderRadius: '50%',
          opacity: 0.5,
          animation: 'spinRunes 10s linear infinite'
        }} />
      )}

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

        {/* Epic Wings (Tier 7) */}
        {tier7 && (
          <g style={{ animation: 'flapWings 3s ease-in-out infinite', transformOrigin: '50% 50%', opacity: 0.6 }}>
            <path d="M 40 40 Q 10 20 5 50 Q 20 60 40 50 Z" fill={currentSkin.coreColor} />
            <path d="M 60 40 Q 90 20 95 50 Q 80 60 60 50 Z" fill={currentSkin.coreColor} />
          </g>
        )}

        {/* Energy Particles (Tier 6) */}
        {tier6 && (
          <g style={{ animation: 'shootUp 2s linear infinite' }}>
            <circle cx="40" cy="80" r="2.5" fill={currentSkin.coreColor} />
            <circle cx="60" cy="90" r="2" fill={currentSkin.coreColor} />
            <circle cx="50" cy="70" r="3" fill={currentSkin.coreColor} />
          </g>
        )}

        {/* Crown / Halo (Tier 3) */}
        {tier3 && (
          <path 
            d={tier7 ? "M 30 20 L 40 5 L 50 15 L 60 5 L 70 20" : "M 35 25 L 42 15 L 50 22 L 58 15 L 65 25"} 
            fill="none" 
            stroke={currentSkin.coreColor} 
            strokeWidth={tier7 ? "4" : "3"} 
            strokeLinecap="round" 
            style={{ animation: 'floatFlame 2s ease-in-out infinite alternate', opacity: tier7 ? 1 : 0.8 }}
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
            <path d={tier5 ? "M 25 55 C 25 55, 10 70, 5 85 C 5 95, 20 95, 25 90 Z" : "M 25 65 C 25 65, 15 75, 12 85 C 10 90, 20 95, 25 90 Z"} fill={`url(#flameGrad-${skin})`} opacity={tier5 ? "1" : "0.8"} />
            <path d={tier5 ? "M 75 55 C 75 55, 90 70, 95 85 C 95 95, 80 95, 75 90 Z" : "M 75 65 C 75 65, 85 75, 88 85 C 90 90, 80 95, 75 90 Z"} fill={`url(#flameGrad-${skin})`} opacity={tier5 ? "1" : "0.8"} />
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
          <circle cx="38" cy="65" r="4" fill={tier6 ? currentSkin.coreColor : "#111"} />
          <circle cx="62" cy="65" r="4" fill={tier6 ? currentSkin.coreColor : "#111"} />
          
          {/* Eye highlights */}
          {!tier6 && (
            <>
              <circle cx="36" cy="63" r="1.5" fill="#fff" />
              <circle cx="60" cy="63" r="1.5" fill="#fff" />
            </>
          )}
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
        @keyframes spinRunes {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shootUp {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-40px); opacity: 0; }
        }
        @keyframes flapWings {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(0.7); }
        }
      `}</style>
    </div>
  );
}
