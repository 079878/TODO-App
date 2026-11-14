export type TaskCategory = 'Deep Work' | 'Meetings' | 'Personal' | 'Admin';

export type PlannerView =
  | 'today'
  | 'week'
  | 'focus'
  | 'habits'
  | 'review'
  | 'analytics'
  | 'assistant'
  | 'gmail';

export type ChatModelMode = 'general' | 'fast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

export interface ChatRolePreset {
  id: string;
  name: string;
  summary: string;
  systemInstruction: string;
}

export type RoutinePeriod = 'Morning' | 'Midday' | 'Evening';

export type ReflectionMood = 'Calm' | 'Focused' | 'Stretched' | 'Energized';

export interface PlannerTask {
  id: string;
  title: string;
  category: TaskCategory;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM (24-hour) when scheduled on timeline
  completed: boolean;
  completedAt?: string;
  priority: boolean;
  notes?: string;
}

export interface Habit {
  id: string;
  title: string;
  routine: RoutinePeriod;
  targetTime: string;
  completedDates: Record<string, boolean>;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  title: string;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  completedAt: string; // HH:MM
}

export interface DailyReflection {
  date: string; // YYYY-MM-DD
  highlight: string;
  energyDrain: string;
  tomorrowPriority: string;
  mood: ReflectionMood;
}

export interface DayflowState {
  tasks: PlannerTask[];
  habits: Habit[];
  focusSessions: FocusSession[];
  reflections: Record<string, DailyReflection>;
}
