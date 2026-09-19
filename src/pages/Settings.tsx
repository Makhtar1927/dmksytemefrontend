import { useState, useEffect } from 'react';
import { Shield, Lock, Bell, Download, FileText, AlertTriangle, Loader2, Database, X, Users, Mail, Plus, CheckCircle, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  dmk_id: string;
  email?: string;
  phone?: string;
  role?: string;
  sector?: string;
  status?: string;
  birth_date?: string;
  birth_place?: string;
  address?: string;
  cni_number?: string;
  cni_issue_date?: string;
  cni_expiry_date?: string;
  blood_type?: string;
  gender?: string;
  join_date?: string;
  profession?: string;
  sass_magal?: number;
  sass_ziaar?: number;
  sass_kst?: number;
  sass_cahier?: number;
  sass_projets?: number;
  sass_autres?: number;
  marital_status?: string;
  created_at?: string;
}

interface Contribution {
  id: string;
  member_id: string;
  amount: number;
  payment_date: string;
  status: string;
  sass_type?: string;
  payment_method?: string;
  members?: Member | null;
}

interface Expense {
  id: string;
  amount: number;
  expense_date: string;
  beneficiary: string;
  reason: string;
}

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('donnees');
  
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const currentYear = new Date().getFullYear();
  const [reportYear, setReportYear] = useState<string>(currentYear.toString());

  // Modal State Data Reset
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');

  // Notifications State
  const [notifInscriptions, setNotifInscriptions] = useState(() => localStorage.getItem('notifInscriptions') !== 'false');
  const [notifRapports, setNotifRapports] = useState(() => localStorage.getItem('notifRapports') === 'true');
  const [notifAlertes, setNotifAlertes] = useState(() => localStorage.getItem('notifAlertes') !== 'false');

  useEffect(() => {
    localStorage.setItem('notifInscriptions', notifInscriptions.toString());
    localStorage.setItem('notifRapports', notifRapports.toString());
    localStorage.setItem('notifAlertes', notifAlertes.toString());
  }, [notifInscriptions, notifRapports, notifAlertes]);

  // Roles State
  const [rolesList, setRolesList] = useState([
    { id: 1, email: 'admin@dmk.com', role: 'Admin Général', permissions: 'Accès Total (Membres, Sécurité, Paramètres)', isProtected: true, badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    { id: 2, email: 'tresorier@dmk.com', role: 'Trésorier', permissions: 'App Mobile (Gestion Sass, Dépenses)', isProtected: false, badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    { id: 3, email: 'secretaire@dmk.com', role: 'Secrétaire', permissions: 'App Mobile (Gestion Membres, Événements)', isProtected: false, badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  ]);

  const handleAddRole = () => {
    const email = window.prompt("Email du nouvel utilisateur :");
    if (!email) return;
    const role = window.prompt("Rôle (ex: Trésorier, Secrétaire, Adjoint) :");
    if (!role) return;
    
    const newRole = {
      id: Date.now(),
      email,
      role,
      permissions: 'Accès Standard App Mobile',
      isProtected: false,
      badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    };
    setRolesList([...rolesList, newRole]);
  };

  const handleRevokeRole = (id: number) => {
    if (window.confirm("Voulez-vous vraiment révoquer l'accès de cet utilisateur ?")) {
      setRolesList(rolesList.filter(r => r.id !== id));
    }
  };

  // 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(() => localStorage.getItem('is2FAEnabled') === 'true');
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [pin2FA, setPin2FA] = useState('');

  useEffect(() => {
    localStorage.setItem('is2FAEnabled', is2FAEnabled.toString());
  }, [is2FAEnabled]);

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin2FA.length >= 6) {
      setIs2FAEnabled(true);
      setShow2FAModal(false);
      setPin2FA('');
      alert("L'authentification à double facteur (2FA) a été activée avec succès !");
    } else {
      alert("Veuillez entrer un code PIN à 6 chiffres valide.");
    }
  };

  // Export Members to CSV
  const exportMembersToCSV = async () => {
    setIsExporting(true);
    try {
      let allMembers: Member[] = [];
      let from = 0;
      let hasMore = true;

      // Boucle d'aspiration pour contourner la limite de 1000 lignes
      while (hasMore) {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .order('id', { ascending: true })
          .range(from, from + 999);
          
        if (error) throw error;

        if (data && data.length > 0) {
          allMembers = [...allMembers, ...data as Member[]];
          from += 1000;
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
      }
      
      if (allMembers.length === 0) {
        alert("Aucun membre trouvé.");
        return;
      }

      const data = allMembers;

      const headers = [
        'dmk_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'role',
        'sector',
        'status',
        'birth_date',
        'birth_place',
        'address',
        'cni_number',
        'cni_issue_date',
        'cni_expiry_date',
        'blood_type',
        'gender',
        'join_date',
        'profession',
        'sass_magal',
        'sass_ziaar',
        'sass_kst',
        'sass_cahier',
        'sass_projets',
        'sass_autres',
        'marital_status',
        'created_at'
      ];

      const escapeCSV = (val: unknown) => {
        if (val === undefined || val === null) return '""';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const csvContent = [
        headers.join(','),
        ...data.map(m => [
          escapeCSV(m.dmk_id),
          escapeCSV(m.first_name),
          escapeCSV(m.last_name),
          escapeCSV(m.email),
          escapeCSV(m.phone),
          escapeCSV(m.role),
          escapeCSV(m.sector),
          escapeCSV(m.status),
          escapeCSV(m.birth_date),
          escapeCSV(m.birth_place),
          escapeCSV(m.address),
          escapeCSV(m.cni_number),
          escapeCSV(m.cni_issue_date),
          escapeCSV(m.cni_expiry_date),
          escapeCSV(m.blood_type),
          escapeCSV(m.gender),
          escapeCSV(m.join_date),
          escapeCSV(m.profession),
          escapeCSV(m.sass_magal !== undefined && m.sass_magal !== null ? m.sass_magal : 0),
          escapeCSV(m.sass_ziaar !== undefined && m.sass_ziaar !== null ? m.sass_ziaar : 0),
          escapeCSV(m.sass_kst !== undefined && m.sass_kst !== null ? m.sass_kst : 0),
          escapeCSV(m.sass_cahier !== undefined && m.sass_cahier !== null ? m.sass_cahier : 0),
          escapeCSV(m.sass_projets !== undefined && m.sass_projets !== null ? m.sass_projets : 0),
          escapeCSV(m.sass_autres !== undefined && m.sass_autres !== null ? m.sass_autres : 0),
          escapeCSV(m.marital_status),
          escapeCSV(m.created_at ? format(new Date(m.created_at), 'yyyy-MM-dd') : '')
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `DMK_Membres_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      alert("Erreur lors de l'export: " + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  // Export Financial Report to PDF (A4 Print Engine)
  const exportFinancialReportPDF = async () => {
    setIsExporting(true);
    try {
      let allContribs: Contribution[] = [];
      let from = 0;
      let hasMore = true;

      // Récupération des contributions Sass avec le secteur du membre
      while (hasMore) {
        const { data, error } = await supabase
          .from('sass_contributions')
          .select('*, members(first_name, last_name, dmk_id, sector)')
          .order('payment_date', { ascending: false })
          .range(from, from + 999);

        if (error) throw error;

        if (data && data.length > 0) {
          allContribs = [...allContribs, ...data as Contribution[]];
          from += 1000;
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      let allExpenses: Expense[] = [];
      from = 0;
      hasMore = true;

      // Récupération exhaustive des dépenses / décaissements
      while (hasMore) {
        const { data, error } = await supabase
          .from('treasury_expenses')
          .select('*')
          .order('expense_date', { ascending: false })
          .range(from, from + 999);

        if (error) throw error;

        if (data && data.length > 0) {
          allExpenses = [...allExpenses, ...data as Expense[]];
          from += 1000;
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      // Filtrage selon l'année d'exercice sélectionnée
      const targetYearNum = parseInt(reportYear, 10);
      const isYearFiltered = reportYear !== 'all' && !isNaN(targetYearNum);

      const filteredContribs = allContribs.filter(c => {
        if (!c.payment_date) return false;
        if (isYearFiltered) {
          const d = new Date(c.payment_date);
          if (d.getFullYear() !== targetYearNum) return false;
        }
        return true;
      });

      // Seules les cotisations validées constituent les entrées effectives
      const validContribs = filteredContribs.filter(c => 
        c.status === 'Validé' || c.status === 'Valide' || !c.status
      );

      const filteredExpenses = allExpenses.filter(e => {
        if (!e.expense_date) return false;
        if (isYearFiltered) {
          const d = new Date(e.expense_date);
          if (d.getFullYear() !== targetYearNum) return false;
        }
        return true;
      });

      // Métriques Globales
      const totalIncomes = validContribs.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const netBalance = totalIncomes - totalExpenses;
      const absorptionRate = totalIncomes > 0 ? ((totalExpenses / totalIncomes) * 100).toFixed(1) : '0.0';
      const avgExpense = filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length) : 0;

      // Règle de Clôture Hebdomadaire : Tous les vendredis jusqu'à 23h59m59s (juste avant Samedi 00h00m00s)
      const getFridayCutoff = (dateStr: string): Date => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return new Date();
        const day = d.getDay(); // 0: Dim, 1: Lun, 2: Mar, 3: Mer, 4: Jeu, 5: Ven, 6: Sam

        // Tout versement du vendredi (quel que soit l'heure) est rattaché à ce vendredi.
        // Un vendredi ne peut jamais «dépasser» 23h59m59s, donc aucune condition horaire
        // particulière n'est nécessaire pour le vendredi lui-même.
        // Un versement du samedi (day === 6) est reporté au vendredi suivant (+6 jours).
        let daysToAdd = (5 - day + 7) % 7;
        // day === 5 → daysToAdd = 0 (vendredi courant, inclus jusqu'à 23h59m59s)
        // day === 6 → daysToAdd = 6 (samedi, reporté au vendredi suivant)

        const cutoff = new Date(d);
        cutoff.setDate(d.getDate() + daysToAdd);
        // Clôture à 23h59m59s : dernière seconde du vendredi, avant minuit (samedi)
        cutoff.setHours(23, 59, 59, 0);
        return cutoff;
      };

      // Palette chromatique harmonieuse pour les secteurs
      const PALETTE = [
        '#1d4ed8', '#15803d', '#b45309', '#6d28d9', '#b91c1c',
        '#0f766e', '#c2410c', '#4338ca', '#047857', '#a16207',
        '#7e22ce', '#be123c', '#0369a1', '#4d7c0f', '#a21caf',
        '#475569'
      ];

      // 1. Agrégation Annuelle par Secteur
      const sectorMap: { [key: string]: { total: number; count: number } } = {};
      validContribs.forEach(c => {
        const sName = c.members?.sector?.trim() || 'Non attribué';
        if (!sectorMap[sName]) {
          sectorMap[sName] = { total: 0, count: 0 };
        }
        sectorMap[sName].total += Number(c.amount || 0);
        sectorMap[sName].count += 1;
      });

      const sectorStatsList = Object.keys(sectorMap)
        .map((name, idx) => {
          const total = sectorMap[name].total;
          const count = sectorMap[name].count;
          const percentage = totalIncomes > 0 ? (total / totalIncomes) * 100 : 0;
          const average = count > 0 ? Math.round(total / count) : 0;
          const color = PALETTE[idx % PALETTE.length];
          return { name, total, count, percentage, average, color };
        })
        .sort((a, b) => b.total - a.total);

      const topSector = sectorStatsList.length > 0 ? sectorStatsList[0] : null;

      // 2. Agrégation Hebdomadaire par Vendredi (Clôture 23h59m59s — juste avant Samedi 00h00m00s)
      type WeekData = {
        fridayDate: Date;
        dateKey: string;
        formattedDate: string;
        total: number;
        count: number;
        sectorBreakdown: { [sector: string]: number };
      };

      const weekMap: { [dateKey: string]: WeekData } = {};

      validContribs.forEach(c => {
        const friday = getFridayCutoff(c.payment_date);
        const dateKey = format(friday, 'yyyy-MM-dd');
        const sector = c.members?.sector?.trim() || 'Non attribué';
        const amount = Number(c.amount || 0);

        if (!weekMap[dateKey]) {
          weekMap[dateKey] = {
            fridayDate: friday,
            dateKey,
            formattedDate: format(friday, 'dd/MM/yyyy'),
            total: 0,
            count: 0,
            sectorBreakdown: {}
          };
        }
        weekMap[dateKey].total += amount;
        weekMap[dateKey].count += 1;
        weekMap[dateKey].sectorBreakdown[sector] = (weekMap[dateKey].sectorBreakdown[sector] || 0) + amount;
      });

      const sortedWeeks = Object.values(weekMap).sort((a, b) => a.fridayDate.getTime() - b.fridayDate.getTime());

      let progressiveCumulative = 0;
      const weeksWithCumulative = sortedWeeks.map(w => {
        progressiveCumulative += w.total;
        return { ...w, cumulative: progressiveCumulative };
      });

      let maxWeek = sortedWeeks.length > 0 ? sortedWeeks[0] : null;
      sortedWeeks.forEach(w => {
        if (!maxWeek || w.total > maxWeek.total) maxWeek = w;
      });

      const avgWeeklyIncome = sortedWeeks.length > 0 ? Math.round(totalIncomes / sortedWeeks.length) : 0;

      // 3. Génération des Diagrammes Vectoriels SVG (100% vectoriel, net à l'impression)
      // A. Diagramme Circulaire Donut SVG (Répartition par secteur)
      const circleRadius = 50;
      const circumference = 2 * Math.PI * circleRadius; // ~314.16
      let accumulatedPercent = 0;

      const topSectorsForChart = sectorStatsList.slice(0, 8);
      const otherSectorsTotal = sectorStatsList.slice(8).reduce((acc, s) => acc + s.total, 0);
      const chartSectors = [...topSectorsForChart];
      if (otherSectorsTotal > 0) {
        chartSectors.push({
          name: 'Autres Secteurs',
          total: otherSectorsTotal,
          count: sectorStatsList.slice(8).reduce((acc, s) => acc + s.count, 0),
          percentage: totalIncomes > 0 ? (otherSectorsTotal / totalIncomes) * 100 : 0,
          average: 0,
          color: '#94a3b8'
        });
      }

      const donutSlicesSvg = chartSectors.map(s => {
        const sliceLength = (s.percentage / 100) * circumference;
        const strokeOffset = - (accumulatedPercent / 100) * circumference;
        accumulatedPercent += s.percentage;
        return `
          <circle 
            cx="80" cy="80" r="${circleRadius}" 
            fill="none" 
            stroke="${s.color}" 
            stroke-width="22" 
            stroke-dasharray="${sliceLength.toFixed(2)} ${(circumference - sliceLength).toFixed(2)}" 
            stroke-dashoffset="${strokeOffset.toFixed(2)}"
            transform="rotate(-90 80 80)"
          />
        `;
      }).join('');

      const donutLegendHtml = chartSectors.map(s => `
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">
            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 2px; background-color: ${s.color}; flex-shrink: 0;"></span>
            <span style="font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis;">${s.name}</span>
          </div>
          <span style="font-weight: 700; color: #0f172a; margin-left: 8px;">${s.percentage.toFixed(1)}%</span>
        </div>
      `).join('');

      // B. Histogramme SVG Comparatif des Secteurs
      const maxSectorTotal = sectorStatsList[0]?.total || 1;
      const barChartRows = sectorStatsList.slice(0, 10).map((s, idx) => {
        const barWidth = Math.max(4, Math.round((s.total / maxSectorTotal) * 180));
        const yPos = idx * 20 + 10;
        return `
          <g>
            <text x="95" y="${yPos + 10}" text-anchor="end" font-size="9" font-weight="700" fill="#334155">${s.name.length > 15 ? s.name.slice(0, 14) + '…' : s.name}</text>
            <rect x="105" y="${yPos}" width="${barWidth}" height="12" rx="3" fill="${s.color}" />
            <text x="${112 + barWidth}" y="${yPos + 10}" font-size="8.5" font-weight="700" fill="#0f172a">${Number(s.total).toLocaleString('fr-FR')} F</text>
          </g>
        `;
      }).join('');
      const barChartSvgHeight = Math.max(120, sectorStatsList.slice(0, 10).length * 20 + 20);

      // C. Graphique de Tendance des Vendredis SVG (Évolution hebdomadaire)
      const maxWeekTotal = maxWeek ? maxWeek.total : 1;
      const trendSvgWidth = 670;
      const trendSvgHeight = 90;
      const weekCount = sortedWeeks.length;
      const barSlotWidth = weekCount > 0 ? (trendSvgWidth - 60) / weekCount : 10;
      const actualBarWidth = Math.max(3, Math.min(18, barSlotWidth - 2));

      const weeklyBarsSvg = sortedWeeks.map((w, idx) => {
        const barH = Math.max(3, Math.round((w.total / maxWeekTotal) * (trendSvgHeight - 30)));
        const x = 50 + idx * barSlotWidth + (barSlotWidth - actualBarWidth) / 2;
        const y = trendSvgHeight - 20 - barH;
        return `
          <g>
            <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${actualBarWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="2" fill="#1e40af" opacity="0.85" />
          </g>
        `;
      }).join('');

      // Libellé de l'exercice
      const exerciceLabel = reportYear === 'all' 
        ? "Bilan Consolidé (Toutes Années Confondues)" 
        : `Exercice Fiscal ${reportYear}`;

      // 4. Construction du Document HTML Format A4 Professionnel
      let html = `
        <!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="UTF-8" />
            <title>Rapport Financier Annuel - Daara Mawahiboul Khoudoss</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 10mm 12mm 12mm 12mm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #0f172a;
                background-color: #ffffff;
                font-size: 10px;
                line-height: 1.4;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
              }
              .avoid-break {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              /* Header */
              .header-table {
                width: 100%;
                border-bottom: 2.5px solid #1e3a8a;
                padding-bottom: 8px;
                margin-bottom: 14px;
              }
              .org-name {
                font-size: 18px;
                font-weight: 900;
                color: #1e3a8a;
                letter-spacing: -0.3px;
                margin: 0;
                text-transform: uppercase;
              }
              .org-sub {
                font-size: 10px;
                font-weight: 700;
                color: #475569;
                margin: 2px 0 0 0;
                text-transform: uppercase;
                letter-spacing: 0.8px;
              }
              .meta-box {
                text-align: right;
                font-size: 9.5px;
                color: #475569;
                line-height: 1.4;
              }
              .report-banner {
                background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
                color: white;
                padding: 10px 14px;
                border-radius: 8px;
                margin-bottom: 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .report-title {
                font-size: 15px;
                font-weight: 800;
                text-transform: uppercase;
                margin: 0;
                letter-spacing: 0.5px;
              }
              .report-badge {
                background-color: rgba(255, 255, 255, 0.2);
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 700;
              }
              /* KPIs */
              .kpi-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-bottom: 14px;
              }
              .kpi-card {
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 10px;
                background-color: #f8fafc;
              }
              .kpi-label {
                font-size: 8.5px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
              }
              .kpi-value {
                font-size: 15px;
                font-weight: 900;
                margin: 0;
              }
              .kpi-income { color: #15803d; }
              .kpi-expense { color: #b91c1c; }
              .kpi-net { color: #1d4ed8; }
              .kpi-rate { color: #b45309; }

              /* Stats Summary Strip */
              .stats-strip {
                display: flex;
                justify-content: space-between;
                background-color: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 6px 12px;
                margin-bottom: 14px;
                font-size: 9px;
              }
              .stats-strip span strong {
                color: #0f172a;
              }

              /* Section Title */
              .section-heading {
                font-size: 12px;
                font-weight: 800;
                color: #1e3a8a;
                text-transform: uppercase;
                border-bottom: 1.5px solid #cbd5e1;
                padding-bottom: 4px;
                margin-top: 14px;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .section-subtitle {
                font-size: 8.5px;
                color: #64748b;
                font-weight: 600;
                text-transform: none;
              }

              /* Visuals Row (Charts) */
              .visuals-row {
                display: flex;
                gap: 12px;
                margin-bottom: 14px;
              }
              .visual-box {
                flex: 1;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 10px;
                background-color: #ffffff;
              }
              .visual-title {
                font-size: 10px;
                font-weight: 800;
                color: #334155;
                text-transform: uppercase;
                margin-bottom: 8px;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 4px;
              }

              /* Tables */
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 14px;
                font-size: 9.5px;
              }
              thead {
                display: table-header-group;
              }
              tr {
                page-break-inside: avoid;
              }
              th {
                background-color: #f1f5f9;
                color: #1e293b;
                font-weight: 800;
                text-align: left;
                padding: 5px 8px;
                border-bottom: 1.5px solid #cbd5e1;
                border-top: 1px solid #cbd5e1;
                font-size: 9px;
                text-transform: uppercase;
              }
              td {
                padding: 4.5px 8px;
                border-bottom: 1px solid #e2e8f0;
                color: #334155;
              }
              tr:nth-child(even) td {
                background-color: #f8fafc;
              }
              .total-row td {
                background-color: #e2e8f0 !important;
                font-weight: 900;
                color: #0f172a;
                border-top: 1.5px solid #94a3b8;
                border-bottom: 2px solid #64748b;
              }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-bold { font-weight: 700; }
              .font-black { font-weight: 900; }

              /* Badges */
              .sector-pill {
                display: inline-block;
                padding: 1px 6px;
                border-radius: 4px;
                font-size: 8.5px;
                font-weight: 700;
                background-color: #e0e7ff;
                color: #1e40af;
                margin-right: 4px;
                margin-bottom: 2px;
              }
              .progress-bar-bg {
                background-color: #e2e8f0;
                border-radius: 3px;
                height: 6px;
                width: 100%;
                overflow: hidden;
              }
              .progress-bar-fill {
                height: 100%;
                border-radius: 3px;
              }

              /* Signatures Frame */
              .signature-container {
                margin-top: 20px;
                padding: 10px;
                border: 1.5px dashed #cbd5e1;
                border-radius: 8px;
                background-color: #fafafa;
                page-break-inside: avoid;
              }
              .signature-header {
                text-align: center;
                font-size: 10px;
                font-weight: 800;
                color: #1e3a8a;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 12px;
              }
              .signature-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
              }
              .signature-box {
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                padding: 10px;
                background-color: #ffffff;
                text-align: center;
                height: 110px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .signature-role {
                font-size: 10.5px;
                font-weight: 800;
                color: #0f172a;
                text-transform: uppercase;
              }
              .signature-sub {
                font-size: 8px;
                color: #64748b;
                font-style: italic;
              }
              .signature-line {
                border-top: 1px dashed #94a3b8;
                padding-top: 4px;
                font-size: 8px;
                color: #94a3b8;
              }

              /* Footer */
              .doc-footer {
                margin-top: 15px;
                border-top: 1px solid #e2e8f0;
                padding-top: 6px;
                text-align: center;
                font-size: 8.5px;
                color: #94a3b8;
              }
            </style>
          </head>
          <body>

            <!-- En-Tête Officiel -->
            <table class="header-table">
              <tr>
                <td style="border: none; padding: 0;">
                  <h1 class="org-name">Daara Mawahiboul Khoudoss</h1>
                  <p class="org-sub">Bureau Administratif et Financier • Trésorerie Générale</p>
                </td>
                <td style="border: none; padding: 0;" class="meta-box">
                  <div><strong>Date d'émission :</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
                  <div><strong>Document :</strong> Bilan Annuel Consolidé & Clôtures Sass</div>
                  <div><strong>Statut :</strong> Certifié Conforme</div>
                </td>
              </tr>
            </table>

            <!-- Bannière du Titre -->
            <div class="report-banner">
              <div>
                <h2 class="report-title">Rapport Financier Annuel</h2>
                <div style="font-size: 9.5px; opacity: 0.9; margin-top: 2px;">Bilan des flux financiers (Sass par secteur et décaissements détaillés)</div>
              </div>
              <div class="report-badge">${exerciceLabel}</div>
            </div>

            <!-- Cartes KPIs Globales -->
            <div class="kpi-grid avoid-break">
              <div class="kpi-card">
                <div class="kpi-label">1. Entrées Sass (Validées)</div>
                <div class="kpi-value kpi-income">+ ${totalIncomes.toLocaleString('fr-FR')} F</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">2. Sorties (Décaissements)</div>
                <div class="kpi-value kpi-expense">- ${totalExpenses.toLocaleString('fr-FR')} F</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">3. Solde Net Caisse</div>
                <div class="kpi-value kpi-net">${netBalance.toLocaleString('fr-FR')} F</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">4. Taux de Couverture</div>
                <div class="kpi-value kpi-rate">${absorptionRate}%</div>
              </div>
            </div>

            <!-- Barre de Synthèse Statistique Globale -->
            <div class="stats-strip avoid-break">
              <span>Cotisations : <strong>${validContribs.length}</strong></span>
              <span>Moyenne Vendredi : <strong>${avgWeeklyIncome.toLocaleString('fr-FR')} F</strong></span>
              <span>Semaine Record : <strong>${maxWeek ? maxWeek.formattedDate + ' (' + maxWeek.total.toLocaleString('fr-FR') + ' F)' : 'N/A'}</strong></span>
              <span>Secteur Leader : <strong>${topSector ? topSector.name + ' (' + topSector.percentage.toFixed(1) + '%)' : 'N/A'}</strong></span>
              <span>Décaissements : <strong>${filteredExpenses.length} (Moy: ${avgExpense.toLocaleString('fr-FR')} F)</strong></span>
            </div>

            <!-- SECTION VISUELLE : Diagrammes Vectoriels SVG Explicites -->
            <div class="visuals-row avoid-break">
              <!-- Diagramme Circulaire Donut -->
              <div class="visual-box" style="flex: 1.1;">
                <div class="visual-title">Répartition Circulaire par Secteur (Sass)</div>
                <div style="display: flex; align-items: center; gap: 14px;">
                  <div style="flex-shrink: 0;">
                    <svg width="150" height="150" viewBox="0 0 160 160">
                      ${donutSlicesSvg}
                      <circle cx="80" cy="80" r="38" fill="#ffffff" />
                      <text x="80" y="74" text-anchor="middle" font-size="8" font-weight="700" fill="#64748b">TOTAL ENTRÉES</text>
                      <text x="80" y="89" text-anchor="middle" font-size="9.5" font-weight="900" fill="#1e3a8a">${(totalIncomes >= 1000000 ? (totalIncomes / 1000000).toFixed(1) + 'M' : totalIncomes.toLocaleString('fr-FR'))} F</text>
                    </svg>
                  </div>
                  <div style="flex: 1;">
                    ${donutLegendHtml}
                  </div>
                </div>
              </div>

              <!-- Histogramme Comparatif SVG -->
              <div class="visual-box" style="flex: 1.2;">
                <div class="visual-title">Classement Comparatif des Secteurs</div>
                <svg width="100%" height="${barChartSvgHeight}" viewBox="0 0 350 ${barChartSvgHeight}">
                  ${barChartRows}
                </svg>
              </div>
            </div>

            <!-- Graphique de Tendance Hebdomadaire (Vendredis) si plus de 2 semaines -->
            ${sortedWeeks.length > 2 ? `
              <div class="visual-box avoid-break" style="margin-bottom: 14px;">
                <div class="visual-title" style="display: flex; justify-content: space-between;">
                  <span>Évolution des Collectes Hebdomadaires (Clôture chaque Vendredi à 23h59m59s)</span>
                  <span style="font-size: 8.5px; color: #64748b; font-weight: normal;">${sortedWeeks.length} vendredis comptabilisés</span>
                </div>
                <svg width="100%" height="${trendSvgHeight}" viewBox="0 0 ${trendSvgWidth} ${trendSvgHeight}">
                  <!-- Axe Zéro -->
                  <line x1="45" y1="${trendSvgHeight - 20}" x2="${trendSvgWidth - 10}" y2="${trendSvgHeight - 20}" stroke="#cbd5e1" stroke-width="1" />
                  <!-- Barres des vendredis -->
                  ${weeklyBarsSvg}
                </svg>
              </div>
            ` : ''}

            <!-- SECTION 1 : Bilan Sectoriel Annuel Consolidé -->
            <div class="section-heading avoid-break">
              <span>1. Bilan Sectoriel Annuel Consolidé</span>
              <span class="section-subtitle">${sectorStatsList.length} secteurs actifs • Sass validés</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 35px;" class="text-center">Rang</th>
                  <th>Secteur</th>
                  <th style="width: 140px;">Poids Relatif (%)</th>
                  <th class="text-center" style="width: 80px;">Cotisations</th>
                  <th class="text-right" style="width: 95px;">Moyenne / Cotis.</th>
                  <th class="text-right" style="width: 120px;">Total Collecté</th>
                </tr>
              </thead>
              <tbody>
                ${sectorStatsList.length > 0 ? sectorStatsList.map((s, idx) => `
                  <tr>
                    <td class="text-center font-bold" style="color: #64748b;">${idx + 1}</td>
                    <td class="font-bold" style="color: #0f172a;">
                      <span style="display: inline-block; width: 8px; height: 8px; border-radius: 2px; background-color: ${s.color}; margin-right: 5px;"></span>
                      ${s.name}
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <div class="progress-bar-bg" style="flex: 1;">
                          <div class="progress-bar-fill" style="width: ${s.percentage.toFixed(1)}%; background-color: ${s.color};"></div>
                        </div>
                        <span style="font-size: 8.5px; font-weight: 700; width: 32px; text-align: right;">${s.percentage.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td class="text-center font-bold">${s.count}</td>
                    <td class="text-right">${s.average.toLocaleString('fr-FR')} F</td>
                    <td class="text-right font-black" style="color: #1e3a8a;">${s.total.toLocaleString('fr-FR')} F</td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="6" class="text-center" style="padding: 12px; color: #64748b;">Aucune donnée sectorielle enregistrée pour cet exercice</td></tr>
                `}
                <tr class="total-row">
                  <td colspan="3" class="font-black text-right" style="text-transform: uppercase;">Total Général Entrées Sass :</td>
                  <td class="text-center font-black">${validContribs.length}</td>
                  <td class="text-right font-bold">${validContribs.length > 0 ? Math.round(totalIncomes / validContribs.length).toLocaleString('fr-FR') : 0} F</td>
                  <td class="text-right font-black" style="color: #15803d; font-size: 11px;">${totalIncomes.toLocaleString('fr-FR')} F CFA</td>
                </tr>
              </tbody>
            </table>

            <!-- SAUT DE PAGE PROPRE POUR LA SUITE DU RAPPORT -->
            <div class="page-break"></div>

            <!-- En-Tête Suite (Page 2) -->
            <table class="header-table">
              <tr>
                <td style="border: none; padding: 0;">
                  <h1 class="org-name" style="font-size: 14px;">Daara Mawahiboul Khoudoss • Bilan Financier</h1>
                </td>
                <td style="border: none; padding: 0;" class="meta-box">
                  <div>${exerciceLabel} • Clôtures Hebdomadaires & Décaissements</div>
                </td>
              </tr>
            </table>

            <!-- SECTION 2 : Bilan Hebdomadaire des Collectes par Secteur (Clôture chaque Vendredi à 23h59m59s) -->
            <div class="section-heading avoid-break">
              <span>2. Synthèse Hebdomadaire des Collectes par Secteur (Vendredis — 23h59m59s)</span>
              <span class="section-subtitle">Période clôturée chaque vendredi à 23h59m59s (juste avant Samedi 00h00m00s)</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 40px;" class="text-center">Sem.</th>
                  <th style="width: 120px;">Clôture (Vendredi 23h59m59s)</th>
                  <th class="text-center" style="width: 60px;">Reçus</th>
                  <th>Détail des Collectes par Secteur</th>
                  <th class="text-right" style="width: 105px;">Total Semaine</th>
                  <th class="text-right" style="width: 110px;">Cumul Annuel</th>
                </tr>
              </thead>
              <tbody>
                ${weeksWithCumulative.length > 0 ? weeksWithCumulative.map((w, idx) => {
                  const sortedSectorsInWeek = Object.entries(w.sectorBreakdown).sort((a, b) => b[1] - a[1]);
                  const sectorBadges = sortedSectorsInWeek.map(([sec, amt]) => `
                    <span class="sector-pill">${sec} : <strong>${Number(amt).toLocaleString('fr-FR')} F</strong></span>
                  `).join(' ');

                  return `
                    <tr>
                      <td class="text-center font-bold" style="color: #64748b;">${idx + 1}</td>
                      <td class="font-bold">Ven. ${w.formattedDate} <span style="font-size: 8px; color: #64748b;">(23h59m59s)</span></td>
                      <td class="text-center font-bold">${w.count}</td>
                      <td>${sectorBadges}</td>
                      <td class="text-right font-black" style="color: #1e3a8a;">+ ${w.total.toLocaleString('fr-FR')} F</td>
                      <td class="text-right font-bold" style="color: #475569;">${w.cumulative.toLocaleString('fr-FR')} F</td>
                    </tr>
                  `;
                }).join('') : `
                  <tr><td colspan="6" class="text-center" style="padding: 12px; color: #64748b;">Aucune clôture hebdomadaire enregistrée</td></tr>
                `}
                <tr class="total-row">
                  <td colspan="4" class="font-black text-right" style="text-transform: uppercase;">Total Cumulé des Clôtures Hebdomadaires :</td>
                  <td class="text-right font-black" style="color: #15803d; font-size: 10.5px;">+ ${totalIncomes.toLocaleString('fr-FR')} F</td>
                  <td class="text-right font-black" style="color: #15803d; font-size: 10.5px;">${totalIncomes.toLocaleString('fr-FR')} F</td>
                </tr>
              </tbody>
            </table>

            <!-- SECTION 3 : Sorties - Décaissements Détaillés (Conservé comme à l'origine) -->
            <div class="section-heading avoid-break" style="margin-top: 20px;">
              <span>3. Sorties : Détail Exhaustif des Décaissements / Dépenses</span>
              <span class="section-subtitle">${filteredExpenses.length} décaissements enregistrés</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 80px;">Date</th>
                  <th style="width: 140px;">Bénéficiaire</th>
                  <th>Motif / Description de la Dépense</th>
                  <th class="text-right" style="width: 110px;">Montant</th>
                </tr>
              </thead>
              <tbody>
                ${filteredExpenses.length > 0 ? filteredExpenses.map(e => `
                  <tr>
                    <td style="white-space: nowrap;">${e.expense_date ? format(new Date(e.expense_date), 'dd/MM/yyyy') : '-'}</td>
                    <td class="font-bold">${e.beneficiary || 'Non spécifié'}</td>
                    <td>${e.reason || 'Dépense de trésorerie'}</td>
                    <td class="text-right font-bold" style="color: #dc2626;">- ${Number(e.amount).toLocaleString('fr-FR')} F</td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="4" class="text-center" style="padding: 12px; color: #64748b;">Aucun décaissement enregistré sur cet exercice</td></tr>
                `}
                <tr class="total-row">
                  <td colspan="3" class="font-black text-right" style="text-transform: uppercase;">Total Général des Décaissements :</td>
                  <td class="text-right font-black" style="color: #dc2626; font-size: 11px;">- ${totalExpenses.toLocaleString('fr-FR')} F CFA</td>
                </tr>
              </tbody>
            </table>

            <!-- SECTION 4 : Cadre Officiel d'Émargement & Signatures (2 Signataires) -->
            <div class="signature-container avoid-break">
              <div class="signature-header">Validation & Approbation Officielle du Bilan Financier</div>
              <div class="signature-grid">
                <!-- 1. Trésorier Général -->
                <div class="signature-box">
                  <div>
                    <div class="signature-role">Le Trésorier Général</div>
                    <div class="signature-sub">Daara Mawahiboul Khoudoss</div>
                  </div>
                  <div class="signature-line">Date, Signature & Cachet</div>
                </div>

                <!-- 2. Commissaire aux Comptes -->
                <div class="signature-box">
                  <div>
                    <div class="signature-role">Le Commissaire aux Comptes</div>
                    <div class="signature-sub">Commission de Contrôle Financier</div>
                  </div>
                  <div class="signature-line">Date, Signature & Cachet</div>
                </div>
              </div>
            </div>

            <!-- Pied de Page Document -->
            <div class="doc-footer avoid-break">
              Ce document est un rapport officiel généré automatiquement par le Système d'Information de la Daara Mawahiboul Khoudoss.
              <br/>Imprimé le ${format(new Date(), 'dd/MM/yyyy à HH:mm')} • Document certifié conforme pour l'Assemblée Générale et les Archives.
            </div>

            <script>
              window.onload = () => {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      } else {
        alert("Veuillez autoriser les fenêtres pop-up dans votre navigateur pour imprimer le rapport.");
      }

    } catch (err) {
      alert("Erreur lors de la génération du rapport: " + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  // Secure Reset Handlers
  const triggerResetModal = () => {
    setShowResetModal(true);
    setResetEmail('');
    setResetPassword('');
    setResetError('');
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetPassword) {
      setResetError("Veuillez remplir tous les champs.");
      return;
    }

    setIsResetting(true);
    setResetError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: resetEmail,
        password: resetPassword,
      });

      if (authError || !authData.user) {
        throw new Error("Identifiants incorrects ou autorisation refusée.");
      }

      const { error: resetError } = await supabase.rpc('reset_annual_transactions');

      if (resetError) {
        console.error("Erreur RPC reset:", resetError);
        throw new Error("Impossible de réinitialiser. Avez-vous exécuté le script SQL dans Supabase ?");
      }
      
      await supabase.from('activity_logs').insert([{
        user_email: user?.email || 'Admin',
        action_type: 'SUPPRESSION',
        entity_type: 'SYSTÈME',
        details: 'Réinitialisation globale des transactions financières annuelles (Validée par mot de passe)'
      }]);

      alert("Les transactions de l'année ont été réinitialisées avec succès.");
      setShowResetModal(false);
      
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center">
            Paramètres Système
          </h1>
          <p className="text-muted-foreground mt-1.5 font-medium">Gestion des données, sécurité et configuration générale.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs Sidebar */}
        <div className="w-full lg:w-64 space-y-1.5">
          <button 
            onClick={() => setActiveTab('donnees')}
            className={`w-full flex items-center p-3.5 rounded-xl font-semibold transition-all text-left ${activeTab === 'donnees' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
          >
            <Database size={18} className="mr-3" />
            Gestion des Données
          </button>
          <button 
            onClick={() => setActiveTab('securite')}
            className={`w-full flex items-center p-3.5 rounded-xl font-semibold transition-all text-left ${activeTab === 'securite' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
          >
            <Shield size={18} className="mr-3" />
            Sécurité (2FA)
          </button>
          <button 
            onClick={() => setActiveTab('roles')}
            className={`w-full flex items-center p-3.5 rounded-xl font-semibold transition-all text-left ${activeTab === 'roles' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
          >
            <Users size={18} className="mr-3" />
            Rôles & Accès
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center p-3.5 rounded-xl font-semibold transition-all text-left ${activeTab === 'notifications' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
          >
            <Bell size={18} className="mr-3" />
            Notifications
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          
          {/* Data Management Tab */}
          {activeTab === 'donnees' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Export Section */}
              <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 relative overflow-hidden">
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center relative z-10">
                  <Download className="mr-3 text-blue-500" size={24} />
                  Exports de Données
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                  <div className="border border-border/50 rounded-xl p-5 bg-background hover:bg-secondary/30 transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
                        <Database size={24} />
                      </div>
                    </div>
                    <h3 className="font-bold text-foreground mb-1">Base Membres (Excel)</h3>
                    <p className="text-sm text-muted-foreground mb-5 line-clamp-2">Export complet de l'annuaire avec ID, Secteurs et informations de contact.</p>
                    <button 
                      onClick={exportMembersToCSV}
                      disabled={isExporting}
                      className="w-full bg-secondary text-foreground hover:bg-green-500 hover:text-white border border-border/50 hover:border-transparent font-medium px-4 py-2 rounded-lg transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {isExporting ? <Loader2 size={18} className="animate-spin mr-2" /> : <Download size={18} className="mr-2" />}
                      Générer le .CSV
                    </button>
                  </div>

                  <div className="border border-border/50 rounded-xl p-5 bg-background hover:bg-secondary/30 transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-red-500/10 rounded-lg text-red-600 dark:text-red-400">
                        <FileText size={24} />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-semibold text-muted-foreground">Exercice :</label>
                        <select
                          value={reportYear}
                          onChange={(e) => setReportYear(e.target.value)}
                          className="bg-secondary text-foreground text-xs font-bold px-2 py-1 rounded-md border border-border/60 outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value={currentYear.toString()}>{currentYear} (En cours)</option>
                          <option value={(currentYear - 1).toString()}>{currentYear - 1}</option>
                          <option value={(currentYear - 2).toString()}>{currentYear - 2}</option>
                          <option value="all">Tout l'historique</option>
                        </select>
                      </div>
                    </div>
                    <h3 className="font-bold text-foreground mb-1">Rapport Financier (PDF A4)</h3>
                    <p className="text-sm text-muted-foreground mb-5 line-clamp-2">Bilan officiel format A4 : agrégation hebdomadaire (vendredis 23h59m59s), statistiques sectorielles, graphiques & décaissements détaillés.</p>
                    <button 
                      onClick={exportFinancialReportPDF}
                      disabled={isExporting}
                      className="w-full bg-secondary text-foreground hover:bg-red-500 hover:text-white border border-border/50 hover:border-transparent font-medium px-4 py-2 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {isExporting ? <Loader2 size={18} className="animate-spin mr-2" /> : <FileText size={18} className="mr-2" />}
                      Imprimer le Rapport (A4)
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl shadow-sm p-6 relative overflow-hidden">
                <h2 className="text-xl font-bold text-red-600 dark:text-red-500 mb-2 flex items-center relative z-10">
                  <AlertTriangle className="mr-3" size={24} />
                  Zone de Danger (Clôture Annuelle)
                </h2>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-6 relative z-10 max-w-2xl">
                  Cette action est irréversible. Elle supprimera l'intégralité des transactions financières enregistrées dans la base de données afin de démarrer une nouvelle année à zéro. Les comptes membres seront conservés.
                </p>
                
                <button 
                  onClick={triggerResetModal}
                  className="bg-red-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors flex items-center shadow-md relative z-10"
                >
                  <AlertTriangle size={18} className="mr-2" />
                  Réinitialiser les transactions
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'securite' && (
            <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-foreground mb-4 border-b border-border/50 pb-4">Authentification à Double Facteur (2FA)</h2>
              <p className="text-sm text-muted-foreground mb-6">
                L'authentification à double facteur ajoute une couche de sécurité supplémentaire à votre compte Admin Général.
                Une fois activée, un code généré par votre application mobile (ex: Google Authenticator) sera requis pour vous connecter.
              </p>
              
              <div className="flex items-center justify-between p-5 border border-border/50 rounded-xl bg-background shadow-sm">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 transition-colors ${is2FAEnabled ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                    {is2FAEnabled ? <CheckCircle size={24} /> : <Lock size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Statut 2FA</h3>
                    <p className={`text-sm mt-0.5 font-medium ${is2FAEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {is2FAEnabled ? 'Actif et Sécurisé' : 'Actuellement inactif sur ce compte'}
                    </p>
                  </div>
                </div>
                {!is2FAEnabled ? (
                  <button onClick={() => setShow2FAModal(true)} className="bg-secondary text-foreground border border-border/50 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all">
                    Activer le 2FA
                  </button>
                ) : (
                  <button onClick={() => {
                    if(window.confirm("Voulez-vous vraiment désactiver le 2FA ? Cela réduira la sécurité de votre compte.")) {
                      setIs2FAEnabled(false);
                    }
                  }} className="bg-red-500/10 text-red-600 border border-red-500/20 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 hover:text-white transition-all">
                    Désactiver
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Roles & Access Tab */}
          {activeTab === 'roles' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl"></div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <h2 className="text-xl font-bold text-foreground flex items-center">
                    <Users className="mr-3 text-purple-500" size={24} />
                    Gestion des Accès
                  </h2>
                  <button onClick={handleAddRole} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all flex items-center shadow-sm">
                    <Plus size={16} className="mr-2" /> Nouveau Rôle
                  </button>
                </div>

                <div className="overflow-x-auto relative z-10 custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border/50">
                      <tr>
                        <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Utilisateur</th>
                        <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Rôle</th>
                        <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Permissions</th>
                        <th className="px-6 py-4 uppercase tracking-wider text-[11px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {rolesList.map(r => (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-semibold text-foreground">{r.email}</td>
                          <td className="px-6 py-4"><span className={`${r.badgeColor} border px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider`}>{r.role}</span></td>
                          <td className="px-6 py-4 text-muted-foreground font-medium">{r.permissions}</td>
                          <td className="px-6 py-4 text-right">
                            {r.isProtected ? (
                              <span className="text-muted-foreground/50 text-xs italic">Intouchable</span>
                            ) : (
                              <button onClick={() => handleRevokeRole(r.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors">Révoquer</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 relative overflow-hidden">
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl"></div>
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center relative z-10">
                  <Bell className="mr-3 text-amber-500" size={24} />
                  Préférences de Notifications
                </h2>
                
                <div className="space-y-4 relative z-10">
                  {/* Item 1 */}
                  <div onClick={() => setNotifInscriptions(!notifInscriptions)} className="flex items-center justify-between p-4 bg-background border border-border/50 rounded-xl hover:bg-secondary/50 transition-colors group cursor-pointer">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-4">
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Nouvelles Inscriptions</h3>
                        <p className="text-xs text-muted-foreground">Recevoir un email quand un membre s'inscrit.</p>
                      </div>
                    </div>
                    {/* Toggle */}
                    <div className={`w-12 h-6 rounded-full relative shadow-inner flex-shrink-0 transition-colors ${notifInscriptions ? 'bg-emerald-500' : 'bg-secondary border border-border/50'}`}>
                      <div className={`w-5 h-5 rounded-full absolute top-0.5 shadow-sm transition-all ${notifInscriptions ? 'bg-white right-0.5' : 'bg-background border border-border/50 left-0.5'}`}></div>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div onClick={() => setNotifRapports(!notifRapports)} className="flex items-center justify-between p-4 bg-background border border-border/50 rounded-xl hover:bg-secondary/50 transition-colors group cursor-pointer">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mr-4">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Rapports Hebdomadaires</h3>
                        <p className="text-xs text-muted-foreground">Résumé des entrées/sorties tous les lundis.</p>
                      </div>
                    </div>
                    {/* Toggle */}
                    <div className={`w-12 h-6 rounded-full relative shadow-inner flex-shrink-0 transition-colors ${notifRapports ? 'bg-emerald-500' : 'bg-secondary border border-border/50'}`}>
                      <div className={`w-5 h-5 rounded-full absolute top-0.5 shadow-sm transition-all ${notifRapports ? 'bg-white right-0.5' : 'bg-background border border-border/50 left-0.5'}`}></div>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div onClick={() => setNotifAlertes(!notifAlertes)} className="flex items-center justify-between p-4 bg-background border border-border/50 rounded-xl hover:bg-secondary/50 transition-colors group cursor-pointer">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mr-4">
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Alertes de Sécurité</h3>
                        <p className="text-xs text-muted-foreground">Tentatives de connexion suspectes ou purges massives.</p>
                      </div>
                    </div>
                    {/* Toggle */}
                    <div className={`w-12 h-6 rounded-full relative shadow-inner flex-shrink-0 transition-colors ${notifAlertes ? 'bg-emerald-500' : 'bg-secondary border border-border/50'}`}>
                      <div className={`w-5 h-5 rounded-full absolute top-0.5 shadow-sm transition-all ${notifAlertes ? 'bg-white right-0.5' : 'bg-background border border-border/50 left-0.5'}`}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Sécurité 2FA (Simulation) */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border/50 overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-foreground flex items-center">
                  <Smartphone className="mr-2 text-primary" size={24} />
                  Configuration 2FA
                </h2>
                <button type="button" onClick={() => setShow2FAModal(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-secondary" aria-label="Fermer" title="Fermer">
                  <X size={20} />
                </button>
              </div>
              
              <div className="bg-secondary/50 p-4 rounded-xl mb-6 text-sm text-foreground text-center border border-border/50">
                <p className="mb-2 font-medium">Scannez le QR Code avec votre application (Google Authenticator, Authy, etc.)</p>
                <div className="w-32 h-32 bg-white rounded-lg mx-auto border-4 border-white flex items-center justify-center overflow-hidden">
                  {/* Fake QR Code visualization */}
                  <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTAgMTBoMjB2MjBIMTB6TTQwIDEwaDIwdjIwSDQweiBNNzAgMTBoMjB2MjBINzB6IE0xMCA0MGgyMHYyMEgxMHogTTEwIDcwaDIwdjIwSDEweiBNNDAgNDBoMjB2MjBINDB6IiBmaWxsPSJibGFjayIvPjwvc3ZnPg==')] bg-cover opacity-80"></div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Clé secrète: <span className="font-mono bg-background px-1 py-0.5 rounded">JBSWY3DPEHPK3PXP</span></p>
              </div>

              <form onSubmit={handle2FASubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5 text-center">
                    Entrez le code à 6 chiffres généré par l'application
                  </label>
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    value={pin2FA}
                    onChange={(e) => setPin2FA(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    placeholder="000000"
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={pin2FA.length !== 6}
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50"
                >
                  Valider et Activer
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Réinitialisation Sécurisée */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-red-500/20 overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-red-600 dark:text-red-500 flex items-center">
                  <AlertTriangle className="mr-2" size={24} />
                  Validation Requise
                </h2>
                <button type="button" onClick={() => setShowResetModal(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-secondary" aria-label="Fermer" title="Fermer">
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-sm text-foreground font-medium mb-6 leading-relaxed">
                Vous êtes sur le point d'effacer définitivement toutes les transactions financières. 
                Veuillez saisir vos identifiants administrateur pour confirmer cette action irréversible.
              </p>

              <form onSubmit={handleResetSubmit} className="space-y-4">
                {resetError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm font-semibold">
                    {resetError}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center">
                    <Mail size={16} className="mr-2 opacity-70" /> Email Admin
                  </label>
                  <input 
                    type="email" 
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all"
                    placeholder="admin@dmk.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center">
                    <Lock size={16} className="mr-2 opacity-70" /> Mot de passe
                  </label>
                  <input 
                    type="password" 
                    required
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 bg-secondary text-foreground font-semibold py-3 rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={isResetting}
                    className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center"
                  >
                    {isResetting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                    Confirmer la Purge
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
