import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';
import { useAuthStore } from '../store/authStore';
import { Trash2, Mail, MailOpen } from 'lucide-react';

export default function Messages() {
  const { adminUser } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (err) throw err;
      setMessages(data || []);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب الرسائل');
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = () => {
    if (adminUser?.role !== 'super_admin' && !adminUser?.can_manage_messages) {
      alert("ليس لديك صلاحية لتنفيذ هذه العملية");
      return false;
    }
    return true;
  };

  const markAsRead = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return; // already read
    if (!checkPermission()) return;
    
    try {
      const { error: err } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', id);
        
      if (err) throw err;
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    } catch (err) {
      console.error(err);
      alert('حدث خطأ');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!checkPermission()) return;
    if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    
    try {
      const { error: err } = await supabase.from('messages').delete().eq('id', id);
      if (err) throw err;
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  if (loading && messages.length === 0) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">صندوق الرسائل</h1>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="divide-y divide-slate-100">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`p-6 hover:bg-slate-50 transition-colors ${!msg.is_read ? 'bg-primary-50/30' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1" onClick={() => markAsRead(msg.id, msg.is_read)}>
                  <div className={`mt-1 ${msg.is_read ? 'text-slate-400' : 'text-primary-600'}`}>
                    {msg.is_read ? <MailOpen size={20} /> : <Mail size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`text-base flex-1 ${!msg.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {msg.sender_name}
                      </h3>
                      <span className="text-xs text-slate-500 whitespace-nowrap" dir="ltr">
                        {new Date(msg.created_at).toLocaleString('ar-SA')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-3" dir="ltr">{msg.sender_email}</p>
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold text-slate-800 mb-2">{msg.subject}</h4>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => deleteMessage(msg.id)} 
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <MailOpen size={32} className="text-slate-300" />
              <p>لا توجد رسائل</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
