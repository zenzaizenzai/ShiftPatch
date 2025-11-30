import React, { useState } from 'react';
import { Department } from '../types';
import { generateId } from '../utils';
import { Trash2, Plus, Edit2, Check, X, AlertCircle } from 'lucide-react';

interface Props {
  departments: Department[];
  setDepartments: (depts: Department[]) => void;
}

const COLORS = [
  '#fca5a5', // red-300
  '#fdba74', // orange-300
  '#fde047', // yellow-300
  '#bef264', // lime-300
  '#67e8f9', // cyan-300
  '#a5b4fc', // indigo-300
  '#f0abfc', // fuchsia-300
  '#cbd5e1', // slate-300
];

export const DepartmentSettings: React.FC<Props> = ({ departments, setDepartments }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLORS[0]);

  const handleAdd = () => {
    const newDept: Department = {
      dept_id: generateId(),
      name: '新規部署',
      color_code: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    setDepartments([...departments, newDept]);
    startEdit(newDept);
  };

  const startEdit = (dept: Department) => {
    setEditingId(dept.dept_id);
    setDeletingId(null);
    setEditName(dept.name);
    setEditColor(dept.color_code);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setDepartments(departments.map(d => 
      d.dept_id === editingId ? { ...d, name: editName, color_code: editColor } : d
    ));
    setEditingId(null);
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEditingId(null);
    setDeletingId(id);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId) {
       setDepartments(departments.filter(d => d.dept_id !== deletingId));
       setDeletingId(null);
    }
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-stone-700">
        <span>🏢</span> 部署エリア設定
      </h2>
      
      <div className="space-y-4">
        {departments.map(dept => (
          <div key={dept.dept_id} className="bg-white p-4 rounded-lg shadow-sm border border-stone-200 min-h-[72px] flex items-center transition-all">
            
            {/* 削除確認モード */}
            {deletingId === dept.dept_id ? (
              <div className="flex-1 flex items-center justify-between bg-red-50 -m-2 p-2 rounded animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-red-700 font-bold px-2">
                  <AlertCircle size={20} />
                  <span>削除しますか？</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded shadow-sm hover:bg-red-700 font-bold text-sm"
                  >
                    はい
                  </button>
                  <button 
                    onClick={cancelDelete}
                    className="px-4 py-2 bg-white text-stone-600 border border-stone-300 rounded shadow-sm hover:bg-stone-50 text-sm"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : editingId === dept.dept_id ? (
              /* 編集モード */
              <div className="flex-1 flex gap-4 items-center">
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border rounded px-2 py-1 flex-1 text-lg"
                  autoFocus
                />
                <div className="flex gap-1">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={`w-6 h-6 rounded-full border ${editColor === c ? 'border-black ring-1 ring-black' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button onClick={saveEdit} className="p-2 text-green-600 hover:bg-green-50 rounded"><Check size={20} /></button>
                <button onClick={() => setEditingId(null)} className="p-2 text-stone-400 hover:bg-stone-50 rounded"><X size={20} /></button>
              </div>
            ) : (
              /* 通常表示モード */
              <>
                <div className="flex-1 flex items-center gap-4">
                  <div 
                    className="w-8 h-8 rounded-md border border-stone-300 shadow-sm"
                    style={{ backgroundColor: dept.color_code }}
                  />
                  <span className="font-bold text-lg">{dept.name}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(dept)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-full cursor-pointer transition-colors"><Edit2 size={20} /></button>
                  <button 
                    type="button"
                    onClick={(e) => requestDelete(e, dept.dept_id)} 
                    className="p-3 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleAdd}
        className="mt-6 w-full py-4 bg-stone-800 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-stone-700 transition-colors cursor-pointer shadow-lg active:scale-[0.99]"
      >
        <Plus size={20} /> 新しい部署を追加
      </button>
    </div>
  );
};