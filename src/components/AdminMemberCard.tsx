import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import cardBackground from '../assets/Carte Membre.png';

interface AdminMemberCardProps {
  memberInfo: {
    first_name: string;
    last_name: string;
    role?: string;
    sector?: string;
    address?: string;
    dmk_id?: string;
    blood_type?: string;
    photo_url?: string;
    card_payment_date?: string;
    birth_date?: string;
    birth_place?: string;
    cni_number?: string;
    cni_issue_date?: string;
    phone?: string;
    join_date?: string;
    created_at?: string;
  };
  cardRef?: React.RefObject<HTMLDivElement>;
}

export default function AdminMemberCard({ memberInfo, cardRef }: AdminMemberCardProps) {
  if (!memberInfo) return null;

  const cardDataForQR = `ID:${memberInfo.dmk_id || 'N/A'} | Nom:${memberInfo.first_name} ${memberInfo.last_name} | Role:${memberInfo.role}`;

  // Calcul de la date d'expiration (5 ans à partir de la date d'obtention de la carte)
  const issueDate = memberInfo.card_payment_date ? new Date(memberInfo.card_payment_date) : new Date();
  const expiryDate = new Date(issueDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 5);
  const expiryFormatted = expiryDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatField = (val: string | null | undefined) => {
    return val && val.trim() !== '' ? val : 'NON RENSEIGNÉ';
  };

  const formatDateField = (dateStr?: string) => {
    if (!dateStr || dateStr.trim() === '') return 'NON RENSEIGNÉ';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'NON RENSEIGNÉ';
      return d.toLocaleDateString('fr-FR');
    } catch {
      return 'NON RENSEIGNÉ';
    }
  };

  return (
    <div 
      ref={cardRef}
      // On fixe une taille et un ratio précis pour s'assurer que la capture image (png) est toujours parfaite (5:3 ratio)
      className="relative w-[800px] h-[480px] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/40 text-[#224857] font-['Outfit'] flex flex-col mx-auto select-none"
      style={{ transformOrigin: 'top center', zoom: 1 }} // Utilise zoom/transform si nécessaire pour l'affichage, mais html2canvas prend la taille réelle
    >
      {/* Background PNG template */}
      <img src={cardBackground} className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" alt="Card Background" />
      
      {/* Profile Photo */}
      <div className="absolute top-[13.5%] left-[15.2%] w-[20.8%] h-[44%] rounded-[8%] overflow-hidden bg-white/50 border border-white/85 shadow-md flex items-center justify-center z-10">
        {memberInfo.photo_url ? (
          <img src={memberInfo.photo_url} alt="Profil" className="w-full h-full object-cover" crossOrigin="anonymous" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#cbebf6] to-[#e4f5fb] flex flex-col items-center justify-center text-[#2b5d72]/40">
            <span className="text-5xl font-black">{memberInfo.first_name?.charAt(0)}{memberInfo.last_name?.charAt(0)}</span>
          </div>
        )}
      </div>

      {/* QR Code */}
      <div className="absolute top-[67%] left-[5%] w-[12.5%] aspect-square bg-white border border-white/80 p-[1%] rounded-[8%] shadow-sm z-10 flex items-center justify-center">
        <QRCode 
          value={cardDataForQR} 
          size={256}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          bgColor="#ffffff" 
          fgColor="#224857" 
          level="Q" 
        />
      </div>

      {/* NOM label & value */}
      <div className="absolute top-[24%] left-[60%] z-10">
        <span className="text-[#224857]/60 text-[7.5px] font-extrabold uppercase tracking-wider leading-none block">Nom</span>
      </div>
      <div className="absolute top-[26%] left-[60%] z-10 w-[16%]">
        <span className="text-[#193a47] font-black text-[14px] uppercase truncate block leading-none">
          {formatField(memberInfo.last_name)}
        </span>
      </div>

      {/* PRENOM label & value */}
      <div className="absolute top-[24%] left-[78%] z-10">
        <span className="text-[#224857]/60 text-[7.5px] font-extrabold uppercase tracking-wider leading-none block">Prenom</span>
      </div>
      <div className="absolute top-[26%] left-[78%] z-10 w-[16%]">
        <span className="text-[#193a47] font-black text-[14px] truncate block leading-none">
          {formatField(memberInfo.first_name)}
        </span>
      </div>

      {/* DATE DE NAISSANCE label & value */}
      <div className="absolute top-[34%] left-[60%] z-10">
        <span className="text-[#193a47] font-black text-[11px] leading-none block">
          {formatDateField(memberInfo.birth_date)}
        </span>
      </div>
      <div className="absolute top-[32%] left-[60%] z-10">
        <span className="text-[#224857]/60 font-extrabold text-[7.5px] uppercase tracking-wider leading-none block">
          Date de naissance
        </span>
      </div>

      {/* LIEU DE NAISSANCE label & value */}
      <div className="absolute top-[34%] left-[78%] z-10 w-[16%]">
        <span className="text-[#193a47] font-black text-[11px] uppercase leading-none block truncate">
          {formatField(memberInfo.birth_place)}
        </span>
      </div>
      <div className="absolute top-[32%] left-[78%] z-10">
        <span className="text-[#224857]/60 font-extrabold text-[7.5px] uppercase tracking-wider leading-none block">
          Lieu de naissance
        </span>
      </div>

      {/* Vertical List labels & values */}
      <div className="absolute top-[47.2%] left-[54%] z-10">
        <span className="text-[#224857]/70 text-[11px] font-extrabold uppercase leading-none block">Adresse:</span>
      </div>
      <div className="absolute top-[47.2%] left-[62%] z-10 w-[30%]">
        <span className="text-[#193a47] text-[11px] font-extrabold uppercase truncate block leading-none">{formatField(memberInfo.address)}</span>
      </div>

      <div className="absolute top-[51.7%] left-[54%] z-10">
        <span className="text-[#224857]/70 text-[11px] font-extrabold uppercase leading-none block">Numero CNI:</span>
      </div>
      <div className="absolute top-[51.7%] left-[65%] z-10 w-[30%]">
        <span className="text-[#193a47] text-[11px] font-extrabold uppercase truncate block leading-none">{formatField(memberInfo.cni_number)}</span>
      </div>

      <div className="absolute top-[56.2%] left-[54%] z-10">
        <span className="text-[#224857]/70 text-[11px] font-extrabold uppercase leading-none block">Date de delivrance CNI:</span>
      </div>
      <div className="absolute top-[56.2%] left-[74%] z-10 w-[15%]">
        <span className="text-[#193a47] text-[11px] font-extrabold uppercase truncate block leading-none">{formatDateField(memberInfo.cni_issue_date)}</span>
      </div>

      <div className="absolute top-[60.7%] left-[54%] z-10">
        <span className="text-[#224857]/70 text-[11px] font-extrabold uppercase leading-none block">Telephone:</span>
      </div>
      <div className="absolute top-[60.7%] left-[64%] z-10 w-[30%]">
        <span className="text-[#193a47] text-[11px] font-extrabold uppercase truncate block leading-none">{formatField(memberInfo.phone)}</span>
      </div>

      <div className="absolute top-[65.2%] left-[54%] z-10">
        <span className="text-[#224857]/70 text-[11px] font-extrabold uppercase leading-none block">Groupe sanguin:</span>
      </div>
      <div className="absolute top-[65.2%] left-[69%] z-10 w-[24%]">
        <span className="text-red-500 text-[11px] font-extrabold uppercase truncate block leading-none">{formatField(memberInfo.blood_type)}</span>
      </div>

      <div className="absolute top-[69.7%] left-[54%] z-10">
        <span className="text-[#224857]/70 text-[11px] font-extrabold uppercase leading-none block">Date d'adhesion:</span>
      </div>
      <div className="absolute top-[69.7%] left-[69%] z-10 w-[24%]">
        <span className="text-[#193a47] text-[11px] font-extrabold uppercase truncate block leading-none">{formatDateField(memberInfo.join_date || memberInfo.created_at)}</span>
      </div>

      <div className="absolute top-[74.2%] left-[54%] z-10">
        <span className="text-[#224857]/70 text-[11px] font-extrabold uppercase leading-none block">Fonction:</span>
      </div>
      <div className="absolute top-[74.2%] left-[63%] z-10 w-[30%]">
        <span className="text-[#193a47] text-[11px] font-extrabold uppercase truncate block leading-none">{formatField(memberInfo.role)}</span>
      </div>

      <div className="absolute top-[78.7%] left-[54%] z-10">
        <span className="text-[#224857]/70 text-[11px] font-extrabold uppercase leading-none block">Secteur:</span>
      </div>
      <div className="absolute top-[78.7%] left-[63%] z-10 w-[30%]">
        <span className="text-[#193a47] text-[11px] font-extrabold uppercase truncate block leading-none">{formatField(memberInfo.sector)}</span>
      </div>

      <div className="absolute top-[83.2%] left-[54%] z-10">
        <span className="text-[#224857]/70 text-[11px] font-extrabold uppercase leading-none block">Expire le:</span>
      </div>
      <div className="absolute top-[83.2%] left-[63%] z-10 w-[30%]">
        <span className="text-[#193a47] text-[11px] font-extrabold uppercase truncate block leading-none">{expiryFormatted}</span>
      </div>

      {/* Matricule label & value */}
      <div className="absolute top-[67.5%] left-[20%] z-10">
        <span className="text-[#224857]/60 text-[11px] font-extrabold uppercase leading-none block">Numéro Matricule:</span>
      </div>
      <div className="absolute top-[72%] left-[20%] text-left z-10">
        <p className="text-[#193a47] font-mono font-black text-[13px] tracking-wide leading-none">
          {memberInfo.dmk_id || 'NON RENSEIGNÉ'}
        </p>
      </div>

      {/* Verified Indicator Badge */}
      <div className="absolute right-[4%] bottom-[4%] flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full backdrop-blur-md z-10">
        <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
        <span className="text-emerald-600 font-extrabold text-[8.5px] uppercase tracking-widest">VÉRIFIÉ</span>
      </div>
    </div>
  );
}
