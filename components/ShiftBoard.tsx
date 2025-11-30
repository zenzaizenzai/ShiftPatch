import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Department, Staff, Shift, Requirement } from '../types';
import { timeToMinutes, minutesToTime, snapTime, getSkillColor, WEEKDAYS } from '../utils';
import { Calendar, Download, Reply, ChevronDown, GripVertical } from 'lucide-react';

interface Props {
  departments: Department[];
  staffList: Staff[];
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  requirements: Requirement[];
}

const START_HOUR = 6;
const END_HOUR = 26; // 02:00 AM next day
const MIN_HEIGHT = 60 * (END_HOUR - START_HOUR); // 60px per hour
const PX_PER_MIN = 1.2; // 1.2px = 1 minute (72px per hour)
const SLOT_INTERVAL = 15; // 15 mins snapping

export const ShiftBoard: React.FC<Props> = ({ departments, staffList, shifts, setShifts, requirements }) => {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({});
  
  // Drag State for Shifts
  const [dragState, setDragState] = useState<{
    id: string;
    mode: 'MOVE' | 'RESIZE_START' | 'RESIZE_END';
    initialY: number;
    initialTime: number;
    initialDuration: number;
    hasMoved: boolean;
  } | null>(null);

  // Drag State for Column Resize
  const [colResizeState, setColResizeState] = useState<{
    deptId: string;
    initialX: number;
    initialWidth: number;
  } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  // Filter shifts for current date
  const dayShifts = useMemo(() => shifts.filter(s => s.date === currentDate), [shifts, currentDate]);
  
  // Calculate unassigned staff
  const assignedStaffIds = new Set(dayShifts.map(s => s.staff_id));
  const unassignedStaff = useMemo(() => staffList.filter(s => !assignedStaffIds.has(s.staff_id)), [staffList, assignedStaffIds]);

  // --- Helper Functions ---

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    return WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]; 
  };

  const getRequirement = (deptId: string, hour: number) => {
    const day = getDayOfWeek(currentDate);
    // Adjust hour > 24 for lookup if your requirement data uses 0-23
    const lookupHour = hour >= 24 ? hour - 24 : hour; 
    return requirements.find(r => r.dept_id === deptId && r.day_of_week === day && r.start_hour === lookupHour)?.required_count || 0;
  };

  const getStaffCountAtHour = (deptId: string, hour: number) => {
    const startMin = hour * 60;
    const endMin = (hour + 1) * 60;
    return dayShifts.filter(s => {
      if (s.dept_id !== deptId) return false;
      const sStart = timeToMinutes(s.start_time);
      const sEnd = timeToMinutes(s.end_time);
      // Overlap logic
      return sStart < endMin && sEnd > startMin;
    }).length;
  };

  const getCellColor = (deptId: string, hour: number) => {
    const required = getRequirement(deptId, hour);
    if (required === 0) return 'bg-white';
    
    const assigned = getStaffCountAtHour(deptId, hour);
    if (assigned < required) return 'bg-red-50'; // Understaffed
    return 'bg-emerald-50'; // Sufficiently staffed
  };

  // --- Actions ---

  const handleReturnToStandby = (shiftId: string) => {
    setShifts(prev => prev.filter(s => s.shift_id !== shiftId));
    setSelectedShiftId(null);
  };

  const copyToClipboard = async () => {
    const header = ['日付', '名前', '部署', '開始', '終了'].join('\t');
    const rows = dayShifts.map(s => {
      const staff = staffList.find(st => st.staff_id === s.staff_id);
      const dept = departments.find(d => d.dept_id === s.dept_id);
      return [s.date, staff?.name, dept?.name, s.start_time, s.end_time].join('\t');
    }).join('\n');
    
    try {
      await navigator.clipboard.writeText(`${header}\n${rows}`);
      alert('クリップボードにコピーしました！表計算ソフトに貼り付けられます。');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('コピーに失敗しました。ブラウザの権限設定を確認してください。');
    }
  };

  // --- Interaction Handlers (Column Resize) ---

  const handleColResizeStart = (e: React.PointerEvent, deptId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setColResizeState({
      deptId,
      initialX: e.clientX,
      initialWidth: currentWidth,
    });
  };

  const handleColResizeMove = (e: React.PointerEvent) => {
    if (!colResizeState) return;
    const delta = e.clientX - colResizeState.initialX;
    const newWidth = Math.max(80, colResizeState.initialWidth + delta); // Min 80px
    setColWidths(prev => ({ ...prev, [colResizeState.deptId]: newWidth }));
  };

  const handleColResizeEnd = (e: React.PointerEvent) => {
    if (!colResizeState) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setColResizeState(null);
  };

  // --- Interaction Handlers (Shift Pointer Events) ---

  const handlePointerDown = (e: React.PointerEvent, shift: Shift, mode: 'MOVE' | 'RESIZE_START' | 'RESIZE_END') => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    
    setDragState({
      id: shift.shift_id,
      mode,
      initialY: e.clientY,
      initialTime: mode === 'RESIZE_END' ? timeToMinutes(shift.end_time) : timeToMinutes(shift.start_time),
      initialDuration: timeToMinutes(shift.end_time) - timeToMinutes(shift.start_time),
      hasMoved: false,
    });
    
    // Select on touch/click down
    setSelectedShiftId(shift.shift_id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Determine if we are resizing columns or moving shifts
    if (colResizeState) {
      handleColResizeMove(e);
      return;
    }

    if (!dragState) return;

    // Mark as moved if distance is significant
    if (Math.abs(e.clientY - dragState.initialY) > 5) {
      // Just flag for logic, state update not strictly needed for rendering if unused
    }

    const deltaY = e.clientY - dragState.initialY;
    const deltaMinutes = snapTime(deltaY / PX_PER_MIN, SLOT_INTERVAL);

    setShifts(prev => prev.map(s => {
      if (s.shift_id !== dragState.id) return s;

      let newStart = timeToMinutes(s.start_time);
      let newEnd = timeToMinutes(s.end_time);

      if (dragState.mode === 'MOVE') {
        const originalStart = dragState.initialTime;
        const currentStart = originalStart + deltaMinutes;
        const duration = dragState.initialDuration;
        
        // Clamp
        newStart = Math.max(START_HOUR * 60, Math.min((END_HOUR * 60) - duration, currentStart));
        newEnd = newStart + duration;
      } else if (dragState.mode === 'RESIZE_START') {
        // Adjust start time
        const originalStart = dragState.initialTime;
        newStart = Math.max(START_HOUR * 60, Math.min(newEnd - 30, originalStart + deltaMinutes));
      } else if (dragState.mode === 'RESIZE_END') {
         // Adjust end time
        const originalEnd = dragState.initialTime;
        newEnd = Math.max(newStart + 30, Math.min(END_HOUR * 60, originalEnd + deltaMinutes));
      }

      return {
        ...s,
        start_time: minutesToTime(newStart),
        end_time: minutesToTime(newEnd),
      };
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (colResizeState) {
      handleColResizeEnd(e);
      return;
    }
    if (!dragState) return;
    
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragState(null);
  };

  // --- Sidebar Drag & Drop (Native API for cross-container) ---

  const handleDragStartNew = (e: React.DragEvent, staff: Staff) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ staffId: staff.staff_id }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnDept = (e: React.DragEvent, deptId: string) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;
    
    try {
      const { staffId } = JSON.parse(dataStr);
      const staff = staffList.find(s => s.staff_id === staffId);
      if (!staff) return;

      // Calculate time based on Y position
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relativeY = e.clientY - rect.top; 
      
      const minutesFromStart = relativeY / PX_PER_MIN; 
      const absoluteMinutes = (START_HOUR * 60) + minutesFromStart;
      
      // Default shift: 4 hours or staff default
      const duration = 240; 
      const snappedStart = snapTime(absoluteMinutes, SLOT_INTERVAL);
      const validStart = Math.max(START_HOUR * 60, Math.min((END_HOUR * 60) - duration, snappedStart));

      const newShift: Shift = {
        shift_id: Math.random().toString(36).substr(2, 9),
        staff_id: staff.staff_id,
        date: currentDate,
        start_time: minutesToTime(validStart),
        end_time: minutesToTime(validStart + duration),
        dept_id: deptId,
      };
      
      setShifts(prev => [...prev, newShift]);
      setSelectedShiftId(newShift.shift_id);
    } catch (err) {
      console.error("Drop error", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // --- Render Helpers ---

  const totalBoardHeight = (END_HOUR - START_HOUR) * 60 * PX_PER_MIN;

  const getSelectedShiftName = () => {
    if (!selectedShiftId) return '';
    const s = shifts.find(sh => sh.shift_id === selectedShiftId);
    if (!s) return '';
    const st = staffList.find(st => st.staff_id === s.staff_id);
    return st ? st.name : '';
  };

  return (
    <div className="flex h-full flex-col md:flex-row overflow-hidden relative">
      {/* --- Sidebar (Standby) --- */}
      <div className="w-full md:w-64 bg-stone-100 border-r border-stone-200 flex flex-col z-20 shadow-lg md:shadow-none h-48 md:h-auto shrink-0">
        <div className="p-3 bg-stone-200 border-b border-stone-300 flex justify-between items-center">
          <h2 className="font-bold text-stone-700">待機中スタッフ</h2>
          <span className="bg-stone-600 text-white text-xs px-2 py-1 rounded-full">{unassignedStaff.length}</span>
        </div>
        
        <div className="p-2 flex gap-2 items-center bg-white border-b">
           <Calendar size={16} className="text-stone-400"/>
           <input 
             type="date" 
             value={currentDate} 
             onChange={(e) => setCurrentDate(e.target.value)}
             className="text-sm border-none focus:ring-0 text-stone-600 bg-transparent w-full"
           />
           <div className="text-xs text-stone-400 font-bold w-12 text-center">{getDayOfWeek(currentDate)}曜日</div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {unassignedStaff.length === 0 && (
            <div className="text-center text-stone-400 py-8 text-sm">
              全員配置済み 🎉
            </div>
          )}
          {unassignedStaff.map(staff => (
            <div
              key={staff.staff_id}
              draggable
              onDragStart={(e) => handleDragStartNew(e, staff)}
              className={`p-3 rounded-lg shadow-sm border-l-4 cursor-grab active:cursor-grabbing bg-white hover:bg-stone-50 transition-transform hover:-translate-y-0.5 ${getSkillColor(staff.skill_level)}`}
            >
              <div className="font-bold text-sm">{staff.name}</div>
              <div className="text-[10px] opacity-70 mt-1">
                {staff.start_time}-{staff.end_time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Main Board (Scrollable) --- */}
      <div 
        className="flex-1 overflow-auto bg-white relative select-none" 
        ref={boardRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="min-w-full relative" style={{ height: totalBoardHeight + 60 }}>
          
          {/* Header */}
          <div className="flex sticky top-0 z-10 bg-white/95 backdrop-blur border-b shadow-sm h-10 w-full">
            <div className="w-12 shrink-0 border-r bg-stone-50"></div>
            {departments.map(dept => {
              // Width handling: If manual width is set, use it and flex-none. Otherwise flex-1 (responsive).
              const width = colWidths[dept.dept_id];
              const styleObj = width ? { width: `${width}px`, flex: 'none' } : { flex: 1, minWidth: '100px' };

              return (
                <div 
                  key={dept.dept_id} 
                  className="border-r text-center text-xs font-bold flex items-center justify-center text-stone-700 relative group select-none"
                  style={{ ...styleObj, backgroundColor: dept.color_code }}
                >
                  <span className="truncate px-1">{dept.name}</span>
                  
                  {/* Resize Handle */}
                  <div 
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize hover:bg-stone-900/10 flex items-center justify-center touch-none z-20"
                    onPointerDown={(e) => handleColResizeStart(e, dept.dept_id, width || (e.target as HTMLElement).parentElement?.offsetWidth || 150)}
                  >
                     <div className="w-0.5 h-4 bg-stone-400/50"></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div className="flex relative w-full">
            {/* Time Column */}
            <div className="w-12 shrink-0 bg-stone-50 text-[10px] text-stone-400 font-mono border-r select-none">
              {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => {
                const h = START_HOUR + i;
                return (
                  <div key={h} className="border-b border-stone-200 relative" style={{ height: 60 * PX_PER_MIN }}>
                    <span className="absolute -top-2 w-full text-center">{h}:00</span>
                  </div>
                );
              })}
            </div>

            {/* Department Columns */}
            {departments.map(dept => {
               const width = colWidths[dept.dept_id];
               const styleObj = width ? { width: `${width}px`, flex: 'none' } : { flex: 1, minWidth: '100px' };

               return (
                <div 
                  key={dept.dept_id} 
                  className="border-r relative group"
                  style={styleObj}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnDept(e, dept.dept_id)}
                >
                  {/* Background Grid (Requirements) */}
                  {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => {
                      const h = START_HOUR + i;
                      const bgColor = getCellColor(dept.dept_id, h); 
                      return (
                        <div 
                          key={h} 
                          className={`w-full border-b border-stone-100 ${bgColor === 'bg-white' ? 'bg-transparent' : bgColor}`} 
                          style={{ height: 60 * PX_PER_MIN }}
                        ></div>
                      );
                  })}

                  {/* Shifts */}
                  {dayShifts.filter(s => s.dept_id === dept.dept_id).map(shift => {
                    const staff = staffList.find(st => st.staff_id === shift.staff_id);
                    if (!staff) return null;
                    
                    const startMin = timeToMinutes(shift.start_time);
                    const endMin = timeToMinutes(shift.end_time);
                    const top = (startMin - START_HOUR * 60) * PX_PER_MIN;
                    const height = (endMin - startMin) * PX_PER_MIN;
                    
                    const isSelected = selectedShiftId === shift.shift_id;
                    const isWarning = staff.start_time > shift.start_time || staff.end_time < shift.end_time;

                    return (
                      <div
                          key={shift.shift_id}
                          className={`absolute left-1 right-1 rounded overflow-hidden select-none touch-none shadow-sm transition-shadow
                            ${getSkillColor(staff.skill_level)}
                            ${isSelected ? 'ring-2 ring-indigo-500 z-10 shadow-lg scale-[1.02]' : 'hover:ring-1 hover:ring-stone-400 z-0'}
                          `}
                          style={{ top, height: Math.max(height, 20) }}
                          onPointerDown={(e) => handlePointerDown(e, shift, 'MOVE')}
                          onDoubleClick={() => handleReturnToStandby(shift.shift_id)}
                      >
                          {/* Resize Handles */}
                          <div 
                            className="absolute top-0 w-full h-3 cursor-n-resize hover:bg-black/10 z-20" 
                            onPointerDown={(e) => handlePointerDown(e, shift, 'RESIZE_START')}
                          />
                          
                          <div className="p-1 px-2 text-xs leading-tight pointer-events-none">
                            <div className="font-bold truncate">{staff.name}</div>
                            <div className="opacity-75 text-[10px]">{shift.start_time}-{shift.end_time}</div>
                            {isWarning && <div className="text-[9px] text-red-600 bg-white/50 rounded px-1 mt-0.5 inline-block font-bold">⚠️ 時間外</div>}
                          </div>

                          <div 
                            className="absolute bottom-0 w-full h-3 cursor-s-resize flex justify-center items-end pb-1 hover:bg-black/10 z-20"
                            onPointerDown={(e) => handlePointerDown(e, shift, 'RESIZE_END')}
                          >
                            <div className="w-4 h-0.5 bg-current opacity-30 rounded-full"></div>
                          </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- Floating Actions --- */}
      <button 
        onClick={copyToClipboard}
        className="fixed top-4 right-4 z-50 bg-stone-800 text-white p-2 rounded shadow hover:bg-stone-700 flex items-center gap-2 text-xs"
      >
        <Download size={16} /> <span className="hidden md:inline">データ出力</span>
      </button>

      {/* --- Selection Floating Bar --- */}
      {selectedShiftId && (
        <div className="fixed bottom-20 left-0 w-full z-40 flex justify-center px-4 animate-in slide-in-from-bottom-10 fade-in duration-200 pointer-events-none">
          <div className="bg-stone-900 text-white rounded-full shadow-xl px-6 py-3 flex items-center gap-6 max-w-md w-full justify-between pointer-events-auto">
            <div className="flex flex-col">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">選択中</span>
              <span className="font-bold text-sm truncate max-w-[120px]">{getSelectedShiftName()}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleReturnToStandby(selectedShiftId)}
                className="flex items-center gap-2 bg-stone-700 hover:bg-stone-600 text-white px-4 py-2 rounded-full font-bold text-xs transition-colors"
              >
                <Reply size={14} /> 待機に戻す
              </button>
              <button 
                onClick={() => setSelectedShiftId(null)}
                className="p-2 hover:bg-stone-800 rounded-full text-stone-400"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};