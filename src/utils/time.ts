export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getTodayKey(): string {
  return formatDateKey(new Date());
}

export function addDays(dateKey: string, delta: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + delta);
  return formatDateKey(d);
}

export function getWeekDates(anchorDateKey: string): string[] {
  const d = parseDateKey(anchorDateKey);
  const day = d.getDay();
  // Monday as start of week (ISO rhythm)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  return Array.from({ length: 7 }, (_, i) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    return formatDateKey(cur);
  });
}

export function formatDisplayDate(dateKey: string): {
  weekday: string;
  shortWeekday: string;
  monthDay: string;
  full: string;
  relativeLabel: string | null;
} {
  const d = parseDateKey(dateKey);
  const today = getTodayKey();
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);

  let relativeLabel: string | null = null;
  if (dateKey === today) relativeLabel = 'Today';
  else if (dateKey === tomorrow) relativeLabel = 'Tomorrow';
  else if (dateKey === yesterday) relativeLabel = 'Yesterday';

  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
    shortWeekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    full: d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }),
    relativeLabel,
  };
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatClockTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
}

export function calculateHabitStreak(
  completedDates: Record<string, boolean>,
  referenceDateKey: string
): number {
  let streak = 0;
  let cursor = completedDates[referenceDateKey]
    ? referenceDateKey
    : addDays(referenceDateKey, -1);

  while (completedDates[cursor]) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
