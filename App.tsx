import React, { useState, useEffect } from 'react';
import { Department, Staff, Shift, Requirement, ViewMode } from './types';
import { DepartmentSettings } from './components/DepartmentSettings';
import { StaffSettings } from './components/StaffSettings';
import { ShiftBoard } from './components/ShiftBoard';
import { Layout, Users, Settings, Scroll } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('SHIFT');

  // -- Persistence (LocalStorage) --
  const useStickyState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [value, setValue] = useState<T>(() => {
      try {
        const stickyValue = window.localStorage.getItem(key);
        return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
      } catch (e) {
        console.error("Storage parse error", e);
        return defaultValue;
      }
    });
    useEffect(() => {
      window.localStorage.setItem(key, JSON.stringify(value));
    }, [key, value]);
    return [value, setValue];
  };

  const [departments, setDepartments] = useStickyState<Department[]>('app-depts', [
    { dept_id: 'd1', name: '厨房', color_code: '#fca5a5' },
    { dept_id: 'd2', name: 'ホール', color_code: '#67e8f9' },
    { dept_id: 'd3', name: 'レジ', color_code: '#bef264' },
  ]);

  const [staffList, setStaffList] = useStickyState<Staff[]>('app-staff', [
    { staff_id: 's1', name: '佐藤 (店長)', skill_level: '高', start_time: '09:00', end_time: '23:00', avail_cond_text_day: '全日', avail_cond_text_night: '全日' },
    { staff_id: 's2', name: '田中 (バイト)', skill_level: '中', start_time: '17:00', end_time: '22:00', avail_cond_text_day: '授業優先', avail_cond_text_night: '平日OK' },
    { staff_id: 's3', name: '鈴木 (新人)', skill_level: '低', start_time: '18:00', end_time: '22:00', avail_cond_text_day: 'NG', avail_cond_text_night: '土日のみ' },
  ]);

  const [shifts, setShifts] = useStickyState<Shift[]>('app-shifts', []);
  
  const [requirements, setRequirements] = useStickyState<Requirement[]>('app-reqs', [
     { req_id: 'r1', dept_id: 'd1', day_of_week: '月', start_hour: 12, required_count: 2 },
     { req_id: 'r2', dept_id: 'd2', day_of_week: '月', start_hour: 12, required_count: 3 },
  ]);

  // --- Data Integrity Wrappers ---
  // スタッフや部署が削除されたとき、関連するシフトも削除して整合性を保つ

  const handleUpdateDepartments = (newDepts: Department[]) => {
    // 削除された部署IDを特定
    if (newDepts.length < departments.length) {
      const newIds = new Set(newDepts.map(d => d.dept_id));
      const deletedIds = departments.filter(d => !newIds.has(d.dept_id)).map(d => d.dept_id);
      
      // 削除された部署にあるシフトを消去
      if (deletedIds.length > 0) {
        setShifts(prev => prev.filter(s => !deletedIds.includes(s.dept_id)));
      }
    }
    setDepartments(newDepts);
  };

  const handleUpdateStaffList = (newStaffList: Staff[]) => {
    // 削除されたスタッフIDを特定
    if (newStaffList.length < staffList.length) {
      const newIds = new Set(newStaffList.map(s => s.staff_id));
      const deletedIds = staffList.filter(s => !newIds.has(s.staff_id)).map(s => s.staff_id);
      
      // 削除されたスタッフのシフトを消去
      if (deletedIds.length > 0) {
        setShifts(prev => prev.filter(s => !deletedIds.includes(s.staff_id)));
      }
    }
    setStaffList(newStaffList);
  };

  // Tab Rendering
  const renderContent = () => {
    switch (view) {
      case 'SHIFT':
        return (
          <ShiftBoard 
            departments={departments}
            staffList={staffList}
            shifts={shifts}
            setShifts={setShifts}
            requirements={requirements}
          />
        );
      case 'DEPT':
        return <DepartmentSettings departments={departments} setDepartments={handleUpdateDepartments} />;
      case 'STAFF':
        return <StaffSettings staffList={staffList} setStaffList={handleUpdateStaffList} />;
      case 'REQ':
        return (
           <div className="p-8 text-center text-stone-500 h-full overflow-y-auto">
             <h2 className="text-2xl font-bold mb-4">必要人員設定</h2>
             <p>この機能は現在、シフトボード上の背景色ロジック（赤・青・緑）として簡易実装されています。</p>
             <p className="mt-2 text-sm">※ 完全な編集画面は今後のアップデートで追加予定</p>
           </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-screen bg-stone-50 flex flex-col font-sans text-stone-800" style={{ height: '100dvh' }}>
      <div className="flex-1 overflow-hidden relative">
        {renderContent()}
      </div>

      <nav className="bg-white border-t border-stone-200 z-50 shrink-0">
        <div className="flex justify-around items-center h-16 max-w-2xl mx-auto pb-safe">
          <NavButton active={view === 'SHIFT'} onClick={() => setView('SHIFT')} icon={<Scroll size={20} />} label="シフト巻物" />
          <NavButton active={view === 'STAFF'} onClick={() => setView('STAFF')} icon={<Users size={20} />} label="バイト管理" />
          <NavButton active={view === 'DEPT'} onClick={() => setView('DEPT')} icon={<Layout size={20} />} label="部署エリア" />
          <NavButton active={view === 'REQ'} onClick={() => setView('REQ')} icon={<Settings size={20} />} label="設定" />
        </div>
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center w-full h-full transition-colors ${active ? 'text-indigo-600 bg-indigo-50/50' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}
  >
    <div className={`mb-1 ${active ? 'scale-110' : ''} transition-transform`}>{icon}</div>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export default App;