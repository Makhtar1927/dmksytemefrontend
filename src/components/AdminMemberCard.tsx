import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { QRCode } from 'react-qr-code';

interface AdminMemberCardProps {
  memberInfo: any;
  cardRef?: React.RefObject<HTMLDivElement>;
}

export default function AdminMemberCard({ memberInfo, cardRef }: AdminMemberCardProps) {
  if (!memberInfo) return null;

  const cardDataForQR = `ID:${memberInfo.dmk_id || 'N/A'} | Nom:${memberInfo.first_name} ${memberInfo.last_name} | Role:${memberInfo.role}`;

  // Calcul de la date d'expiration (5 ans à partir d'aujourd'hui)
  // Dans le vrai cas on devrait prendre la date d'achat de la carte, mais par défaut on met 5 ans après la date du jour ou date d'inscription
  const issueDate = new Date();
  const expiryDate = new Date(issueDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 5);
  const expiryFormatted = expiryDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div 
      ref={cardRef as any}
      // On fixe une taille et un ratio précis pour s'assurer que la capture image (png) est toujours parfaite
      className="relative w-[800px] h-[504px] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 bg-gradient-to-br from-blue-900 via-indigo-800 to-slate-900 flex flex-col mx-auto"
      style={{ transformOrigin: 'top center', zoom: 1 }} // Utilise zoom/transform si nécessaire pour l'affichage, mais html2canvas prend la taille réelle
    >
      {/* Decorative background elements inside the card */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/30 rounded-full blur-[80px]"></div>
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px]"></div>
      
      {/* Diagonal lines pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}></div>
      
      <div className="relative flex-1 w-full h-full flex flex-row p-8">
        
        {/* Left Column */}
        <div className="flex flex-col items-start shrink-0 pr-8 border-r border-white/10 relative z-10 w-[240px]">
          
          {/* Header: Logo only */}
          <div className="flex items-center gap-3 mb-6 w-full">
            <div className="w-14 h-14 shrink-0 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1.5 shadow-inner">
              <img src="/icon.png" alt="DMK Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-black text-lg tracking-tight leading-none truncate">Dahira</h3>
              <p className="text-blue-200 text-[8.5px] uppercase tracking-wider font-bold mt-1 leading-[1.2]">Mawahiboul<br/>Khoudoss</p>
            </div>
          </div>

          {/* Profile Photo */}
          <div className="w-[192px] h-[260px] rounded-[24px] ml-2 bg-slate-800 border-4 border-white/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden flex items-center justify-center relative">
            {memberInfo.photo_url ? (
              <img src={memberInfo.photo_url} alt="Profil" className="w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex flex-col items-center justify-center text-slate-500">
                <span className="text-6xl font-black text-slate-600">{memberInfo.first_name?.charAt(0)}{memberInfo.last_name?.charAt(0)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/0 via-white/20 to-transparent opacity-40 mix-blend-overlay"></div>
          </div>
          
          {/* Blood Type */}
          {memberInfo.blood_type && (
            <div className="flex w-full items-center justify-between mt-6 px-2">
              <span className="text-blue-200/60 text-[11px] uppercase tracking-widest font-bold">Sang</span>
              <span className="text-red-400 font-black text-xl bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">{memberInfo.blood_type}</span>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col text-left pl-8 relative z-10">
          
          {/* Title + Chip */}
          <div className="flex justify-between items-start w-full mb-4">
            <div className="px-4 py-1.5 bg-white/10 border border-white/20 rounded-full backdrop-blur-md">
              <p className="text-white text-[11px] uppercase tracking-widest font-bold">Carte de Membre</p>
            </div>
            <div className="w-10 h-8 rounded-md bg-gradient-to-br from-amber-200 to-amber-500 opacity-80 shadow-inner flex flex-wrap gap-0.5 p-1.5">
              <div className="w-full h-[2px] bg-amber-700/30"></div>
              <div className="w-1/2 h-[2px] bg-amber-700/30"></div>
            </div>
          </div>

          {/* Identity Info */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-3">
              <p className="text-blue-200/60 text-[10px] uppercase tracking-widest font-bold mb-0.5">Nom Complet</p>
              <p className="text-white font-black text-3xl leading-tight tracking-wide drop-shadow-sm">
                {memberInfo.first_name} <br />
                <span className="uppercase text-blue-100">{memberInfo.last_name}</span>
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-left mb-3">
              <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10 backdrop-blur-sm shadow-inner">
                <p className="text-blue-200/60 text-[9px] uppercase tracking-widest font-bold mb-0.5">Fonction</p>
                <p className="text-white font-bold text-sm leading-snug line-clamp-2">{memberInfo.role}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10 backdrop-blur-sm shadow-inner">
                <p className="text-blue-200/60 text-[9px] uppercase tracking-widest font-bold mb-0.5">Secteur</p>
                <p className="text-white font-bold text-sm leading-snug line-clamp-2">{memberInfo.sector}</p>
              </div>
            </div>
            
            {memberInfo.address && (
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 backdrop-blur-sm shadow-inner">
                <p className="text-blue-200/60 text-[9px] uppercase tracking-widest font-bold mb-1">Adresse</p>
                <p className="text-white font-bold text-sm leading-snug truncate">{memberInfo.address}</p>
              </div>
            )}
          </div>

          {/* Footer Info & QR Code */}
          <div className="flex justify-between items-end mt-auto pt-4 border-t border-white/10">
            <div className="text-left flex flex-col justify-end h-full">
              <div>
                <p className="text-blue-200/60 text-[11px] uppercase tracking-widest font-bold mb-1">DMK ID</p>
                <p className="text-white font-mono font-black text-2xl tracking-widest drop-shadow-md">
                  {memberInfo.dmk_id || 'EN-ATTENTE'}
                </p>
              </div>
              
              <div className="mt-4">
                <p className="text-blue-200/60 text-[10px] uppercase tracking-widest font-bold mb-0.5">Valide jusqu'au</p>
                <p className="text-white/90 font-mono font-bold text-base">{expiryFormatted}</p>
              </div>
            </div>
            
            <div className="flex items-end gap-3">
              <div className="flex flex-col items-end gap-1 mb-1">
                <ShieldCheck size={20} className="text-emerald-400 opacity-90 drop-shadow-sm" />
                <p className="text-emerald-400/90 text-[9px] uppercase tracking-widest font-bold">Vérifié</p>
              </div>
              <div className="bg-white p-2 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.3)]">
                <QRCode 
                  value={cardDataForQR} 
                  size={70} 
                  bgColor="#ffffff" 
                  fgColor="#0f172a" 
                  level="Q" 
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
