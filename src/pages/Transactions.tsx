import { useEffect, useState, useRef } from 'react';
import { Search, Loader2, X, Edit, Shield, CheckCircle, ArrowDownRight, ArrowUpRight, Lock, Mail, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type TransactionType = 'Sass' | 'Revenu' | 'Dépense';

type Transaction = {
  id: string; // The original ID
  uniqueId: string; // Used for React keys (e.g., sass_1, inc_2)
  type: TransactionType;
  amount: number;
  date: Date;
  actor: string; // First/Last name for Sass, Source for Income, Beneficiary for Expense
  statusOrMethod?: string; // Status or Payment Method for Sass, Description for Income, Reason for Expense
  raw: any; // Keep the original object to populate the edit form easily
};

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tous les types');

  // Pagination state
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Edit form state
  const [editAmount, setEditAmount] = useState('');
  const [editStatus, setEditStatus] = useState(''); // For Sass
  const [editSource, setEditSource] = useState(''); // For Income
  const [editDesc, setEditDesc] = useState(''); // For Income
  const [editReason, setEditReason] = useState(''); // For Expense
  const [editBeneficiary, setEditBeneficiary] = useState(''); // For Expense

  // Auth and Motive state
  const [editMotive, setEditMotive] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const dropdownRef = useRef<HTMLTableElement>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const { data: contribs, error: contribsError } = await supabase
        .from('sass_contributions')
        .select('*, members:member_id(first_name, last_name, dmk_id, sector)');
        
      const { data: incomes, error: incomesError } = await supabase
        .from('treasury_incomes')
        .select('*');
        
      const { data: expenses, error: expensesError } = await supabase
        .from('treasury_expenses')
        .select('*');

      if (contribsError) throw contribsError;
      if (incomesError) throw incomesError;
      if (expensesError) throw expensesError;

      let history: Transaction[] = [];

      if (contribs) {
        contribs.forEach(c => {
          history.push({
            id: c.id,
            uniqueId: 'sass_' + c.id,
            type: 'Sass',
            amount: c.amount,
            date: new Date(c.payment_date),
            actor: c.members ? `${(c.members as any).first_name} ${(c.members as any).last_name}` : 'Membre Inconnu',
            statusOrMethod: c.status,
            raw: c
          });
        });
      }

      if (incomes) {
        incomes.forEach(i => {
          history.push({
            id: i.id,
            uniqueId: 'inc_' + i.id,
            type: 'Revenu',
            amount: i.amount,
            date: new Date(i.income_date),
            actor: i.source,
            statusOrMethod: i.description || 'Sans description',
            raw: i
          });
        });
      }

      if (expenses) {
        expenses.forEach(e => {
          history.push({
            id: e.id,
            uniqueId: 'exp_' + e.id,
            type: 'Dépense',
            amount: e.amount,
            date: new Date(e.expense_date),
            actor: e.beneficiary,
            statusOrMethod: e.reason,
            raw: e
          });
        });
      }

      // Sort by date descending
      history.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setTransactions(history);
    } catch (err: any) {
      console.error('Erreur lors du chargement des transactions:', err.message);
      setError('Impossible de charger la liste des transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);



  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditAmount(tx.amount.toString());
    setEditMotive('');
    setAdminEmail('');
    setAdminPassword('');
    setAuthError('');

    if (tx.type === 'Sass') {
      setEditStatus(tx.raw.status || 'En attente');
    } else if (tx.type === 'Revenu') {
      setEditSource(tx.raw.source || '');
      setEditDesc(tx.raw.description || '');
    } else if (tx.type === 'Dépense') {
      setEditReason(tx.raw.reason || '');
      setEditBeneficiary(tx.raw.beneficiary || '');
    }

    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    if (!editMotive.trim()) {
      setAuthError('Le motif de modification est obligatoire.');
      return;
    }

    if (!adminEmail || !adminPassword) {
      setAuthError('Les identifiants administrateur sont requis.');
      return;
    }

    setIsSubmitting(true);
    setAuthError('');
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const productionUrl = 'https://dmksytemebackend.onrender.com';
      const baseUrl = window.location.hostname === 'localhost' ? API_URL : productionUrl;

      const updateData = {
        amount: Number(editAmount),
        ...(editingTransaction.type === 'Sass' && { status: editStatus }),
        ...(editingTransaction.type === 'Revenu' && { source: editSource, description: editDesc }),
        ...(editingTransaction.type === 'Dépense' && { reason: editReason, beneficiary: editBeneficiary }),
      };

      const response = await fetch(`${baseUrl}/api/transactions/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPassword,
          transactionId: editingTransaction.id,
          type: editingTransaction.type,
          motive: editMotive,
          updateData
        })
      });

      const result = await response.json();
      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || "Erreur lors de la modification");
      }

      // 4. Update local state immediately for visual feedback
      setTransactions(prevTransactions => 
        prevTransactions.map(tx => {
          if (tx.uniqueId === editingTransaction.uniqueId) {
            return {
              ...tx,
              amount: Number(editAmount),
              actor: editingTransaction.type === 'Revenu' ? editSource : 
                     editingTransaction.type === 'Dépense' ? editBeneficiary : tx.actor,
              statusOrMethod: editingTransaction.type === 'Sass' ? editStatus : 
                              editingTransaction.type === 'Revenu' ? editDesc || 'Sans description' : editReason,
              raw: {
                ...tx.raw,
                amount: Number(editAmount),
                status: editingTransaction.type === 'Sass' ? editStatus : tx.raw.status,
                source: editingTransaction.type === 'Revenu' ? editSource : tx.raw.source,
                description: editingTransaction.type === 'Revenu' ? editDesc : tx.raw.description,
                reason: editingTransaction.type === 'Dépense' ? editReason : tx.raw.reason,
                beneficiary: editingTransaction.type === 'Dépense' ? editBeneficiary : tx.raw.beneficiary
              }
            };
          }
          return tx;
        })
      );

      alert('La transaction a été modifiée avec succès.');
      setIsModalOpen(false);
      
      // Fetch in background to ensure consistency
      fetchTransactions();
      
    } catch (err: any) {
      console.error("Erreur de modification:", err.message);
      setAuthError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchSearch = tx.actor.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (tx.statusOrMethod && tx.statusOrMethod.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchType = typeFilter === 'Tous les types' || tx.type === typeFilter;
    return matchSearch && matchType;
  });

  // Paginate transactions
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 relative">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden gap-4">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Gestion des Transactions</h1>
          <p className="text-muted-foreground mt-1 font-medium">Historique consolidé et supervision des flux financiers</p>
        </div>
      </div>

      {/* FILTRES */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/10">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-70" size={18} />
            <input 
              type="search" 
              placeholder="Rechercher par nom, source, motif..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-foreground placeholder:text-muted-foreground transition-all shadow-sm"
            />
          </div>
          <div className="flex space-x-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <select 
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="bg-background text-foreground text-sm font-medium rounded-xl px-4 py-2.5 border border-border/50 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary flex-none shadow-sm transition-all cursor-pointer"
            >
              <option value="Tous les types">Tous les types</option>
              <option value="Sass">Cotisations Sass</option>
              <option value="Revenu">Encaissements Libres</option>
              <option value="Dépense">Décaissements</option>
            </select>
          </div>
        </div>

        {/* TABLEAU */}
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <Loader2 className="animate-spin mb-4 text-primary" size={32} />
              <p>Chargement des transactions...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-red-500">
              <p>{error}</p>
              <button onClick={fetchTransactions} className="mt-4 bg-secondary text-foreground px-4 py-2 rounded-md hover:bg-muted">Réessayer</button>
            </div>
          ) : paginatedTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <p>Aucune transaction ne correspond à vos filtres.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              <table className="w-full text-left text-sm" ref={dropdownRef}>
                <thead className="bg-muted/30 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Type</th>
                    <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Date</th>
                    <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Bénéficiaire / Source / Membre</th>
                    <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Détails / Statut</th>
                    <th className="px-6 py-4 uppercase tracking-wider text-[11px] text-right">Montant</th>
                    <th className="px-6 py-4 uppercase tracking-wider text-[11px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 bg-card">
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.uniqueId} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                          tx.type === 'Sass' ? 'bg-primary/10 text-primary border-primary/20' :
                          tx.type === 'Revenu' ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400' :
                          'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400'
                        }`}>
                          {tx.type === 'Dépense' ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">{formatDate(tx.date)}</td>
                      <td className="px-6 py-4 font-bold text-foreground">{tx.actor}</td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">{tx.statusOrMethod}</td>
                      <td className={`px-6 py-4 text-right font-extrabold ${tx.type === 'Dépense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {tx.type === 'Dépense' ? '-' : '+'}{formatMoney(tx.amount)} F
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleOpenEditModal(tx)}
                          className="text-primary hover:text-primary/80 font-semibold p-1.5 rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-end w-full"
                        >
                          <Edit size={16} className="mr-2" /> Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
                  <p className="text-sm text-muted-foreground font-medium">
                    Page <span className="font-bold text-foreground">{page}</span> sur <span className="font-bold text-foreground">{totalPages}</span>
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-background border border-border/50 text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-background border border-border/50 text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL MODIFICATION */}
      {isModalOpen && editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-primary/20 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-600"></div>
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/10">
              <h2 className="text-xl font-bold text-foreground flex items-center">
                <Shield size={20} className="mr-2 text-primary" /> Validation Administrateur
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveTransaction} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              
              <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                <p className="text-sm font-bold text-foreground mb-1">Modification de transaction ({editingTransaction.type})</p>
                <p className="text-xs text-muted-foreground">Opération initiale du {formatDate(editingTransaction.date)} pour {editingTransaction.actor}</p>
              </div>

              {/* DYNAMIC FORM FIELDS */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Montant Actuel: {formatMoney(editingTransaction.amount)} F</label>
                  <input required value={editAmount} onChange={e => setEditAmount(e.target.value)} type="number" className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-foreground focus:ring-2 focus:ring-primary outline-none font-bold" />
                </div>

                {editingTransaction.type === 'Sass' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Statut (actuel: {editingTransaction.raw.status})</label>
                    <select required value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none">
                      <option value="Validé">Validé</option>
                      <option value="En attente">En attente</option>
                      <option value="Rejeté">Rejeté</option>
                    </select>
                  </div>
                )}

                {editingTransaction.type === 'Revenu' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Source</label>
                      <input required value={editSource} onChange={e => setEditSource(e.target.value)} type="text" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                      <input value={editDesc} onChange={e => setEditDesc(e.target.value)} type="text" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                  </>
                )}

                {editingTransaction.type === 'Dépense' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Bénéficiaire</label>
                      <input required value={editBeneficiary} onChange={e => setEditBeneficiary(e.target.value)} type="text" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Motif / Raison</label>
                      <input required value={editReason} onChange={e => setEditReason(e.target.value)} type="text" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-border/50 pt-4 mt-2">
                <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center">
                  <AlertTriangle size={16} className="mr-2" />
                  Sécurité et Traçabilité (Obligatoire)
                </h3>
                
                {authError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm font-semibold">
                    {authError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Motif clair de cette modification *</label>
                    <textarea 
                      required 
                      value={editMotive} 
                      onChange={e => setEditMotive(e.target.value)} 
                      placeholder="Expliquez pourquoi vous modifiez cette transaction..."
                      className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none h-24"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1 flex items-center">
                        <Mail size={14} className="mr-1.5 opacity-70" /> Email Admin
                      </label>
                      <input 
                        type="email" 
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                        placeholder="admin@dmk.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1 flex items-center">
                        <Lock size={14} className="mr-1.5 opacity-70" /> Mot de passe
                      </label>
                      <input 
                        type="password" 
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border/50 mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl flex items-center shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin mr-2" /> : <CheckCircle size={18} className="mr-2" />}
                  Valider la Modification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
