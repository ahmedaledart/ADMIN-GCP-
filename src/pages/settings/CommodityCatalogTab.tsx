import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { CommodityCatalog } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

const SECTORS = ['energy', 'metals', 'commodities', 'forex', 'indices', 'shipping'];

export default function CommodityCatalogTab() {
  const { adminUser } = useAuthStore();
  const [commodities, setCommodities] = useState<CommodityCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CommodityCatalog>>({
    symbol: '', name_ar: '', name_en: '', sector: 'energy', default_unit: '', is_active: true
  });

  useEffect(() => {
    fetchCommodities();
  }, []);

  const fetchCommodities = async () => {
    setLoading(true);
    const { data } = await supabase.from('commodity_catalog').select('*').order('symbol');
    if (data) setCommodities(data);
    setLoading(false);
  };

  const handleOpenModal = (item?: CommodityCatalog) => {
    if (item) {
      setForm(item);
    } else {
      setForm({ symbol: '', name_ar: '', name_en: '', sector: 'energy', default_unit: '', is_active: true });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.name_ar || !form.name_en || !form.sector || !form.default_unit) return;

    const formattedSymbol = form.symbol.trim().toUpperCase();
    const formattedSector = form.sector.trim().toLowerCase();

    setSaving(true);
    setError(null);

    // Check if symbol exists
    if (!form.id) {
      const { data: existing } = await supabase.from('commodity_catalog').select('id').eq('symbol', formattedSymbol).single();
      if (existing) {
        setSaving(false);
        const confirmUpdate = window.confirm('هذه السلعة موجودة مسبقًا، هل تريد تحديث بياناتها؟');
        if (!confirmUpdate) {
          return;
        }
        setSaving(true);
      }
    }

    const payload = {
      symbol: formattedSymbol,
      name_ar: form.name_ar,
      name_en: form.name_en,
      sector: formattedSector,
      default_unit: form.default_unit,
      is_active: form.is_active,
      updated_at: new Date().toISOString()
    };

    const { error: resultError } = await supabase
      .from('commodity_catalog')
      .upsert(payload, { onConflict: 'symbol' });

    if (resultError) {
      console.error(resultError);
      if (resultError.code === '23505') {
        setError('السلعة موجودة مسبقًا، يمكنك تعديلها من القائمة.');
      } else {
        setError('حدث خطأ أثناء الحفظ');
      }
    } else {
      setIsModalOpen(false);
      fetchCommodities();
      alert('تم حفظ السلعة بنجاح');
    }
    setSaving(false);
  };

  const toggleStatus = async (item: CommodityCatalog) => {
    const { error } = await supabase.from('commodity_catalog').update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (!error) {
      setCommodities(commodities.map(c => c.id === item.id ? { ...c, is_active: !item.is_active } : c));
    }
  };

  const handleDelete = async (id: string) => {
    if (adminUser?.role !== 'super_admin') {
      alert("لا يمكن الحذف إلا للأدمن الرئيسي. يرجى استخدام التعطيل بدلاً من ذلك.");
      return;
    }
    if (window.confirm('هل أنت متأكد من الحذف النهائي لهذه السلعة؟')) {
      await supabase.from('commodity_catalog').delete().eq('id', id);
      setCommodities(commodities.filter(c => c.id !== id));
    }
  };

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">إدارة السلع المرجعية</h2>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
          <Plus size={18} />
          إضافة سلعة
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-600 border-b">
            <tr>
              <th className="px-4 py-3 font-medium">الرمز</th>
              <th className="px-4 py-3 font-medium">الاسم</th>
              <th className="px-4 py-3 font-medium">القطاع</th>
              <th className="px-4 py-3 font-medium">الوحدة الافتراضية</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3 w-32 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {commodities.map(item => (
              <tr key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                <td className="px-4 py-3 font-semibold uppercase">{item.symbol}</td>
                <td className="px-4 py-3">{item.name_ar} - {item.name_en}</td>
                <td className="px-4 py-3 capitalize">{item.sector}</td>
                <td className="px-4 py-3">{item.default_unit}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleStatus(item)} className={`px-2 py-1 text-xs rounded-full ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.is_active ? 'مفعل' : 'معطل'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenModal(item)} className="p-1 text-slate-400 hover:text-blue-600">
                      <Edit2 size={16} />
                    </button>
                    {adminUser?.role === 'super_admin' && (
                      <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {commodities.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">لا توجد سلع مضافة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{form.id ? 'تعديل السلعة' : 'إضافة سلعة جديدة'}</h3>
              <button disabled={saving} onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSave} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg flex gap-2 items-center text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الرمز (Symbol) *</label>
                    <input required type="text" value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value.toUpperCase()})} className="w-full border rounded-lg px-3 py-2 uppercase" placeholder="BRENTOIL" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الوحدة الافتراضية *</label>
                    <input required type="text" value={form.default_unit} onChange={e => setForm({...form, default_unit: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="برميل" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم بالعربية *</label>
                    <input required type="text" value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم بالإنجليزية *</label>
                    <input required type="text" value={form.name_en} onChange={e => setForm({...form, name_en: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">القطاع (Sector) *</label>
                  <select required value={form.sector} onChange={e => setForm({...form, sector: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    {SECTORS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 text-primary-600 rounded" />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700">مفعل (يظهر في القوائم)</label>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50">إلغاء</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                    {saving ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
