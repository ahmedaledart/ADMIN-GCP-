import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { SectorCatalog } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Plus, Edit2, Trash2, X, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';

export default function SectorsCatalogTab() {
  const { adminUser } = useAuthStore();
  const [sectors, setSectors] = useState<SectorCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<SectorCatalog>>({
    sector_code: '', name_ar: '', name_en: '', description: '', sort_order: 0, is_active: true
  });

  useEffect(() => {
    fetchSectors();
  }, []);

  const fetchSectors = async () => {
    setLoading(true);
    const { data } = await supabase.from('sectors_catalog').select('*').order('sort_order', { ascending: true });
    if (data) setSectors(data);
    setLoading(false);
  };

  const handleOpenModal = (item?: SectorCatalog) => {
    if (item) {
      setForm(item);
    } else {
      setForm({ sector_code: '', name_ar: '', name_en: '', description: '', sort_order: sectors.length * 10, is_active: true });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sector_code || !form.name_ar || !form.name_en) return;

    const formattedCode = form.sector_code.trim().toLowerCase().replace(/\s+/g, '');

    setSaving(true);
    setError(null);

    // Ensure no spaces in code
    if (formattedCode !== form.sector_code.trim().toLowerCase() && !/^[a-z0-9_]+$/.test(formattedCode)) {
      setError('يجب ألا يحتوي كود القطاع على مسافات أو أحرف خاصة (مسموح: حروف إنجليزية، أرقام، _ )');
      setSaving(false);
      return;
    }

    // Check duplicate code
    if (!form.id) {
      const { data: existing } = await supabase.from('sectors_catalog').select('id').eq('sector_code', formattedCode).single();
      if (existing) {
        setError('كود القطاع موجود مسبقاً');
        setSaving(false);
        return;
      }
    }

    const payload = {
      sector_code: formattedCode,
      name_ar: form.name_ar,
      name_en: form.name_en,
      description: form.description || '',
      sort_order: Number(form.sort_order || 0),
      is_active: form.is_active,
      updated_at: new Date().toISOString()
    };

    let resultError;

    if (form.id) {
      const { error: updateError } = await supabase.from('sectors_catalog').update(payload).eq('id', form.id);
      resultError = updateError;
    } else {
      const { error: insertError } = await supabase.from('sectors_catalog').insert([{ ...payload, created_at: new Date().toISOString() }]);
      resultError = insertError;
    }

    if (resultError) {
      console.error(resultError);
      if (resultError.code === '23505') {
        setError('كود القطاع موجود مسبقًا.');
      } else {
        setError('حدث خطأ أثناء الحفظ');
      }
    } else {
      setIsModalOpen(false);
      fetchSectors();
    }
    setSaving(false);
  };

  const toggleStatus = async (item: SectorCatalog) => {
    const { error } = await supabase.from('sectors_catalog').update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (!error) {
      setSectors(sectors.map(c => c.id === item.id ? { ...c, is_active: !item.is_active } : c));
    }
  };

  const handleDelete = async (id: string) => {
    if (adminUser?.role !== 'super_admin') {
      alert("لا يمكن الحذف إلا للأدمن الرئيسي. يرجى استخدام التعطيل بدلاً من ذلك.");
      return;
    }
    if (window.confirm('يفضل تعطيل النوع بدل حذفه حتى لا تتأثر السلع المرتبطة به.\n\nهل أنت متأكد من الحذف النهائي لهذا القطاع؟')) {
      const { error } = await supabase.from('sectors_catalog').delete().eq('id', id);
      if (error) {
        alert('حدث خطأ أثناء الحذف، قد يكون مرتبطاً ببيانات أخرى.');
      } else {
        setSectors(sectors.filter(c => c.id !== id));
      }
    }
  };

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">إدارة أنواع السلع (القطاعات)</h2>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
          <Plus size={18} />
          إضافة قطاع
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-lg shadow border dark:border-dark-border overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 dark:bg-dark-bg text-slate-600 dark:text-slate-400 border-b dark:border-dark-border">
            <tr>
              <th className="px-4 py-3 font-medium w-16">الترتيب</th>
              <th className="px-4 py-3 font-medium">كود القطاع</th>
              <th className="px-4 py-3 font-medium">الاسم بالعربية</th>
              <th className="px-4 py-3 font-medium">الاسم بالإنجليزية</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3 w-32 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700 dark:text-slate-300">
            {sectors.map(item => (
              <tr key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                <td className="px-4 py-3 text-center">{item.sort_order}</td>
                <td className="px-4 py-3 font-mono text-xs">{item.sector_code}</td>
                <td className="px-4 py-3 font-semibold">{item.name_ar}</td>
                <td className="px-4 py-3">{item.name_en}</td>
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
            {sectors.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">لا توجد قطاعات مضافة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-dark-bg">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{form.id ? 'تعديل قطاع' : 'إضافة قطاع جديد'}</h3>
              <button disabled={saving} onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
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
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الكود (مثال: metals) *</label>
                    <input required type="text" value={form.sector_code} onChange={e => setForm({...form, sector_code: e.target.value.toLowerCase().replace(/\s+/g, '')})} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 bg-slate-50 dark:bg-dark-bg font-mono text-sm" placeholder="metals" disabled={!!form.id} />
                    {form.id && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">لا يمكن تغيير الكود بعد الإنشاء</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الترتيب (Sort Order) *</label>
                    <input required type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})} className="w-full border dark:border-dark-border rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم بالعربية *</label>
                    <input required type="text" value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} className="w-full border dark:border-dark-border rounded-lg px-3 py-2" placeholder="المعادن" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم بالإنجليزية *</label>
                    <input required type="text" value={form.name_en} onChange={e => setForm({...form, name_en: e.target.value})} className="w-full border dark:border-dark-border rounded-lg px-3 py-2" placeholder="Metals" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الوصف</label>
                  <textarea rows={2} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 resize-none" placeholder="وصف القطاع (اختياري)"></textarea>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 text-primary-600 rounded" />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">مفعل (يظهر في القوائم)</label>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border dark:border-dark-border rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-dark-bg">إلغاء</button>
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
