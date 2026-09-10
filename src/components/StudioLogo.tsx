import React from 'react';

interface StudioLogoProps {
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  altText?: string;
}

export const StudioLogo: React.FC<StudioLogoProps> = ({
  logoUrl,
  size = 'md',
  className = '',
  altText = 'Studio Bbelezza Logo',
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
    xl: 'w-36 h-36',
  };

  // If owner uploaded or set a custom image logo
  if (logoUrl && logoUrl.trim() !== '') {
    return (
      <div className={`relative rounded-full overflow-hidden shadow-md flex-shrink-0 border-2 border-[#dca6ac] ${sizeMap[size]} ${className}`}>
        <img
          src={logoUrl}
          alt={altText}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // fallback if custom URL fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Exact vector badge representing the uploaded Studio B Beleza circular logo
  return (
    <div
      className={`relative rounded-full overflow-hidden shadow-lg flex-shrink-0 select-none border-2 border-[#d99fa6]/60 transition-transform duration-300 hover:scale-105 ${sizeMap[size]} ${className}`}
      style={{
        background: 'radial-gradient(circle at 40% 35%, #6d152a 0%, #4e0f1e 75%, #380a15 100%)',
      }}
      title="STUDIO BBELEZZA"
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle rose gold gradient */}
          <linearGradient id="roseGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3c2c7" />
            <stop offset="50%" stopColor="#e8a8af" />
            <stop offset="100%" stopColor="#d28e96" />
          </linearGradient>

          {/* Curved path for top text */}
          <path
            id="curveTop"
            d="M 32,100 A 68,68 0 0,1 168,100"
            fill="none"
          />

          {/* Curved path for bottom text */}
          <path
            id="curveBottom"
            d="M 168,100 A 68,68 0 0,1 32,100"
            fill="none"
          />

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer subtle inner stroke */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="url(#roseGoldGrad)"
          strokeWidth="1.2"
          opacity="0.6"
        />

        {/* Inner delicate dotted / circular boundary */}
        <circle
          cx="100"
          cy="100"
          r="86"
          fill="none"
          stroke="url(#roseGoldGrad)"
          strokeWidth="0.8"
          strokeDasharray="2 3"
          opacity="0.4"
        />

        {/* Circular curved text - Top: STUDIO B BELEZA */}
        <text
          fill="url(#roseGoldGrad)"
          fontSize="11.5"
          fontWeight="600"
          letterSpacing="4.5"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <textPath href="#curveTop" startOffset="50%" textAnchor="middle">
            STUDIO B BELEZA
          </textPath>
        </text>

        {/* Circular curved text - Bottom: STUDIO B BELEZA */}
        <text
          fill="url(#roseGoldGrad)"
          fontSize="11.5"
          fontWeight="600"
          letterSpacing="4.5"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <textPath href="#curveBottom" startOffset="50%" textAnchor="middle">
            STUDIO B BELEZA
          </textPath>
        </text>

        {/* Left decorative flourished swirl with hearts */}
        <g stroke="url(#roseGoldGrad)" fill="none" strokeWidth="1.4" strokeLinecap="round">
          {/* Left swoosh */}
          <path d="M 28,100 C 45,96 55,103 72,100" />
          {/* Left heart 1 */}
          <path
            d="M 33,96 C 31,93 27,93 25,96 C 23,99 26,102 33,107 C 40,102 43,99 41,96 C 39,93 35,93 33,96 Z"
            transform="scale(0.4) translate(48, 128) rotate(-15)"
            fill="url(#roseGoldGrad)"
            opacity="0.85"
          />
          {/* Left heart 2 */}
          <path
            d="M 33,96 C 31,93 27,93 25,96 C 23,99 26,102 33,107 C 40,102 43,99 41,96 C 39,93 35,93 33,96 Z"
            transform="scale(0.3) translate(95, 240) rotate(-5)"
            fill="url(#roseGoldGrad)"
            opacity="0.9"
          />
        </g>

        {/* Right decorative flourished swirl with hearts */}
        <g stroke="url(#roseGoldGrad)" fill="none" strokeWidth="1.4" strokeLinecap="round">
          {/* Right swoosh */}
          <path d="M 128,100 C 145,97 155,104 172,100" />
          {/* Right heart 1 */}
          <path
            d="M 33,96 C 31,93 27,93 25,96 C 23,99 26,102 33,107 C 40,102 43,99 41,96 C 39,93 35,93 33,96 Z"
            transform="scale(0.4) translate(360, 126) rotate(15)"
            fill="url(#roseGoldGrad)"
            opacity="0.85"
          />
          {/* Right heart 2 */}
          <path
            d="M 33,96 C 31,93 27,93 25,96 C 23,99 26,102 33,107 C 40,102 43,99 41,96 C 39,93 35,93 33,96 Z"
            transform="scale(0.3) translate(515, 238) rotate(20)"
            fill="url(#roseGoldGrad)"
            opacity="0.9"
          />
        </g>

        {/* Center cursive monogram "sb" with flowing calligraphic lines */}
        <text
          x="100"
          y="114"
          textAnchor="middle"
          fill="url(#roseGoldGrad)"
          filter="url(#softGlow)"
          style={{
            fontFamily: "'Great Vibes', cursive",
            fontSize: '56px',
            fontWeight: '400',
            letterSpacing: '-2px',
          }}
        >
          sb
        </text>
      </svg>
    </div>
  );
};
