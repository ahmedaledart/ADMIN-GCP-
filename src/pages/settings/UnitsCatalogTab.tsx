import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { UnitsCatalog } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

export default function UnitsCatalogTab() {
  const { adminUser } = useAuthStore();
  const [units, setUnits] = useState<UnitsCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<UnitsCatalog>>({
    unit_code: '', unit_ar: '', unit_en: '', is_active: true
  });

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setLoading(true);
    const { data } = await supabase.from('units_catalog').select('*').order('unit_code');
    if (data) setUnits(data);
    setLoading(false);
  };

  const handleOpenModal = (item?: UnitsCatalog) => {
    if (item) {
      setForm(item);
    } else {
      setForm({ unit_code: '', unit_ar: '', unit_en: '', is_active: true });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.unit_code || !form.unit_ar || !form.unit_en) return;

    setSaving(true);
    setError(null);

    // implicit exists check check
    if (!form.id) {
      const { data: existing } = await supabase.from('units_catalog').select('id').eq('unit_code', form.unit_code).single();
      if (existing) {
        setError('هذا الكود موجود مسبقاً');
        setSaving(false);
        return;
      }
    }

    const payload = {
      unit_code: form.unit_code,
      unit_ar: form.unit_ar,
      unit_en: form.unit_en,
      is_active: form.is_active,
      updated_at: new Date().toISOString()
    };

    let result;
    if (form.id) {
      result = await supabase.from('units_catalog').update(payload).eq('id', form.id);
    } else {
      result = await supabase.from('units_catalog').insert([{ ...payload, created_at: new Date().toISOString() }]);
    }

    if (result.error) {
      console.error(result.error);
      setError('حدث خطأ أثناء الحفظ');
    } else {
      setIsModalOpen(false);
      fetchUnits();
    }
    setSaving(false);
  };

  const toggleStatus = async (item: UnitsCatalog) => {
    const { error } = await supabase.from('units_catalog').update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (!error) {
      setUnits(units.map(u => u.id === item.id ? { ...u, is_active: !item.is_active } : u));
    }
  };

  const handleDelete = async (id: string) => {
    if (adminUser?.role !== 'super_admin') {
      alert("لا يمكن الحذف إلا للأدمن الرئيسي. يرجى استخدام التعطيل بدلاً من ذلك.");
      return;
    }
    if (window.confirm('هل أنت متأكد من الحذف النهائي لهذه الوحدة؟')) {
      await supabase.from('units_catalog').delete().eq('id', id);
      setUnits(units.filter(u => u.id !== id));
    }
  };

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">إدارة الوحدات المرجعية</h2>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
          <Plus size={18} />
          إضافة وحدة
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-lg shadow border dark:border-dark-border overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 dark:bg-dark-bg text-slate-600 dark:text-slate-400 border-b dark:border-dark-border">
            <tr>
              <th className="px-4 py-3 font-medium">الكود</th>
              <th className="px-4 py-3 font-medium">الاسم</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3 w-32 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700 dark:text-slate-300">
            {units.map(item => (
              <tr key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{item.unit_code}</td>
                <td className="px-4 py-3">{item.unit_ar} / {item.unit_en}</td>
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
            {units.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">لا توجد وحدات مضافة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-dark-bg">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{form.id ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}</h3>
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
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الكود (مثال: barrel) *</label>
                  <input required type="text" value={form.unit_code} onChange={e => setForm({...form, unit_code: e.target.value})} className="w-full border dark:border-dark-border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم بالعربية (مثال: برميل) *</label>
                  <input required type="text" value={form.unit_ar} onChange={e => setForm({...form, unit_ar: e.target.value})} className="w-full border dark:border-dark-border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم بالإنجليزية (مثال: Barrel) *</label>
                  <input required type="text" value={form.unit_en} onChange={e => setForm({...form, unit_en: e.target.value})} className="w-full border dark:border-dark-border rounded-lg px-3 py-2" />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="unit_is_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 text-primary-600 rounded" />
                  <label htmlFor="unit_is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">مفعل (يظهر في القوائم)</label>
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
