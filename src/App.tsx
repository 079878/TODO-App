import { useEffect, useMemo, useState } from 'react';
import { BlockModal } from './components/BlockModal';
import { ChatView } from './components/ChatView';
import { FocusView } from './components/FocusView';
import { HabitsView } from './components/HabitsView';
import { ReviewView } from './components/ReviewView';
import { Sidebar } from './components/Sidebar';
import { TodayView } from './components/TodayView';
import { TopBar } from './components/TopBar';
import { WeekView } from './components/WeekView';
import { loadPlannerState, savePlannerState } from './data/seedData';
import {
  ChatMessage,
  DailyReflection,
  DayflowState,
  PlannerTask,
  PlannerView,
  RoutinePeriod,
  TaskCategory,
} from './types/planner';
import { formatClockTime, getTodayKey } from './utils/time';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('dayflow_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // Ignore storage errors
  }
  return 'light';
}

const CHAT_STORAGE_KEY = 'dayflow_chat_history_v1';

function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [state, setState] = useState<DayflowState>(() => loadPlannerState());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    loadChatHistory()
  );
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [activeView, setActiveView] = useState<PlannerView>('today');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayKey());
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('dayflow_theme', theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    savePlannerState(state);
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch {
      // Ignore storage quota errors
    }
  }, [chatMessages]);

  const dayTasks = useMemo(
    () => state.tasks.filter((t) => t.date === selectedDate),
    [state.tasks, selectedDate]
  );

  const completedCount = dayTasks.filter((t) => t.completed).length;
  const scheduledMinutes = dayTasks
    .filter((t) => Boolean(t.startTime))
    .reduce((sum, t) => sum + t.durationMinutes, 0);

  const handleToggleTask = (taskId: string) => {
    const nowTime = formatClockTime(new Date());
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? nowTime : undefined,
            }
          : t
      ),
    }));
  };

  const handleQuickAddTask = (payload: {
    title: string;
    category: TaskCategory;
    durationMinutes: number;
    startTime?: string;
    priority: boolean;
  }) => {
    const newTask: PlannerTask = {
      id: generateId('t'),
      title: payload.title,
      category: payload.category,
      durationMinutes: payload.durationMinutes,
      date: selectedDate,
      startTime: payload.startTime,
      completed: false,
      priority: payload.priority,
    };
    setState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
  };

  const handleSaveModalBlock = (payload: {
    id?: string;
    title: string;
    category: TaskCategory;
    durationMinutes: number;
    date: string;
    startTime?: string;
    priority: boolean;
    notes?: string;
  }) => {
    setState((prev) => {
      if (payload.id) {
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === payload.id
              ? {
                  ...t,
                  title: payload.title,
                  category: payload.category,
                  durationMinutes: payload.durationMinutes,
                  date: payload.date,
                  startTime: payload.startTime,
                  priority: payload.priority,
                  notes: payload.notes,
                }
              : t
          ),
        };
      }
      const created: PlannerTask = {
        id: generateId('t'),
        title: payload.title,
        category: payload.category,
        durationMinutes: payload.durationMinutes,
        date: payload.date,
        startTime: payload.startTime,
        completed: false,
        priority: payload.priority,
        notes: payload.notes,
      };
      return {
        ...prev,
        tasks: [created, ...prev.tasks],
      };
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  };

  const handleUpdateTaskDuration = (taskId: string, deltaMinutes: number) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              durationMinutes: Math.max(
                15,
                Math.min(360, t.durationMinutes + deltaMinutes)
              ),
            }
          : t
      ),
    }));
  };

  const handleUnscheduleTask = (taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, startTime: undefined } : t
      ),
    }));
  };

  const handleOpenNewBlock = (startTime?: string) => {
    setEditingTask(null);
    setModalDefaultTime(startTime);
    setModalOpen(true);
  };

  const handleEditTask = (task: PlannerTask) => {
    setEditingTask(task);
    setModalDefaultTime(undefined);
    setModalOpen(true);
  };

  const handleStartFocusForTask = (task: PlannerTask) => {
    setFocusTaskId(task.id);
    setActiveView('focus');
  };

  const handleLogFocusSession = (payload: {
    taskId?: string;
    title: string;
    durationMinutes: number;
    markTaskComplete: boolean;
  }) => {
    const nowTime = formatClockTime(new Date());
    setState((prev) => ({
      ...prev,
      focusSessions: [
        {
          id: generateId('fs'),
          taskId: payload.taskId,
          title: payload.title,
          durationMinutes: payload.durationMinutes,
          date: selectedDate,
          completedAt: nowTime,
        },
        ...prev.focusSessions,
      ],
      tasks:
        payload.markTaskComplete && payload.taskId
          ? prev.tasks.map((t) =>
              t.id === payload.taskId
                ? { ...t, completed: true, completedAt: nowTime }
                : t
            )
          : prev.tasks,
    }));
  };

  const handleToggleHabitDate = (habitId: string, dateKey: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const nextDates = { ...h.completedDates };
        if (nextDates[dateKey]) {
          delete nextDates[dateKey];
        } else {
          nextDates[dateKey] = true;
        }
        return { ...h, completedDates: nextDates };
      }),
    }));
  };

  const handleAddHabit = (payload: {
    title: string;
    routine: RoutinePeriod;
    targetTime: string;
  }) => {
    setState((prev) => ({
      ...prev,
      habits: [
        ...prev.habits,
        {
          id: generateId('h'),
          title: payload.title,
          routine: payload.routine,
          targetTime: payload.targetTime,
          completedDates: {},
        },
      ],
    }));
  };

  const handleDeleteHabit = (habitId: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
    }));
  };

  const handleSaveReflection = (reflection: DailyReflection) => {
    setState((prev) => ({
      ...prev,
      reflections: {
        ...prev.reflections,
        [reflection.date]: reflection,
      },
    }));
  };

  const handleRolloverTasks = (fromDate: string, toDate: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.date === fromDate && !t.completed
          ? { ...t, date: toDate, startTime: undefined }
          : t
      ),
    }));
  };

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] text-[#09090B] dark:bg-[#09090B] dark:text-[#FAFAFA]">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onOpenNewBlock={() => handleOpenNewBlock()}
        completedCount={completedCount}
        totalCount={dayTasks.length}
        scheduledMinutes={scheduledMinutes}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeView={activeView}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onOpenNewBlock={() => handleOpenNewBlock()}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        <main className="flex-1 overflow-y-auto">
          {activeView === 'today' && (
            <TodayView
              selectedDate={selectedDate}
              tasks={state.tasks}
              onToggleTask={handleToggleTask}
              onQuickAddTask={handleQuickAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onUpdateTaskDuration={handleUpdateTaskDuration}
              onUnscheduleTask={handleUnscheduleTask}
              onOpenNewBlockAtTime={(time) => handleOpenNewBlock(time)}
              onStartFocusForTask={handleStartFocusForTask}
            />
          )}

          {activeView === 'week' && (
            <WeekView
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onOpenDay={(dKey) => {
                setSelectedDate(dKey);
                setActiveView('today');
              }}
              tasks={state.tasks}
              onToggleTask={handleToggleTask}
            />
          )}

          {activeView === 'focus' && (
            <FocusView
              selectedDate={selectedDate}
              tasks={state.tasks}
              activeTaskId={focusTaskId}
              onSelectTaskId={setFocusTaskId}
              focusSessions={state.focusSessions}
              onLogFocusSession={handleLogFocusSession}
            />
          )}

          {activeView === 'habits' && (
            <HabitsView
              selectedDate={selectedDate}
              habits={state.habits}
              onToggleHabitDate={handleToggleHabitDate}
              onAddHabit={handleAddHabit}
              onDeleteHabit={handleDeleteHabit}
            />
          )}

          {activeView === 'review' && (
            <ReviewView
              selectedDate={selectedDate}
              tasks={state.tasks}
              habits={state.habits}
              focusSessions={state.focusSessions}
              reflection={state.reflections[selectedDate]}
              onSaveReflection={handleSaveReflection}
              onRolloverTasks={handleRolloverTasks}
            />
          )}

          {activeView === 'assistant' && (
            <ChatView
              selectedDate={selectedDate}
              tasks={state.tasks}
              habits={state.habits}
              messages={chatMessages}
              onUpdateMessages={setChatMessages}
            />
          )}
        </main>
      </div>

      <BlockModal
        isOpen={modalOpen}
        initialTask={editingTask}
        defaultDate={selectedDate}
        defaultStartTime={modalDefaultTime}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModalBlock}
      />
    </div>
  );
}
