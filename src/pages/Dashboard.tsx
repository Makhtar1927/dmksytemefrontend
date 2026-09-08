import { useEffect, useState, useCallback } from 'react';
import { Users, Wallet, TrendingUp, Loader2, Calendar, ExternalLink, MapPin, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, gradientClass }: any) => (
  <div className={`relative overflow-hidden p-6 rounded-2xl border border-border/50 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${gradientClass || 'bg-card'}`}>
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
    <div className="relative z-10 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-muted-foreground/80 mb-1 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-extrabold text-foreground tracking-tight">{value}</h3>
      </div>
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
        <Icon size={28} strokeWidth={1.5} />
      </div>
    </div>
    {trend && (
      <div className="relative z-10 mt-5 flex items-center text-sm font-medium">
        <span className={`flex items-center px-2.5 py-1 rounded-md ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
          {trend === 'up' ? '↑' : '↓'} {trendValue}
        </span>
        <span className="text-muted-foreground ml-3 text-xs">vs mois dernier</span>
      </div>
    )}
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalFunds: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch Total Members
      const { count: totalCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });
        
      // Fetch Active Members
      const { count: activeCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Actif');

      // Fetch Total Funds and Daily Chart Data from sass_contributions
      const { data: contribsData } = await supabase
        .from('sass_contributions')
        .select('amount, payment_date, created_at, status')
        .order('payment_date', { ascending: true });
        
      let totalFunds = 0;
      const formattedChartData: any[] = [];

      if (contribsData && contribsData.length > 0) {
        const dailyMap: { [dateStr: string]: number } = {};

        contribsData.forEach((item) => {
          const rawDate = item.payment_date || item.created_at;
          if (!rawDate) return;
          const dateObj = new Date(rawDate);
          if (isNaN(dateObj.getTime())) return;

          const dayKey = dateObj.toISOString().split('T')[0];
          const amount = Number(item.amount || 0);

          if (item.status === 'Validé' || item.status === 'Valide' || !item.status) {
            totalFunds += amount;
            dailyMap[dayKey] = (dailyMap[dayKey] || 0) + amount;
          }
        });

        const sortedDays = Object.keys(dailyMap).sort();
        let previousTotal = 0;

        sortedDays.forEach((dayKey, index) => {
          const currentTotal = dailyMap[dayKey];
          const dateObj = parseISO(dayKey);
          const formattedDay = format(dateObj, 'dd MMM', { locale: fr });
          const capitalizedDay = formattedDay.charAt(0).toUpperCase() + formattedDay.slice(1);

          let growth = 0;
          if (index > 0) {
            if (previousTotal > 0) {
              growth = ((currentTotal - previousTotal) / previousTotal) * 100;
            } else if (currentTotal > 0) {
              growth = 100;
            }
          }

          formattedChartData.push({
            name: capitalizedDay,
            total: currentTotal,
            growth: Math.round(growth)
          });

          previousTotal = currentTotal;
        });
      }

      // Fallback si pas de données quotidiennes directes
      if (formattedChartData.length === 0) {
        const { data: summaryData } = await supabase
          .from('monthly_contributions_summary')
          .select('month_start, total_amount')
          .order('month_start', { ascending: true });

        if (summaryData) {
          let previousTotal = 0;
          summaryData.forEach((item, index) => {
            const currentTotal = Number(item.total_amount);
            totalFunds += currentTotal;
            const monthYear = format(parseISO(item.month_start), 'MMM yyyy', { locale: fr });
            const capitalizedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
            
            let growth = 0;
            if (index > 0) {
              if (previousTotal > 0) {
                growth = ((currentTotal - previousTotal) / previousTotal) * 100;
              } else if (currentTotal > 0) {
                growth = 100;
              }
            }

            formattedChartData.push({
              name: capitalizedMonth,
              total: currentTotal,
              growth: Math.round(growth)
            });
            
            previousTotal = currentTotal;
          });
        }
      }

      // Fetch Upcoming Events
      const today = new Date().toISOString();
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(4);

      setStats({
        totalMembers: totalCount || 0,
        activeMembers: activeCount || 0,
        totalFunds,
      });
      
      setChartData(formattedChartData);
      if (eventsData) setUpcomingEvents(eventsData);

    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('dashboard_admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sass_contributions' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchStats]);



  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.growth >= 0;
      return (
        <div className="bg-white/95 dark:bg-gray-900/95 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-2xl">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 tracking-widest uppercase">{label}</p>
          <div className="flex items-end gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#1DC4E9] shadow-[0_0_12px_rgba(29,196,233,0.8)] animate-pulse"></div>
              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                {payload[0].value.toLocaleString()} <span className="text-sm font-semibold text-gray-400 ml-1">FCFA</span>
              </p>
            </div>
            {data.growth !== undefined && data.growth !== 0 && (
              <div className={`flex items-center text-xs font-extrabold px-2.5 py-1 rounded-lg mb-0.5 ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(data.growth)}%
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Vue d'ensemble</h1>
        {loading && <Loader2 className="animate-spin text-primary" size={20} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Membres" 
          value={stats.totalMembers.toString()} 
          icon={Users} 
          gradientClass="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-900/20 dark:to-indigo-900/20"
        />
        <StatCard 
          title="Membres Actifs" 
          value={stats.activeMembers.toString()} 
          icon={TrendingUp} 
          trend="up" 
          trendValue={stats.totalMembers > 0 ? `${Math.round((stats.activeMembers / stats.totalMembers) * 100)}%` : '0%'} 
          gradientClass="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-900/20 dark:to-teal-900/20"
        />
        <StatCard 
          title="Fonds Collectés (Sass)" 
          value={`${stats.totalFunds.toLocaleString()} F`} 
          icon={Wallet} 
          gradientClass="bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-900/20 dark:to-orange-900/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Graphique d'évolution */}
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div>
              <h3 className="text-xl font-bold text-foreground">Évolution des Contributions</h3>
              <p className="text-sm text-muted-foreground mt-1">Aperçu quotidien des encaissements Sass</p>
            </div>
          </div>
          <div className="flex-1 w-full h-full min-h-[300px] relative z-10">
            {chartData.length > 0 ? (
              <div style={{ width: '100%', height: 300, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1DC4E9" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#1DC4E9" stopOpacity={0}/>
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#1DC4E9" floodOpacity="0.3"/>
                    </filter>
                  </defs>
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={15} />
                  <YAxis 
                    stroke="#a1a1aa" 
                    fontSize={11} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    dx={-15}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" className="dark:stroke-gray-800/40" />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e4e4e7', strokeWidth: 2, strokeDasharray: '4 4' }} />
                  <Area type="natural" dataKey="total" stroke="#1DC4E9" strokeWidth={5} fillOpacity={1} fill="url(#colorTotal)" filter="url(#shadow)" activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff', fill: '#1DC4E9' }} />
                </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed border-border rounded-lg bg-secondary/20">
                <p>Aucune donnée de contribution disponible pour le graphique</p>
              </div>
            )}
          </div>
        </div>

        {/* Prochains Événements */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm min-h-[400px] relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">Prochains Événements</h3>
            </div>
            
            <div className="space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="group relative flex items-start space-x-4 p-4 rounded-xl bg-background/50 border border-border/50 hover:bg-secondary/50 hover:border-primary/20 transition-all duration-300">
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white shadow-md transition-transform duration-300 group-hover:scale-105 ${
                      event.event_type === 'Assemblée Générale' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                      event.event_type === 'Dahira Mensuel' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                      event.event_type === 'Réunion Bureau' ? 'bg-gradient-to-br from-purple-500 to-violet-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{isValid(parseISO(event.event_date)) ? format(parseISO(event.event_date), 'MMM', { locale: fr }) : '?'}</span>
                      <span className="text-xl font-black leading-none mt-0.5">{isValid(parseISO(event.event_date)) ? format(parseISO(event.event_date), 'dd') : '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{event.title}</h4>
                      <p className="text-sm font-medium text-primary/80 mt-1">{event.event_type}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Clock size={12} className="mr-1 opacity-70" />
                          {isValid(parseISO(event.event_date)) ? format(parseISO(event.event_date), 'HH:mm') : '--:--'}
                        </span>
                        {event.location && (
                          <span className="flex items-center line-clamp-1">
                            <MapPin size={12} className="mr-1 opacity-70" />
                            {event.location}
                          </span>
                        )}
                      </div>
                      {event.maps_link && (
                        <a href={event.maps_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-3 text-xs font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-lg transition-colors">
                          <ExternalLink size={12} className="mr-1.5" />
                          Ouvrir la carte
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center bg-secondary/20 rounded-xl border border-dashed border-border">
                  <Calendar className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aucun événement prévu.</p>
                  <p className="text-xs mt-1 opacity-70">L'agenda est dégagé pour le moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
