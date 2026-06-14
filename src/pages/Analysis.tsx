import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { Analysis } from '../types';
import { useAuthStore } from '../store/authStore';
import { Plus, Edit2, Trash2, X, Sparkles } from 'lucide-react';

export default function AnalysisPage() {
  const { adminUser } = useAuthStore();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Analysis | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', asset_symbol: '', author: '', is_published: true });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateAIContent = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("البيانات الخاصة بـ VITE_GEMINI_API_KEY غير متوفرة في بيئة العمل. (قم بإضافتها في المتغيرات ولن تعمل ميزة الذكاء ما لم تقم بذلك)");
      return;
    }
    if (!form.title && !form.asset_symbol) {
      alert("يرجى كتابة العنوان أو رمز السلعة قبل طلب التحليل من الذكاء الاصطناعي.");
      return;
    }

    setGenerating(true);
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      
      let prompt = 'أنت خبير اقتصادي ومحلل أسواق مالية لك خبرة أكثر من 20 عاماً. مطلوب منك كتابة تحليل مالي/اقتصادي دقيق ومختصر واحترافي استناداً إلى المعطيات التالية:\n\n';
      
      if (form.title) prompt += `- العنوان المقترح: ${form.title}\n`;
      if (form.asset_symbol) prompt += `- الأداة المالية: ${form.asset_symbol}\n`;
      if (form.content) prompt += `- رؤوس أقلام إضافية من المحلل: ${form.content}\n`;
      
      prompt += '\nالرجاء كتابة التحليل باللغة العربية، وتقسيمه إلى فقرات مرتبة مع استخدام الـ Markdown. تجنب المقدمات والمجاملات وركز في صلب التحليل الفني والأساسي للسلعة.';

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      if (response && response.text) {
        setForm(prev => ({ ...prev, content: response.text }));
      } else {
        alert("لم يتم إرجاع نتيجة من الذكاء الاصطناعي.");
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي: ' + (err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (err) throw err;
      setAnalyses(data || []);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب التحليلات');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm({ title: '', content: '', asset_symbol: '', author: '', is_published: true });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Analysis) => {
    setEditingItem(item);
    setForm({ 
      title: item.title, 
      content: item.content, 
      asset_symbol: item.asset_symbol || '', 
      author: item.author || '', 
      is_published: item.is_published 
    });
    setIsModalOpen(true);
  };

  const checkPermission = () => {
    if (adminUser?.role !== 'super_admin' && !adminUser?.can_manage_analysis) {
      alert("ليس لديك صلاحية لتنفيذ هذه العملية");
      return false;
    }
    return true;
  };

  const saveAnalysis = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkPermission()) return;
    
    if (!form.title || !form.content) {
       alert("العنوان والمحتوى مطلوبان");
       return;
    }
    
    try {
      setSaving(true);
      
      const payload = {
        title: form.title,
        content: form.content,
        asset_symbol: form.asset_symbol || null,
        author: form.author || null,
        is_published: form.is_published,
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        const { error: err } = await supabase
          .from('analyses')
          .update(payload)
          .eq('id', editingItem.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('analyses')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (err) throw err;
      }
      
      setIsModalOpen(false);
      fetchAnalyses();
      
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const deleteAnalysis = async (id: string, title: string) => {
    if (!checkPermission()) return;
    
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }
    
    try {
      setLoading(true);
      const { error: err } = await supabase.from('analyses').delete().eq('id', id);
      if (err) throw err;
      setAnalyses(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الحذف");
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  }

  const togglePublish = async (item: Analysis) => {
    if (!checkPermission()) return;
    try {
      const newStatus = !item.is_published;
      const { error: err } = await supabase
        .from('analyses')
        .update({ 
          is_published: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
        
      if (err) throw err;
      
      setAnalyses(prev => prev.map(n => n.id === item.id ? { ...n, is_published: newStatus } : n));
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء تغيير الحالة");
    }
  }

  if (loading && analyses.length === 0) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">إدارة التحليلات</h1>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={18} />
          إضافة تحليل
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b">
              <tr>
                <th className="px-4 py-4 w-1/3">العنوان</th>
                <th className="px-4 py-4">السلعة</th>
                <th className="px-4 py-4">المحلل</th>
                <th className="px-4 py-4 text-center">التاريخ</th>
                <th className="px-4 py-4 text-center">الحالة</th>
                <th className="px-4 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analyses.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900">{item.title}</div>
                  </td>
                  <td className="px-4 py-3 font-mono" dir="ltr">{item.asset_symbol || '-'}</td>
                  <td className="px-4 py-3">{item.author || '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-500 text-xs">
                    {new Date(item.created_at).toLocaleString('ar-SA')}
                  </td>
                  <td className="px-4 py-3 text-center">
                     <button
                        onClick={() => togglePublish(item)}
                        className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                          item.is_published ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {item.is_published ? 'منشور' : 'مخفي'}
                      </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 relative">
                      <button onClick={() => openEditModal(item)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md">
                        <Edit2 size={18} />
                      </button>
                      <div className="flex flex-col gap-1 items-center">
                        <button 
                          onClick={() => deleteAnalysis(item.id, item.title)} 
                          className={`p-1.5 rounded-md transition ${deletingId === item.id ? 'bg-red-600 text-white shadow min-w-[70px] text-xs font-bold' : 'text-red-600 hover:bg-red-50'}`}
                        >
                          {deletingId === item.id ? 'تأكيد الحذف' : <Trash2 size={18} />}
                        </button>
                        {deletingId === item.id && (
                          <button onClick={() => setDeletingId(null)} className="text-xs text-slate-500 hover:text-slate-700">إلغاء</button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {analyses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">لا يوجد بيانات</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">{editingItem ? 'تعديل التحليل' : 'تحليل جديد'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <form id="analysis-form" onSubmit={saveAnalysis} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">العنوان *</label>
                  <input 
                    required 
                    type="text" 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">رمز السلعة</label>
                    <input 
                      type="text" 
                      dir="ltr"
                      placeholder="e.g. BTC/USD"
                      value={form.asset_symbol} 
                      onChange={e => setForm({...form, asset_symbol: e.target.value})} 
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">اسم المحلل</label>
                    <input 
                      type="text" 
                      value={form.author} 
                      onChange={e => setForm({...form, author: e.target.value})} 
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none" 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-700">التحليل *</label>
                    <button 
                      type="button"
                      onClick={generateAIContent}
                      disabled={generating}
                      className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-md border border-indigo-200 transition disabled:opacity-50"
                    >
                      {generating ? (
                         <div className="w-3 h-3 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                         <Sparkles size={14} />
                      )}
                      إنشاء بالذكاء الاصطناعي
                    </button>
                  </div>
                  <textarea 
                    required 
                    rows={10} 
                    value={form.content} 
                    onChange={e => setForm({...form, content: e.target.value})} 
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none resize-y" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="is_published" 
                    checked={form.is_published} 
                    onChange={e => setForm({...form, is_published: e.target.checked})} 
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                  />
                  <label htmlFor="is_published" className="text-sm font-medium text-slate-700">نشر فوری</label>
                </div>
              </form>
            </div>
            <div className="p-4 border-t flex justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2 border rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                form="analysis-form" 
                disabled={saving} 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>}
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
