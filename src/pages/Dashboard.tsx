import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart3, 
  Tag, 
  Newspaper, 
  MessageSquare, 
  Eye, 
  Activity,
  Clock
} from 'lucide-react';

interface Stats {
  activeCommodities: number;
  newsCount: number;
  analysisCount: number;
  messagesCount: number;
  todayVisits: number;
  totalVisits: number;
  lastPriceUpdate: string | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Run independent queries in parallel
      const [
        { count: activeCommodities },
        { count: newsCount },
        { count: analysisCount },
        { count: messagesCount },
        { count: totalVisits },
        { count: todayVisits },
        { data: lastPrice }
      ] = await Promise.all([
        supabase.from('commodities').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('news').select('*', { count: 'exact', head: true }),
        supabase.from('analyses').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('site_visits').select('*', { count: 'exact', head: true }),
        supabase.from('site_visits').select('*', { count: 'exact', head: true }).gte('visited_at', today.toISOString()),
        supabase.from('commodities').select('updated_at').order('updated_at', { ascending: false }).limit(1).single()
      ]);

      setStats({
        activeCommodities: activeCommodities || 0,
        newsCount: newsCount || 0,
        analysisCount: analysisCount || 0,
        messagesCount: messagesCount || 0,
        totalVisits: totalVisits || 0,
        todayVisits: todayVisits || 0,
        lastPriceUpdate: lastPrice?.updated_at || null
      });

    } catch (err: any) {
      if (err.code !== 'PGRST116') {
        console.error('Error fetching stats:', err);
        setError('حدث خطأ في تحميل الإحصائيات');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>;
  }

  const statCards = [
    { title: 'السلع النشطة', value: stats?.activeCommodities, icon: Tag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'زيارات اليوم', value: stats?.todayVisits, icon: Eye, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'إجمالي الزيارات', value: stats?.totalVisits, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'الأخبار', value: stats?.newsCount, icon: Newspaper, color: 'text-orange-600', bg: 'bg-orange-100' },
    { title: 'التحليلات', value: stats?.analysisCount, icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { title: 'الرسائل', value: stats?.messagesCount, icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">نظرة عامة</h1>
        {stats?.lastPriceUpdate && (
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-3 py-1.5 rounded-full border shadow-sm">
            <Clock size={16} />
            <span>آخر تحديث للأسعار: {new Date(stats.lastPriceUpdate).toLocaleString('ar-SA')}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border p-6 flex items-center gap-4">
            <div className={`p-4 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-900">{stat.value?.toLocaleString('en-US')}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
