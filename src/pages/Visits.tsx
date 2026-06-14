import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { SiteVisit } from '../types';
import { Activity, Calendar, Monitor, Navigation } from 'lucide-react';

export default function Visits() {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [topPages, setTopPages] = useState<{path: string, count: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch latest visits
      const { data: latestRaw, error: err1 } = await supabase
        .from('site_visits')
        .select('*')
        .order('visited_at', { ascending: false })
        .limit(50);
        
      if (err1) throw err1;
      
      // Fetch total count
      const { count: total, error: err2 } = await supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true });
        
      if (err2) throw err2;
      
      // Fetch today count
      const { count: todayCount, error: err3 } = await supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('visited_at', today.toISOString());
        
      if (err3) throw err3;

      setVisits(latestRaw || []);
      setStats({ total: total || 0, today: todayCount || 0 });
      
      // Very basic top pages calculation from recent data (could be grouped in SQL via RPC, but let's do simple UI grouping for now from fetched latest if SQL logic not established). Note: To get accurate top pages over all time requires an RPC. We'll group the recent 50 for the demo.
      const groups = (latestRaw || []).reduce((acc: any, v) => {
        acc[v.path] = (acc[v.path] || 0) + 1;
        return acc;
      }, {});
      
      const sortedTop = Object.keys(groups)
        .map(path => ({ path, count: groups[path] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
        
      setTopPages(sortedTop);

    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب بيانات الزيارات');
    } finally {
      setLoading(false);
    }
  };

  if (loading && visits.length === 0) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">سجل الزيارات</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center gap-4">
          <div className="p-4 rounded-lg bg-blue-100 text-blue-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">إجمالي الزيارات</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.total.toLocaleString('en-US')}</h3>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center gap-4">
          <div className="p-4 rounded-lg bg-emerald-100 text-emerald-600">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">زيارات اليوم</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.today.toLocaleString('en-US')}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 pr-1">
              <Monitor size={18} className="text-slate-500" />
              أحدث الزيارات
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-white text-slate-500 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">المسار</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">الوقـت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visits.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-primary-600" dir="ltr">{v.path}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500" dir="ltr">{v.ip_address || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(v.visited_at).toLocaleString('ar-SA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden h-fit">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 pr-1">
              <Navigation size={18} className="text-slate-500" />
              أكثر الصفحات الأخيرة زيارة
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {topPages.map((page, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="font-mono text-sm text-slate-700 truncate mr-2" dir="ltr">{page.path}</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium min-w-10 text-center">
                    {page.count}
                  </span>
                </div>
              ))}
              {topPages.length === 0 && <p className="text-slate-500 text-sm text-center">لا توجد بيانات كافية</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
