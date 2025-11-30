// 3.1. 部署エリアデータ
export interface Department {
  dept_id: string;
  name: string;
  color_code: string; // Tailwind color class or Hex
}

// 3.2. バイト属性データ
export interface Staff {
  staff_id: string;
  name: string;
  skill_level: '高' | '中' | '低';
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  avail_cond_text_day: string;
  avail_cond_text_night: string;
}

// 3.3. 必要人員設定データ (Simplified for MVP: Hourly requirement per dept)
export interface Requirement {
  req_id: string;
  day_of_week: string; // '月'...'日'
  start_hour: number; // 0-23
  dept_id: string;
  required_count: number;
}

// 3.4. シフトデータ
export interface Shift {
  shift_id: string;
  staff_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  dept_id: string; // Primary department (visual location)
}

// App State
export type ViewMode = 'SHIFT' | 'DEPT' | 'STAFF' | 'REQ';