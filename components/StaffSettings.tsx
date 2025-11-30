import React, { useState } from 'react';
import { Staff } from '../types';
import { generateId } from '../utils';
import { Trash2, Plus, Edit2, Check, X, User } from 'lucide-react';

interface Props {
  staffList: Staff[];
  setStaffList: (list: Staff[]) => void;
}

export const StaffSettings: React.FC<Props> = ({ staffList, setStaffList }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Temporary state for editing
  const [formData, setFormData] = useState<Omit<Staff, 'staff_id'>>({
    name: '',
    skill_level: '中',
    start_time: '09:00',
    end_time: '17:00',
    avail_cond_text_day: '',
    avail_cond_text_night: ''
  });

  const handleAdd = () => {
    const newStaff: Staff = {
      staff_id: generateId(),
      name: '新規スタッフ',
      skill_level: '中',
      start_time: '09:00',
      end_time: '22:00',
      avail_cond_text_day: '全日OK',
      avail_cond_text_night: '要相談',
    };
    setStaffList([...staffList, newStaff]);
    startEdit(newStaff);
  };

  const startEdit = (staff: Staff) => {
    setEditingId(staff.staff_id);
    setFormData({
      name: staff.name,
      skill_level: staff.skill_level,
      start_time: staff.start_time,
      end_time: staff.end_time,
      avail_cond_text_day: staff.avail_cond_text_day,
      avail_cond_text_night: staff.avail_cond_text_night,
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    setStaffList(staffList.map(s => 
      s.staff_id === editingId ? { ...s, ...formData } : s
    ));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('本当に削除しますか？')) {
      setStaffList(staffList.filter(s => s.staff_id !== id));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-20">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-stone-700">
        <span>👥</span> バイト属性（パッチ）管理
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {staffList.map(staff => (
          <div key={staff.staff_id} className={`bg-white rounded-lg shadow-sm border-2 overflow-hidden flex flex-col ${editingId === staff.staff_id ? 'border-stone-800 ring-2 ring-stone-200 z-10' : 'border-stone-100'}`}>
            {editingId === staff.staff_id ? (
              <div className="p-4 space-y-3 bg-stone-50 h-full flex flex-col">
                <div>
                  <label className="text-xs font-bold text-stone-500">名前</label>
                  <input name="name" value={formData.name} onChange={handleChange} className="w-full border p-1 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-stone-500">習熟度</label>
                    <select name="skill_level" value={formData.skill_level} onChange={handleChange} className="w-full border p-1 rounded">
                      <option value="高">高 (金)</option>
                      <option value="中">中 (青)</option>
                      <option value="低">低 (緑)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-stone-500">開始可能</label>
                    <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} className="w-full border p-1 rounded" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-500">終了可能</label>
                    <input type="time" name="end_time" value={formData.end_time} onChange={handleChange} className="w-full border p-1 rounded" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-500">条件(昼)</label>
                  <input name="avail_cond_text_day" value={formData.avail_cond_text_day} onChange={handleChange} className="w-full border p-1 rounded text-sm" placeholder="例: 平日のみ" />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-500">条件(夜)</label>
                  <input name="avail_cond_text_night" value={formData.avail_cond_text_night} onChange={handleChange} className="w-full border p-1 rounded text-sm" placeholder="例: 土日OK" />
                </div>
                <div className="mt-auto flex gap-2 pt-2">
                  <button onClick={saveEdit} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 flex justify-center"><Check size={18} /></button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 flex justify-center"><X size={18} /></button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full relative group">
                 <div className={`h-2 w-full ${staff.skill_level === '高' ? 'bg-rose-400' : staff.skill_level === '中' ? 'bg-sky-400' : 'bg-lime-400'}`}></div>
                 <div className="p-4 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg flex items-center gap-1">
                        <User size={16} /> {staff.name}
                      </h3>
                      <span className="text-xs bg-stone-100 px-2 py-1 rounded text-stone-500 border border-stone-200">
                        {staff.skill_level}
                      </span>
                    </div>
                    <div className="text-sm text-stone-600 space-y-1">
                      <p>⏰ {staff.start_time} 〜 {staff.end_time}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-orange-50 text-orange-700 px-1 rounded border border-orange-100">☀️ {staff.avail_cond_text_day || '-'}</span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-1 rounded border border-indigo-100">🌙 {staff.avail_cond_text_night || '-'}</span>
                      </div>
                    </div>
                 </div>
                 <div className="absolute top-4 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => startEdit(staff)} className="p-1.5 bg-white border shadow rounded text-blue-600 hover:bg-blue-50"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(staff.staff_id)} className="p-1.5 bg-white border shadow rounded text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                 </div>
              </div>
            )}
          </div>
        ))}
        
        <button
          onClick={handleAdd}
          className="min-h-[200px] border-2 border-dashed border-stone-300 rounded-lg flex flex-col items-center justify-center text-stone-400 hover:bg-stone-50 hover:border-stone-400 hover:text-stone-600 transition-all"
        >
          <Plus size={40} />
          <span className="mt-2 font-bold">新規追加</span>
        </button>
      </div>
    </div>
  );
};