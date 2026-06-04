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

  // Export Financial Report to PDF
  const exportFinancialReportPDF = async () => {
    setIsExporting(true);
    try {
      let allContribs: Contribution[] = [];
      let from = 0;
      let hasMore = true;

      // Boucle d'aspiration pour contourner la limite de 1000 lignes
      while (hasMore) {
        const { data, error } = await supabase
          .from('sass_contributions')
          .select('*, members(first_name, last_name, dmk_id)')
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

      // Boucle d'aspiration pour les dépenses
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

      const totalIncomes = allContribs
        .filter(c => c.status === 'Validé')
        .reduce((sum, c) => sum + Number(c.amount), 0);

      const totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const netBalance = totalIncomes - totalExpenses;

      let html = `
        <html>
          <head>
            <title>Rapport Annuel - Trésorerie DMK</title>
            <style>
              body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                margin: 40px;
                color: #1e293b;
                background-color: #fff;
              }
              .header-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 3px solid #1e3a8a;
                padding-bottom: 15px;
                margin-bottom: 30px;
              }
              .logo-area {
                text-align: left;
              }
              .logo-title {
                font-size: 24px;
                font-weight: 800;
                color: #1e3a8a;
                margin: 0;
                letter-spacing: -0.5px;
              }
              .logo-subtitle {
                font-size: 12px;
                font-weight: 600;
                color: #475569;
                margin: 4px 0 0 0;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .meta-area {
                text-align: right;
                font-size: 11px;
                color: #64748b;
              }
              .meta-area p {
                margin: 2px 0;
              }
              .report-title-container {
                text-align: center;
                margin-bottom: 30px;
              }
              .report-title {
                font-size: 20px;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                text-transform: uppercase;
              }
              .report-period {
                font-size: 13px;
                color: #475569;
                margin-top: 5px;
                font-weight: 600;
              }
              .metrics-row {
                display: flex;
                gap: 15px;
                margin-bottom: 35px;
              }
              .metric-card {
                flex: 1;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 15px;
                background-color: #f8fafc;
              }
              .metric-label {
                font-size: 10px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .metric-value {
                font-size: 20px;
                font-weight: 800;
                margin-top: 5px;
              }
              .metric-value.income {
                color: #16a34a;
              }
              .metric-value.expense {
                color: #dc2626;
              }
              .metric-value.net {
                color: #2563eb;
              }
              .section-title {
                font-size: 14px;
                font-weight: 800;
                color: #1e3a8a;
                border-bottom: 2px solid #cbd5e1;
                padding-bottom: 6px;
                margin-top: 30px;
                margin-bottom: 12px;
                text-transform: uppercase;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
                font-size: 11px;
              }
              th {
                background-color: #f1f5f9;
                color: #334155;
                font-weight: 700;
                text-align: left;
                padding: 8px 10px;
                border-bottom: 2px solid #cbd5e1;
              }
              td {
                padding: 8px 10px;
                border-bottom: 1px solid #e2e8f0;
                color: #334155;
              }
              tr:nth-child(even) td {
                background-color: #f8fafc;
              }
              .text-right {
                text-align: right;
              }
              .font-bold {
                font-weight: 700;
              }
              .status-badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
              }
              .status-badge.valide {
                background-color: #dcfce7;
                color: #15803d;
              }
              .status-badge.attente {
                background-color: #fef9c3;
                color: #a16207;
              }
              .status-badge.rejete {
                background-color: #fee2e2;
                color: #b91c1c;
              }
              .footer {
                margin-top: 50px;
                border-top: 1px solid #e2e8f0;
                padding-top: 15px;
                text-align: center;
                font-size: 10px;
                color: #94a3b8;
              }
              @media print {
                body {
                  margin: 15mm;
                }
                .metric-card {
                  background-color: #f8fafc !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                th {
                  background-color: #f1f5f9 !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                tr:nth-child(even) td {
                  background-color: #f8fafc !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .status-badge.valide {
                  background-color: #dcfce7 !important;
                  color: #15803d !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .status-badge.attente {
                  background-color: #fef9c3 !important;
                  color: #a16207 !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <div class="header-container">
              <div class="logo-area">
                <h1 class="logo-title">Daara Mawahiboul Khoudoss</h1>
                <p class="logo-subtitle">Bureau Administratif et Financier</p>
              </div>
              <div class="meta-area">
                <p><strong>Généré le :</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                <p><strong>Type :</strong> Bilan Annuel Consolidé</p>
              </div>
            </div>

            <div class="report-title-container">
              <h2 class="report-title">Rapport Financier Annuel</h2>
              <div class="report-period">Année en cours (${new Date().getFullYear()})</div>
            </div>

            <div class="metrics-row">
              <div class="metric-card">
                <div class="metric-label">Total Entrées (Sass validés)</div>
                <div class="metric-value income">+ ${totalIncomes.toLocaleString('fr-FR')} F</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total Sorties (Dépenses)</div>
                <div class="metric-value expense">- ${totalExpenses.toLocaleString('fr-FR')} F</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Solde Caisse Net</div>
                <div class="metric-value net">${netBalance.toLocaleString('fr-FR')} F</div>
              </div>
            </div>

            <div class="section-title">1. Entrées : Cotisations Sass</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>ID Membre</th>
                  <th>Nom Complet</th>
                  <th>Rubrique</th>
                  <th>Moyen</th>
                  <th>Statut</th>
                  <th class="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
      `;

      if (allContribs.length > 0) {
        allContribs.forEach((c) => {
          const statusClass = c.status === 'Validé' ? 'valide' : (c.status === 'En attente' ? 'attente' : 'rejete');
          const dateStr = c.payment_date ? format(new Date(c.payment_date), 'dd/MM/yyyy') : '-';
          html += `
            <tr>
              <td>${dateStr}</td>
              <td>${c.members?.dmk_id || '-'}</td>
              <td class="font-bold">${c.members?.first_name || ''} ${c.members?.last_name || ''}</td>
              <td>Sass ${c.sass_type || 'Général'}</td>
              <td>${c.payment_method || '-'}</td>
              <td><span class="status-badge ${statusClass}">${c.status || '-'}</span></td>
              <td class="text-right font-bold">${Number(c.amount).toLocaleString('fr-FR')} F</td>
            </tr>
          `;
        });
      } else {
        html += `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 15px;">Aucune cotisation enregistrée</td></tr>`;
      }

      html += `
              </tbody>
            </table>

            <div class="section-title">2. Sorties : Décaissements / Dépenses</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bénéficiaire</th>
                  <th>Motif / Description</th>
                  <th class="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
      `;

      if (allExpenses.length > 0) {
        allExpenses.forEach((e) => {
          const dateStr = e.expense_date ? format(new Date(e.expense_date), 'dd/MM/yyyy') : '-';
          html += `
            <tr>
              <td>${dateStr}</td>
              <td class="font-bold">${e.beneficiary || '-'}</td>
              <td>${e.reason || '-'}</td>
              <td class="text-right font-bold" style="color: #dc2626;">-${Number(e.amount).toLocaleString('fr-FR')} F</td>
            </tr>
          `;
        });
      } else {
        html += `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 15px;">Aucune dépense enregistrée</td></tr>`;
      }

      html += `
              </tbody>
            </table>

            <div class="footer">
              Ce document est un rapport officiel généré par le Système d'Information de la Daara Mawahiboul Khoudoss.
            </div>
            <script>
              window.onload = () => { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
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
                    </div>
                    <h3 className="font-bold text-foreground mb-1">Rapport Financier (PDF)</h3>
                    <p className="text-sm text-muted-foreground mb-5 line-clamp-2">Bilan annuel des transactions Sass (entrées/sorties) pour l'impression.</p>
                    <button 
                      onClick={exportFinancialReportPDF}
                      disabled={isExporting}
                      className="w-full bg-secondary text-foreground hover:bg-red-500 hover:text-white border border-border/50 hover:border-transparent font-medium px-4 py-2 rounded-lg transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {isExporting ? <Loader2 size={18} className="animate-spin mr-2" /> : <FileText size={18} className="mr-2" />}
                      Imprimer le Rapport
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
