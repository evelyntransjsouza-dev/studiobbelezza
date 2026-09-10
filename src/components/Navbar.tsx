import React, { useRef } from 'react';
import { StudioSettings } from '../types';
import { StudioLogo } from './StudioLogo';
import { Instagram, Phone, ArrowLeft, Shield } from 'lucide-react';

interface NavbarProps {
  settings: StudioSettings;
  activeView: 'client' | 'owner';
  setActiveView: (view: 'client' | 'owner') => void;
  onOpenSupabaseModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  activeView,
  setActiveView,
}) => {
  const cleanInstagram = settings.instagram.replace(/^@/, '');
  const cleanPhone = settings.phone.replace(/\D/g, '');

  // Secret click counter on logo to access owner area discreetly
  const logoClicksRef = useRef(0);
  const clickTimerRef = useRef<any>(null);

  const handleLogoClick = () => {
    logoClicksRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (logoClicksRef.current >= 3) {
      logoClicksRef.current = 0;
      setActiveView(activeView === 'owner' ? 'client' : 'owner');
    } else {
      clickTimerRef.current = setTimeout(() => {
        logoClicksRef.current = 0;
      }, 1000);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#ebd7d9] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand & Logo */}
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-3.5 cursor-pointer group"
            title="Studio B Beleza"
          >
            <StudioLogo logoUrl={settings.logoUrl} size="md" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-serif-luxury text-xl sm:text-2xl font-bold tracking-wider text-[#4a0d1a] group-hover:text-[#6f1428] transition-colors">
                  {settings.name || 'Studio B Beleza'}
                </span>
                {activeView === 'owner' && (
                  <span className="text-[10px] uppercase font-bold bg-[#581421] text-white px-2 py-0.5 rounded-full">
                    Gestão
                  </span>
                )}
              </div>
              <a
                href={`https://instagram.com/${cleanInstagram}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-[#8c3d4c] hover:text-[#52111d] font-medium transition-colors"
              >
                <Instagram size={13} className="text-[#a84457]" />
                <span>@{cleanInstagram}</span>
              </a>
            </div>
          </div>

          {/* Right Action: Clean & Customer-focused */}
          <div className="flex items-center gap-3">
            {activeView === 'owner' ? (
              <button
                type="button"
                onClick={() => setActiveView('client')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#581421] hover:bg-[#72192b] text-white text-xs font-semibold shadow-xs transition-all"
              >
                <ArrowLeft size={14} />
                <span>Voltar ao Site da Cliente</span>
              </button>
            ) : (
              <>
                <a
                  href={`https://instagram.com/${cleanInstagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#4a0d1a] hover:text-[#7d1c31] font-medium transition-colors px-3 py-1.5 rounded-full hover:bg-[#fff5f6]"
                >
                  <Instagram size={15} className="text-[#c26d7d]" />
                  <span>Instagram</span>
                </a>

                {settings.phone && (
                  <a
                    href={`https://wa.me/55${cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#25d366] hover:bg-[#20ba59] text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <Phone size={14} />
                    <span>WhatsApp</span>
                  </a>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
