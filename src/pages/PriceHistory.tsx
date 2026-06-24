import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Download, Search, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { SectorCatalog, CommodityCatalog } from '../types';

export default function PriceHistory() {
  const { adminUser } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sectors, setSectors] = useState<SectorCatalog[]>([]);
  const [catalog, setCatalog] = useState<CommodityCatalog[]>([]);
  
  // Filters
  const [sectorFilter, setSectorFilter] = useState('all');
  const [symbolFilter, setSymbolFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [updateMethodFilter, setUpdateMethodFilter] = useState('all');
  const [adminEmailFilter, setAdminEmailFilter] = useState('');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    fetchCatalogs();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [sectorFilter, symbolFilter, fromDate, toDate, updateMethodFilter, adminEmailFilter, page]);

  const fetchCatalogs = async () => {
    const [sectorsRes, catalogRes] = await Promise.all([
      supabase.from('sectors_catalog').select('*').order('sort_order', { ascending: true }),
      supabase.from('commodity_catalog').select('symbol, name_ar, name_en').eq('is_active', true)
    ]);
    if (sectorsRes.data) setSectors(sectorsRes.data);
    if (catalogRes.data) setCatalog(catalogRes.data);
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase.from('commodity_price_history').select('*', { count: 'exact' });
      
      if (sectorFilter !== 'all') {
        query = query.eq('sector', sectorFilter);
      }
      if (symbolFilter !== 'all') {
        query = query.eq('symbol', symbolFilter);
      }
      if (fromDate) {
        query = query.gte('recorded_at', new Date(fromDate).toISOString());
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        query = query.lte('recorded_at', to.toISOString());
      }
      if (updateMethodFilter !== 'all') {
        query = query.eq('update_method', updateMethodFilter);
      }
      if (adminEmailFilter) {
        query = query.ilike('admin_email', `%${adminEmailFilter}%`);
      }
      
      query = query.order('recorded_at', { ascending: false });
      
      // Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);
      
      const { data, count, error: err } = await query;
      
      if (err) throw err;
      
      setHistory(data || []);
      if (count !== null) {
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      }
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب الأرشيف');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!adminUser?.can_manage_prices && !adminUser?.can_view_reports && adminUser?.role !== 'super_admin') {
      alert("ليس لديك صلاحية التصدير");
      return;
    }
    
    if (!fromDate && !toDate && sectorFilter === 'all') {
      if (!window.confirm('أنت على وشك تصدير كمية كبيرة من البيانات، هل تريد الاستمرار؟\nيفضل تحديد تاريخ أو قطاع قبل التصدير.')) {
        return;
      }
    }
    
    try {
      setLoading(true);
      let query = supabase.from('commodity_price_history').select('*');
      
      if (sectorFilter !== 'all') query = query.eq('sector', sectorFilter);
      if (symbolFilter !== 'all') query = query.eq('symbol', symbolFilter);
      if (fromDate) query = query.gte('recorded_at', new Date(fromDate).toISOString());
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        query = query.lte('recorded_at', to.toISOString());
      }
      if (updateMethodFilter !== 'all') query = query.eq('update_method', updateMethodFilter);
      if (adminEmailFilter) query = query.ilike('admin_email', `%${adminEmailFilter}%`);
      
      query = query.order('recorded_at', { ascending: false });
      
      const { data, error: err } = await query;
      if (err) throw err;
      if (!data || data.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
      }
      
      const rows = data.map(r => ({
        symbol: r.symbol,
        name_ar: r.name_ar,
        name_en: r.name_en,
        sector: r.sector,
        price: r.price,
        previous_price: r.previous_price,
        change_value: r.change_value,
        change_percent: r.change_percent,
        trend: r.trend,
        unit: r.unit,
        source: r.source,
        update_method: r.update_method,
        admin_email: r.admin_email,
        recorded_at: new Date(r.recorded_at).toLocaleString('en-US', { hour12: false })
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'History');
      
      let fileName = 'history';
      if (sectorFilter !== 'all') fileName += `_${sectorFilter}`;
      else fileName += '_all';
      
      if (fromDate || toDate) {
         fileName += `_${fromDate || 'start'}_to_${toDate || 'now'}`;
      } else {
         const today = new Date().toISOString().split('T')[0];
         fileName += `_${today}`;
      }
      fileName += '.xlsx';
      
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">أرشيف الأسعار</h1>
        <button 
          onClick={exportExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Download size={18} />
          تحميل أرشيف Excel
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">القطاع</label>
            <select value={sectorFilter} onChange={e => { setSectorFilter(e.target.value); setPage(1); }} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500 text-sm">
              <option value="all">كل القطاعات</option>
              {sectors.map(s => <option key={s.sector_code} value={s.sector_code}>{s.name_ar}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">السلعة</label>
            <select value={symbolFilter} onChange={e => { setSymbolFilter(e.target.value); setPage(1); }} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500 text-sm">
              <option value="all">كل السلع</option>
              {catalog.map(c => <option key={c.symbol} value={c.symbol}>{c.symbol} - {c.name_ar}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">من تاريخ</label>
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">إلى تاريخ</label>
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">طريقة التحديث</label>
            <select value={updateMethodFilter} onChange={e => { setUpdateMethodFilter(e.target.value); setPage(1); }} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500 text-sm">
              <option value="all">الكل</option>
              <option value="admin">يدوي (Admin)</option>
              <option value="csv">استيراد (CSV)</option>
              <option value="api">آلي (API)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">الأدمن (البريد)</label>
            <input type="text" placeholder="بحث بالبريد" value={adminEmailFilter} onChange={e => { setAdminEmailFilter(e.target.value); setPage(1); }} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                <tr>
                  <th className="px-4 py-3">التاريخ والوقت</th>
                  <th className="px-4 py-3">الرمز</th>
                  <th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">السعر</th>
                  <th className="px-4 py-3 text-center">التغير</th>
                  <th className="px-4 py-3 text-center">الطريقة</th>
                  <th className="px-4 py-3 text-center">الأدمن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500 text-xs" dir="ltr">
                      {new Date(item.recorded_at).toLocaleString('en-US', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-medium font-mono text-slate-900" dir="ltr">{item.symbol}</td>
                    <td className="px-4 py-3 text-slate-800">{item.name_ar}</td>
                    <td className="px-4 py-3 font-mono font-medium" dir="ltr">
                      <span className={item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : ''}>
                        {item.price}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs" dir="ltr">
                      <span className={item.change_value > 0 ? 'text-green-600' : item.change_value < 0 ? 'text-red-600' : 'text-slate-500'}>
                        {item.change_value > 0 ? '+' : ''}{item.change_value} ({item.change_percent}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      <span className={`px-2 py-1 rounded-full ${
                        item.update_method === 'csv' ? 'bg-blue-100 text-blue-700' :
                        item.update_method === 'admin' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.update_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {item.admin_email || '-'}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">لا يوجد بيانات مطابقة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50">السابق</button>
              <span className="px-3 py-1 text-sm text-slate-600">صفحة {page} من {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50">التالي</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
