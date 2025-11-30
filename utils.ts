export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Convert "HH:mm" to minutes from 00:00
export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Convert minutes to "HH:mm"
export const minutesToTime = (totalMinutes: number): string => {
  let hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  
  // Handle overflow for next day (e.g. 25:00)
  if (hours >= 24) {
    // keeping it > 24 for sorting logic is fine, but for display we might want mod
    // hours = hours % 24; 
  }

  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m}`;
};

// Round minutes to nearest interval (e.g., 15 min)
export const snapTime = (minutes: number, interval: number = 15): number => {
  return Math.round(minutes / interval) * interval;
};

// Get today's date string YYYY-MM-DD
export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

// Determine patch color based on skill
export const getSkillColor = (level: string) => {
  switch (level) {
    case '高': return 'bg-rose-200 border-rose-400 text-rose-900';
    case '中': return 'bg-sky-200 border-sky-400 text-sky-900';
    case '低': return 'bg-lime-200 border-lime-400 text-lime-900';
    default: return 'bg-gray-200 border-gray-400 text-gray-900';
  }
};