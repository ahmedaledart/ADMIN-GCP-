import { useState, useEffect, FormEvent, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Commodity } from '../types';
import { useAuthStore } from '../store/authStore';
import { Search, Edit2, Check, X, Filter, Plus, Upload, AlertCircle, FileText } from 'lucide-react';
import Papa from 'papaparse';

const ALLOWED_SECTORS = ['energy', 'metals', 'commodities', 'forex', 'indices', 'shipping'];

export default function Prices() {
  const { adminUser } = useAuthStore();
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'list' | 'import'>('list');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  
  // Edit & Add State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Commodity>>({});
  const [saving, setSaving] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Commodity>>({
    symbol: '', name_ar: '', name_en: '', sector: 'energy', price: 0, unit: '', source: '', status: 'active', is_visible: true
  });

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{added: number, updated: number, failed: number} | null>(null);

  useEffect(() => {
    fetchCommodities();
  }, []);

  const fetchCommodities = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('commodities')
        .select('*')
        .order('sector')
        .order('symbol')
        .limit(50);
        
      if (err) throw err;
      setCommodities(data || []);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب بيانات الأسعار');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: Commodity) => {
    setEditingId(item.id);
    setEditForm({
      price: item.price,
      status: item.status,
      is_visible: item.is_visible
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (item: Commodity) => {
    if (!adminUser?.can_manage_prices && adminUser?.role !== 'super_admin') {
      alert("ليس لديك صلاحية لتعديل الأسعار");
      return;
    }

    if (!editForm.price || editForm.price <= 0) {
       alert("السعر غير صالح");
       return;
    }
    
    try {
      setSaving(true);
      
      const newPrice = Number(editForm.price);
      const oldPrice = item.price;
      
      let previous_price = oldPrice;
      let change_value = null;
      let change_percent = null;
      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      
      if (newPrice !== oldPrice) {
        change_value = newPrice - oldPrice;
        change_percent = oldPrice ? (change_value / oldPrice) * 100 : 0;
        trend = newPrice > oldPrice ? 'up' : 'down';
      } else {
        previous_price = item.previous_price || previous_price;
        change_value = item.change_value;
        change_percent = item.change_percent;
        trend = item.trend;
      }
      
      const updateData = {
        price: newPrice,
        previous_price,
        change_value,
        change_percent,
        trend,
        status: editForm.status,
        is_visible: editForm.is_visible,
        updated_at: new Date().toISOString()
      };
      
      const { error: err } = await supabase
        .from('commodities')
        .update(updateData)
        .eq('id', item.id);
        
      if (err) throw err;
      
      setCommodities(prev => prev.map(c => c.id === item.id ? { ...c, ...updateData } : c));
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminUser?.can_manage_prices && adminUser?.role !== 'super_admin') {
      alert("ليس لديك صلاحية لإضافة الأسعار");
      return;
    }

    try {
      setSaving(true);
      const symbol = addForm.symbol?.toUpperCase();
      
      // Check duplicate
      const { data: existing } = await supabase.from('commodities').select('id').eq('symbol', symbol).single();
      if (existing) {
        alert('هذا الرمز موجود مسبقاً');
        return;
      }

      const payload = {
        ...addForm,
        symbol,
        change_value: 0,
        change_percent: 0,
        trend: 'neutral',
        previous_price: addForm.price,
        updated_at: new Date().toISOString()
      };

      const { error: err } = await supabase.from('commodities').insert([payload]);
      if (err) throw err;

      setIsAddModalOpen(false);
      setAddForm({
        symbol: '', name_ar: '', name_en: '', sector: 'energy', price: 0, unit: '', source: '', status: 'active', is_visible: true
      });
      fetchCommodities();

    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء الإضافة');
    } finally {
      setSaving(false);
    }
  };

  // CSV Import Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Validate headers loosely and create mapped preview
        const data = results.data.filter((row: any) => row.symbol && row.price);
        setImportData(data);
        setImportResult(null);
      },
      error: (error) => {
        alert("خطأ في قراءة الملف: " + error.message);
      }
    });
  };

  const applyImport = async () => {
    if (!adminUser?.can_import_prices && adminUser?.role !== 'super_admin') {
      alert("ليس لديك صلاحية لاستيراد الأسعار");
      return;
    }

    if (importData.length === 0) return;

    try {
      setImporting(true);
      
      // We will prepare rows. Papa.parsing keeps multiple duplicate symbols if exists in csv, 
      // the prompt requires using the last one.
      const rowMap = new Map();
      importData.forEach((row: any) => {
        rowMap.set(row.symbol.toUpperCase(), row);
      });
      
      const uniqueRows = Array.from(rowMap.values());
      const now = new Date().toISOString();

      // Fetch existing commodities to calculate previous_price and changes
      const { data: existingRecords, error: fetchErr } = await supabase
        .from('commodities')
        .select('symbol, price, previous_price, change_value, change_percent, trend');

      if (fetchErr) throw fetchErr;

      const existingMap = new Map();
      existingRecords?.forEach(r => existingMap.set(r.symbol, r));

      const rowsToUpsert = uniqueRows.map(row => {
        const symbol = row.symbol.toUpperCase();
        const price = Number(row.price) || 0;
        
        const existing = existingMap.get(symbol);
        
        let previous_price = price;
        let change_value = 0;
        let change_percent = 0;
        let trend = 'neutral';

        if (existing) {
          if (existing.price !== price) {
            previous_price = existing.price;
            change_value = price - existing.price;
             change_percent = previous_price ? (change_value / previous_price) * 100 : 0;
             trend = price > previous_price ? 'up' : 'down';
          } else {
            previous_price = existing.previous_price || price;
            change_value = existing.change_value;
            change_percent = existing.change_percent;
            trend = existing.trend;
          }
        }

        // Sector lowercase
        const sector = (row.sector || 'commodities').toLowerCase();
        
        return {
          symbol,
          name_ar: row.name_ar || (existing ? undefined : 'غير مسمى'),
          name_en: row.name_en || (existing ? undefined : 'Unnamed'),
          sector: ALLOWED_SECTORS.includes(sector) ? sector : 'commodities',
          price,
          unit: row.unit || undefined,
          source: row.source || undefined,
          previous_price,
          change_value,
          change_percent,
          trend,
          updated_at: now
        };
      });

      // Upsert
      const { error: upsertErr } = await supabase
        .from('commodities')
        .upsert(rowsToUpsert, { onConflict: 'symbol' });

      if (upsertErr) throw upsertErr;

      // Determine added vs updated count. We don't have perfect metrics returned by upsert easily in JS client,
      // so approximate based on our map.
      let added = 0;
      let updated = 0;
      uniqueRows.forEach(row => {
        if (existingMap.has(row.symbol.toUpperCase())) updated++;
        else added++;
      });

      setImportResult({ added, updated, failed: 0 });
      setImportData([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh list
      fetchCommodities();

    } catch (err: any) {
      console.error(err);
      alert("خطأ أثناء الاستيراد");
      setImportResult({ added: 0, updated: 0, failed: importData.length });
    } finally {
      setImporting(false);
    }
  };

  const filtered = commodities.filter(c => {
    const matchesSearch = c.symbol.toLowerCase().includes(search.toLowerCase()) || 
                          c.name_ar.includes(search) || 
                          (c.name_en && c.name_en.toLowerCase().includes(search.toLowerCase()));
    const matchesSector = sectorFilter === 'all' || c.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const canImport = adminUser?.role === 'super_admin' || adminUser?.can_import_prices;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">إدارة الأسعار</h1>
        
        <div className="flex gap-2">
          {canImport && (
            <button 
              onClick={() => setActiveTab(activeTab === 'list' ? 'import' : 'list')}
              className="flex items-center gap-2 bg-white border text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition"
            >
              {activeTab === 'list' ? <Upload size={18} /> : <Search size={18} />}
              {activeTab === 'list' ? 'استيراد CSV' : 'عودة للقائمة'}
            </button>
          )}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <Plus size={18} />
            إضافة يدوياً
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
      <>
        <div className="flex gap-4 w-full sm:w-auto bg-white p-4 rounded-xl border">
          <div className="relative flex-1 sm:w-64 max-w-sm">
            <Search className="absolute right-3 top-2.5 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="بحث بالرمز أو الاسم..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute right-3 top-2.5 text-slate-400" size={20} />
            <select 
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none appearance-none bg-white min-w-40"
            >
              <option value="all">كل القطاعات</option>
              {ALLOWED_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
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
                     <th className="px-4 py-3">الرمز</th>
                     <th className="px-4 py-3">الاسم</th>
                     <th className="px-4 py-3">القطاع</th>
                     <th className="px-4 py-3">السعر الحالي</th>
                     <th className="px-4 py-3 text-center">تحديث</th>
                     <th className="px-4 py-3 text-center">الحالة</th>
                     <th className="px-4 py-3 text-center">الظهور</th>
                     <th className="px-4 py-3 text-center">إجراءات</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filtered.map(item => {
                     const isEditing = editingId === item.id;
                     return (
                       <tr key={item.id} className="hover:bg-slate-50/50">
                         <td className="px-4 py-3 font-medium font-mono text-slate-900" dir="ltr">{item.symbol}</td>
                         <td className="px-4 py-3 text-slate-800">{item.name_ar}</td>
                         <td className="px-4 py-3">
                           <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs">{item.sector}</span>
                         </td>
                         <td className="px-4 py-3 font-mono font-medium" dir="ltr">
                           {isEditing ? (
                             <input 
                               type="number" 
                               step="0.0001"
                               value={editForm.price}
                               onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                               className="w-24 px-2 py-1 border rounded"
                             />
                           ) : (
                             <span className={item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : ''}>
                               {item.price}
                             </span>
                           )}
                         </td>
                         <td className="px-4 py-3 text-center text-slate-500 text-xs">
                           {new Date(item.updated_at).toLocaleString('ar-SA', { hour12: false, hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}
                         </td>
                         <td className="px-4 py-3 text-center">
                           {isEditing ? (
                             <select 
                               value={editForm.status}
                               onChange={e => setEditForm({...editForm, status: e.target.value as any})}
                               className="px-2 py-1 border rounded text-xs"
                             >
                               <option value="active">نشط</option>
                               <option value="suspended">معلق</option>
                               <option value="closed">مغلق</option>
                             </select>
                           ) : (
                             <span className={`px-2 py-1 rounded-full text-xs ${
                               item.status === 'active' ? 'bg-green-100 text-green-700' : 
                               item.status === 'suspended' ? 'bg-orange-100 text-orange-700' : 
                               'bg-slate-100 text-slate-700'
                             }`}>
                               {item.status === 'active' ? 'نشط' : item.status === 'suspended' ? 'معلق' : 'مغلق'}
                             </span>
                           )}
                         </td>
                         <td className="px-4 py-3 text-center">
                           {isEditing ? (
                             <input 
                               type="checkbox" 
                               checked={editForm.is_visible}
                               onChange={e => setEditForm({...editForm, is_visible: e.target.checked})}
                               className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                             />
                           ) : (
                             item.is_visible ? 
                               <span className="text-green-500 font-bold block text-center">✓</span> : 
                               <span className="text-slate-300 font-bold block text-center">—</span>
                           )}
                         </td>
                         <td className="px-4 py-3 text-center">
                           <div className="flex items-center justify-center gap-2">
                             {isEditing ? (
                               <>
                                 <button onClick={cancelEdit} disabled={saving} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200">
                                   <X size={16} />
                                 </button>
                                 <button onClick={() => saveEdit(item)} disabled={saving} className="p-1.5 text-white bg-primary-600 hover:bg-primary-700 rounded-md">
                                   <Check size={16} />
                                 </button>
                               </>
                             ) : (
                               <button onClick={() => startEdit(item)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md">
                                 <Edit2 size={16} />
                               </button>
                             )}
                           </div>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
              </table>
              {filtered.length === 0 && (
                 <div className="p-8 text-center text-slate-500">لا يوجد بيانات مطابقة</div>
              )}
             </div>
          </div>
        )}
      </>
      )}

      {/* Import CSV Tab */}
      {activeTab === 'import' && canImport && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="mb-6 border-b pb-4">
            <h2 className="text-lg font-bold mb-2">استيراد الأسعار من ملف CSV</h2>
            <p className="text-sm text-slate-600">
              يجب أن يحتوي الملف على الأعمدة التالية كصف أول (Header):
              <br/>
              <code className="bg-slate-100 px-2 py-1 rounded text-primary-700 font-mono text-xs inline-block mt-2" dir="ltr">symbol, name_ar, name_en, sector, price, unit, source</code>
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileText className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">اضغط لاختيار ملف</span></p>
                        <p className="text-xs text-slate-500">CSV فقط</p>
                    </div>
                    <input 
                      type="file" 
                      accept=".csv" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload} 
                    />
                </label>
            </div>

            {importData.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex justify-between items-center">
                  <span>تم العثور على {importData.length} صف صالح</span>
                  <button 
                    onClick={applyImport} 
                    disabled={importing}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-primary-700 disabled:opacity-50"
                  >
                    {importing ? 'جاري الاستيراد...' : 'تأكيد الاستيراد'}
                  </button>
                </h3>
                <div className="border rounded-lg max-h-60 overflow-y-auto bg-slate-50 p-2">
                   <table className="w-full text-xs text-right">
                     <thead>
                       <tr className="text-slate-500 border-b">
                         <th className="py-2 px-2">الرمز</th>
                         <th className="py-2 px-2">الاسم</th>
                         <th className="py-2 px-2">القطاع</th>
                         <th className="py-2 px-2">السعر الجديد</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {importData.slice(0, 10).map((row, i) => (
                           <tr key={i}>
                             <td className="py-2 px-2 font-mono" dir="ltr">{row.symbol}</td>
                             <td className="py-2 px-2">{row.name_ar}</td>
                             <td className="py-2 px-2">{row.sector}</td>
                             <td className="py-2 px-2 font-mono" dir="ltr">{row.price}</td>
                           </tr>
                        ))}
                     </tbody>
                   </table>
                   {importData.length > 10 && <div className="text-center py-2 text-slate-400">...و {importData.length - 10} حقول أخرى</div>}
                </div>
              </div>
            )}

            {importResult && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex gap-3">
                <Check className="mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold">اكتمل الاستيراد</h4>
                  <ul className="text-sm mt-1 list-disc list-inside">
                    <li>تم إضافة: {importResult.added}</li>
                    <li>تم تحديث: {importResult.updated}</li>
                    <li>فشل: {importResult.failed}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">إضافة سعر جديد يدوياً</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <form id="add-commodity-form" onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الرمز (Symbol) *</label>
                    <input type="text" required dir="ltr" placeholder="BTC/USD"
                      value={addForm.symbol} onChange={e => setAddForm({...addForm, symbol: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-primary-500 outline-none uppercase font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">القطاع *</label>
                    <select value={addForm.sector} onChange={e => setAddForm({...addForm, sector: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-primary-500 outline-none bg-white">
                      {ALLOWED_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم بالعربي *</label>
                    <input type="text" required value={addForm.name_ar} onChange={e => setAddForm({...addForm, name_ar: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم بالإنجليزي *</label>
                    <input type="text" required dir="ltr" value={addForm.name_en} onChange={e => setAddForm({...addForm, name_en: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-primary-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">السعر الحالي *</label>
                    <input type="number" step="0.0001" required value={addForm.price} onChange={e => setAddForm({...addForm, price: Number(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2 font-mono focus:ring-primary-500 outline-none" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الوحدة (Unit)</label>
                    <input type="text" value={addForm.unit || ''} onChange={e => setAddForm({...addForm, unit: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-primary-500 outline-none" placeholder="oz, barrel..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">المصدر (Source)</label>
                    <input type="text" value={addForm.source || ''} onChange={e => setAddForm({...addForm, source: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-primary-500 outline-none" placeholder="Bloomberg, OANDA..." />
                  </div>
                </div>
                
                <div className="flex gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="add_visible" checked={addForm.is_visible} onChange={e => setAddForm({...addForm, is_visible: e.target.checked})}
                      className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
                    <label htmlFor="add_visible" className="text-sm font-medium text-slate-700">تفعيل الظهور للزوار</label>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t flex justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)} 
                className="px-4 py-2 border rounded-lg text-sm bg-white hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                form="add-commodity-form" 
                disabled={saving} 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
