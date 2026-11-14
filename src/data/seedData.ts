import { DayflowState } from '../types/planner';
import { addDays, getTodayKey } from '../utils/time';

const STORAGE_KEY = 'dayflow_planner_state_v1';

export function createSeedState(): DayflowState {
  const today = getTodayKey();
  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);
  const threeDaysAgo = addDays(today, -3);
  const tomorrow = addDays(today, 1);

  return {
    tasks: [
      {
        id: 't-1',
        title: 'Architecture spec for Q4 billing ledger',
        category: 'Deep Work',
        durationMinutes: 90,
        date: today,
        startTime: '08:30',
        completed: true,
        completedAt: '10:00',
        priority: true,
        notes: 'Finalize idempotency keys and webhook retry boundaries before engineering handoff.',
      },
      {
        id: 't-2',
        title: 'Product design critique — onboarding flow',
        category: 'Meetings',
        durationMinutes: 45,
        date: today,
        startTime: '10:30',
        completed: false,
        priority: false,
        notes: 'Review simplified 3-step workspace creation prototype.',
      },
      {
        id: 't-3',
        title: 'Midday walk without phone & espresso reset',
        category: 'Personal',
        durationMinutes: 30,
        date: today,
        startTime: '12:30',
        completed: false,
        priority: false,
      },
      {
        id: 't-4',
        title: 'Draft release notes and migration guide',
        category: 'Deep Work',
        durationMinutes: 60,
        date: today,
        startTime: '14:00',
        completed: false,
        priority: true,
        notes: 'Focus on breaking API payload changes and upgrade checklist.',
      },
      {
        id: 't-5',
        title: 'Weekly sync with design systems lead',
        category: 'Meetings',
        durationMinutes: 30,
        date: today,
        startTime: '16:00',
        completed: false,
        priority: false,
      },
      {
        id: 't-6',
        title: 'Reconcile Q3 software vendor invoices',
        category: 'Admin',
        durationMinutes: 30,
        date: today,
        completed: false,
        priority: false,
      },
      {
        id: 't-7',
        title: 'Read two chapters of Designing Data-Intensive Applications',
        category: 'Personal',
        durationMinutes: 45,
        date: today,
        completed: false,
        priority: false,
      },
      {
        id: 't-8',
        title: 'Reply to candidate portfolio review thread',
        category: 'Admin',
        durationMinutes: 15,
        date: today,
        completed: true,
        completedAt: '08:15',
        priority: false,
      },
      {
        id: 't-9',
        title: 'Audit database index query latencies',
        category: 'Deep Work',
        durationMinutes: 60,
        date: tomorrow,
        startTime: '09:00',
        completed: false,
        priority: true,
      },
      {
        id: 't-10',
        title: 'Quarterly roadmap alignment',
        category: 'Meetings',
        durationMinutes: 45,
        date: tomorrow,
        startTime: '11:00',
        completed: false,
        priority: false,
      },
      {
        id: 't-11',
        title: 'Prepare sprint retrospective notes',
        category: 'Admin',
        durationMinutes: 30,
        date: yesterday,
        startTime: '15:00',
        completed: true,
        completedAt: '15:30',
        priority: false,
      },
    ],
    habits: [
      {
        id: 'h-1',
        title: '10-minute morning quiet pages',
        routine: 'Morning',
        targetTime: '07:15',
        completedDates: {
          [threeDaysAgo]: true,
          [twoDaysAgo]: true,
          [yesterday]: true,
          [today]: true,
        },
      },
      {
        id: 'h-2',
        title: '500ml water & electrolytes before coffee',
        routine: 'Morning',
        targetTime: '07:30',
        completedDates: {
          [threeDaysAgo]: true,
          [twoDaysAgo]: true,
          [yesterday]: true,
          [today]: true,
        },
      },
      {
        id: 'h-3',
        title: 'Zero-inbox triage (15m cap)',
        routine: 'Midday',
        targetTime: '13:15',
        completedDates: {
          [twoDaysAgo]: true,
          [yesterday]: true,
        },
      },
      {
        id: 'h-4',
        title: '20-minute outdoor sunlight walk',
        routine: 'Midday',
        targetTime: '12:30',
        completedDates: {
          [threeDaysAgo]: true,
          [yesterday]: true,
        },
      },
      {
        id: 'h-5',
        title: 'Shutdown desk & set tomorrow #1 block',
        routine: 'Evening',
        targetTime: '18:30',
        completedDates: {
          [threeDaysAgo]: true,
          [twoDaysAgo]: true,
          [yesterday]: true,
        },
      },
    ],
    focusSessions: [
      {
        id: 'fs-1',
        taskId: 't-1',
        title: 'Architecture spec for Q4 billing ledger',
        durationMinutes: 45,
        date: today,
        completedAt: '09:15',
      },
      {
        id: 'fs-2',
        taskId: 't-1',
        title: 'Architecture spec for Q4 billing ledger',
        durationMinutes: 45,
        date: today,
        completedAt: '10:00',
      },
      {
        id: 'fs-3',
        taskId: 't-11',
        title: 'Prepare sprint retrospective notes',
        durationMinutes: 30,
        date: yesterday,
        completedAt: '15:30',
      },
    ],
    reflections: {
      [yesterday]: {
        date: yesterday,
        highlight: 'Cleared the billing schema review in one uninterrupted morning block.',
        energyDrain: 'Back-to-back afternoon Slack threads fractured focus between 14:00 and 15:00.',
        tomorrowPriority: 'Finish the Q4 billing ledger spec before opening email.',
        mood: 'Focused',
      },
    },
  };
}

export function loadPlannerState(): DayflowState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as Partial<DayflowState>;
    if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.habits)) {
      return createSeedState();
    }
    return {
      tasks: parsed.tasks,
      habits: parsed.habits,
      focusSessions: Array.isArray(parsed.focusSessions) ? parsed.focusSessions : [],
      reflections: parsed.reflections || {},
    };
  } catch {
    return createSeedState();
  }
}

export function savePlannerState(state: DayflowState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors silently
  }
}
