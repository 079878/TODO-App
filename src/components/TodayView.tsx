import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  Edit3,
  Minus,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { PlannerTask, TaskCategory } from '../types/planner';
import {
  formatClockTime,
  formatDuration,
  getTodayKey,
  minutesToTime,
  timeToMinutes,
} from '../utils/time';
import { TaskCheckbox } from './TaskCheckbox';

interface TodayViewProps {
  selectedDate: string;
  tasks: PlannerTask[];
  onToggleTask: (taskId: string) => void;
  onQuickAddTask: (payload: {
    title: string;
    category: TaskCategory;
    durationMinutes: number;
    startTime?: string;
    priority: boolean;
  }) => void;
  onEditTask: (task: PlannerTask) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskDuration: (taskId: string, deltaMinutes: number) => void;
  onUnscheduleTask: (taskId: string) => void;
  onOpenNewBlockAtTime: (startTime: string) => void;
  onStartFocusForTask: (task: PlannerTask) => void;
  isGlobalSearchActive?: boolean;
}

const CATEGORIES: ('All' | TaskCategory)[] = [
  'All',
  'Deep Work',
  'Meetings',
  'Personal',
  'Admin',
];

const QUICK_CATEGORIES: TaskCategory[] = [
  'Deep Work',
  'Meetings',
  'Personal',
  'Admin',
];

const QUICK_DURATIONS = [15, 30, 45, 60, 90];

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 64; // 64px per hour, 32px per 30m

const CATEGORY_TEXT_ACCENT: Record<TaskCategory, string> = {
  'Deep Work': 'text-[#4648d4] dark:text-[#A5B4FC]',
  Meetings: 'text-[#27272A] dark:text-[#E4E4E7]',
  Personal: 'text-[#006c49] dark:text-[#34D399]',
  Admin: 'text-[#71717A] dark:text-[#A1A1AA]',
};

export const TodayView: React.FC<TodayViewProps> = ({
  selectedDate,
  tasks,
  onToggleTask,
  onQuickAddTask,
  onEditTask,
  onDeleteTask,
  onUpdateTaskDuration,
  onUnscheduleTask,
  onOpenNewBlockAtTime,
  onStartFocusForTask,
  isGlobalSearchActive = false,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState<TaskCategory>('Deep Work');
  const [quickDuration, setQuickDuration] = useState(45);
  const [quickTime, setQuickTime] = useState('');
  const [quickPriority, setQuickPriority] = useState(false);
  const [isQuickExpanded, setIsQuickExpanded] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<'All' | TaskCategory>('All');
  const [hideCompleted, setHideCompleted] = useState(false);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.date === selectedDate),
    [tasks, selectedDate]
  );

  const filteredInboxTasks = useMemo(() => {
    return dayTasks
      .filter((t) => {
        if (categoryFilter !== 'All' && t.category !== categoryFilter) {
          return false;
        }
        if (hideCompleted && t.completed) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.priority !== b.priority) return a.priority ? -1 : 1;
        if (a.startTime && b.startTime) {
          return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
        }
        if (a.startTime) return -1;
        if (b.startTime) return 1;
        return 0;
      });
  }, [dayTasks, categoryFilter, hideCompleted]);

  const scheduledBlocks = useMemo(() => {
    return dayTasks
      .filter((t) => Boolean(t.startTime))
      .sort((a, b) => timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!));
  }, [dayTasks]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;
    onQuickAddTask({
      title: trimmed,
      category: quickCategory,
      durationMinutes: quickDuration,
      startTime: quickTime || undefined,
      priority: quickPriority,
    });
    setQuickTitle('');
    setQuickTime('');
    setQuickPriority(false);
  };

  const hours = Array.from(
    { length: END_HOUR - START_HOUR + 1 },
    (_, i) => START_HOUR + i
  );

  const isToday = selectedDate === getTodayKey();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const minTimelineMinutes = START_HOUR * 60;
  const maxTimelineMinutes = (END_HOUR + 1) * 60;
  const showTimehead =
    isToday &&
    currentMinutes >= minTimelineMinutes &&
    currentMinutes <= maxTimelineMinutes;
  const timeheadTop =
    ((currentMinutes - minTimelineMinutes) / 60) * HOUR_HEIGHT;

  const totalScheduledMinutes = scheduledBlocks.reduce(
    (sum, b) => sum + b.durationMinutes,
    0
  );
  const completedDayCount = dayTasks.filter((t) => t.completed).length;

  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-6 px-4 py-6 pb-20 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-8">
      {/* LEFT COLUMN: Task Inbox & Inline Quick-Add */}
      <section
        aria-label="Daily Task List"
        className="flex flex-col lg:col-span-5"
      >
        <div className="elevation-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]">
                Today&apos;s Tasks
              </h2>
              <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
                {completedDayCount} of {dayTasks.length} completed
                <span
                  className="mx-1.5 text-[#D4D4D8] dark:text-[#3F3F46]"
                  aria-hidden="true"
                >
                  ·
                </span>
                {formatDuration(totalScheduledMinutes)} scheduled
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHideCompleted((v) => !v)}
              className="text-xs font-medium text-[#71717A] transition-colors hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA] whitespace-nowrap"
            >
              {hideCompleted ? 'Show done' : 'Hide done'}
            </button>
          </div>

          {/* Inline Task Creator */}
          <form onSubmit={handleQuickSubmit} className="mt-5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quickTitle}
                onFocus={() => setIsQuickExpanded(true)}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Add a task or intention..."
                aria-label="Quick add task"
                className="w-full border-b border-[#E4E4E7] bg-transparent py-2.5 text-base text-[#09090B] placeholder:text-[#A1A1AA] transition-colors focus:border-b-2 focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1]"
              />
              {quickTitle.trim() && (
                <button
                  type="submit"
                  className="flex h-9 shrink-0 items-center justify-center rounded-full bg-[#4648d4] px-4 text-xs font-medium text-white transition-all hover:bg-[#3b3dc2] active:scale-[0.98] dark:bg-[#6366F1] dark:hover:bg-[#5558e6] whitespace-nowrap"
                >
                  Add
                </button>
              )}
            </div>

            {isQuickExpanded && (
              <div className="mt-3 space-y-2.5 border-b border-[#F4F4F5] pb-4 dark:border-[#1E1E22]">
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setQuickCategory(cat)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        quickCategory === cat
                          ? 'bg-[#4648d4] text-white dark:bg-[#6366F1]'
                          : 'bg-[#F4F4F5] text-[#27272A] hover:bg-[#E4E4E7] dark:bg-[#1E1E22] dark:text-[#E4E4E7] dark:hover:bg-[#27272A]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {QUICK_DURATIONS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setQuickDuration(mins)}
                        className={`rounded-full px-2.5 py-1 font-mono text-xs tabular-nums transition-colors whitespace-nowrap ${
                          quickDuration === mins
                            ? 'bg-[#09090B] text-white dark:bg-[#FAFAFA] dark:text-[#09090B]'
                            : 'bg-[#F4F4F5] text-[#27272A] hover:bg-[#E4E4E7] dark:bg-[#1E1E22] dark:text-[#E4E4E7] dark:hover:bg-[#27272A]'
                        }`}
                      >
                        {formatDuration(mins)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={quickTime}
                      onChange={(e) => setQuickTime(e.target.value)}
                      aria-label="Optional start time"
                      className="h-7 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] px-2 font-mono text-xs tabular-nums text-[#27272A] focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#E4E4E7] dark:focus:border-[#6366F1]"
                    />
                    <button
                      type="button"
                      onClick={() => setQuickPriority((p) => !p)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        quickPriority
                          ? 'bg-[#F4F2FD] text-[#4648d4] dark:bg-[#6366F1]/20 dark:text-[#A5B4FC]'
                          : 'bg-[#F4F4F5] text-[#71717A] hover:text-[#27272A] dark:bg-[#1E1E22] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                      }`}
                    >
                      Priority
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Category Filter */}
          <div className="mt-4">
            <div
              className="flex items-center gap-1 overflow-x-auto pb-1"
              role="tablist"
              aria-label="Filter by category"
            >
              {CATEGORIES.map((cat) => {
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategoryFilter(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#09090B] text-white dark:bg-[#FAFAFA] dark:text-[#09090B]'
                        : 'text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E22] dark:hover:text-[#FAFAFA]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          <div className="mt-3 divide-y divide-[#F4F4F5] dark:divide-[#1E1E22]">
            {filteredInboxTasks.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                  {dayTasks.length === 0 && !isGlobalSearchActive
                    ? 'A quiet slate for this day'
                    : 'No matching tasks'}
                </p>
                <p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                  {dayTasks.length === 0 && !isGlobalSearchActive
                    ? 'Use the baseline above to capture your top priorities.'
                    : 'Adjust your category filter or TopBar search query.'}
                </p>
              </div>
            ) : (
              filteredInboxTasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex items-start gap-2 py-3 transition-colors hover:bg-[#FAFAFA]/70 dark:hover:bg-[#18181B]/60"
                >
                  <TaskCheckbox
                    checked={task.completed}
                    onToggle={() => onToggleTask(task.id)}
                    label={task.title}
                  />

                  <div
                    className="min-w-0 flex-1 cursor-pointer pt-1.5"
                    onClick={() => onEditTask(task)}
                  >
                    <p className="text-sm font-medium leading-snug text-[#09090B] dark:text-[#FAFAFA]">
                      <span
                        className={`task-strike ${
                          task.completed ? 'task-strike-done' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                    </p>
                    {/* Clean unboxed metadata with typographic separators */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
                      <span
                        className={`font-medium ${
                          task.completed
                            ? 'text-[#A1A1AA] dark:text-[#71717A]'
                            : CATEGORY_TEXT_ACCENT[task.category]
                        }`}
                      >
                        {task.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">
                        {formatDuration(task.durationMinutes)}
                      </span>
                      {task.startTime && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[#27272A] dark:text-[#E4E4E7]">
                            {task.startTime}
                          </span>
                        </>
                      )}
                      {task.priority && !task.completed && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-[#4648d4] dark:text-[#A5B4FC]">
                            Top Priority
                          </span>
                        </>
                      )}
                    </div>
                    {task.notes && (
                      <p className="mt-1 truncate text-xs text-[#71717A] dark:text-[#A1A1AA]">
                        {task.notes}
                      </p>
                    )}
                  </div>

                  {/* Row Actions */}
                  <div className="flex shrink-0 items-center gap-0.5 pt-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    {!task.startTime && (
                      <button
                        type="button"
                        onClick={() => onEditTask({ ...task, startTime: '09:00' })}
                        title="Schedule onto timeline"
                        aria-label={`Schedule ${task.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] hover:bg-[#F4F2FD] hover:text-[#4648d4] dark:text-[#A1A1AA] dark:hover:bg-[#6366F1]/20 dark:hover:text-[#A5B4FC]"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!task.completed && (
                      <button
                        type="button"
                        onClick={() => onStartFocusForTask(task)}
                        title="Start focus timer"
                        aria-label={`Focus on ${task.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] hover:bg-[#F4F2FD] hover:text-[#4648d4] dark:text-[#A1A1AA] dark:hover:bg-[#6366F1]/20 dark:hover:text-[#A5B4FC]"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      title="Edit task"
                      aria-label={`Edit ${task.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E22] dark:hover:text-[#FAFAFA]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      title="Delete task"
                      aria-label={`Delete ${task.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] hover:bg-[#ffdad6]/50 hover:text-[#ba1a1a] dark:text-[#A1A1AA] dark:hover:bg-[#7f1d1d]/30 dark:hover:text-[#fca5a5]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN: Chronological Timeline (64px per hour) */}
      <section
        aria-label="Chronological Day Timeline"
        className="flex flex-col lg:col-span-7"
      >
        <div className="elevation-card rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#F4F4F5] pb-4 dark:border-[#1E1E22]">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]">
                Chronological Timeline
              </h2>
              <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                Click any open hour slot to anchor a focused time block
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
              <span className="font-mono">{scheduledBlocks.length} blocks</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">07:00 – 21:00</span>
            </div>
          </div>

          <div className="relative mt-4 select-none">
            <div
              className="relative"
              style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
            >
              {/* Hourly Grid Rows */}
              {hours.map((hour, idx) => {
                const hourStr = `${String(hour).padStart(2, '0')}:00`;
                const topPx = idx * HOUR_HEIGHT;
                return (
                  <div
                    key={hour}
                    style={{ top: `${topPx}px`, height: `${HOUR_HEIGHT}px` }}
                    className="group absolute inset-x-0 flex"
                  >
                    {/* Time Axis */}
                    <div className="w-14 shrink-0 pr-3 text-right">
                      <span className="-translate-y-2 inline-block font-mono text-xs tabular-nums text-[#71717A] dark:text-[#A1A1AA]">
                        {hourStr}
                      </span>
                    </div>

                    {/* Interactive Hour Track */}
                    <button
                      type="button"
                      onClick={() => onOpenNewBlockAtTime(hourStr)}
                      aria-label={`Schedule block at ${hourStr}`}
                      className="relative flex-1 border-t border-[#E4E4E7] text-left transition-colors hover:bg-[#F4F2FD]/45 dark:border-[#27272A] dark:hover:bg-[#6366F1]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4648d4]"
                    >
                      {/* Half-hour hairline at 32px */}
                      <div
                        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#F4F4F5] dark:border-[#1E1E22]"
                        style={{ top: `${HOUR_HEIGHT / 2}px` }}
                      />
                      <span className="pointer-events-none absolute right-3 top-2 text-[11px] font-medium text-[#4648d4] opacity-0 transition-opacity group-hover:opacity-100 dark:text-[#A5B4FC]">
                        + Block at {hourStr}
                      </span>
                    </button>
                  </div>
                );
              })}

              {/* Scheduled Time Block Cards */}
              {scheduledBlocks.map((block) => {
                const startMins = timeToMinutes(block.startTime!);
                const clampedStart = Math.max(
                  minTimelineMinutes,
                  Math.min(maxTimelineMinutes - 15, startMins)
                );
                const topPx =
                  ((clampedStart - minTimelineMinutes) / 60) * HOUR_HEIGHT;
                const heightPx = Math.max(
                  42,
                  (block.durationMinutes / 60) * HOUR_HEIGHT - 4
                );
                const endStr = minutesToTime(startMins + block.durationMinutes);
                const isCompact = heightPx < 58;

                return (
                  <div
                    key={block.id}
                    style={{
                      top: `${topPx + 2}px`,
                      height: `${heightPx}px`,
                      left: '56px',
                      right: '0px',
                    }}
                    className={`group absolute z-10 flex items-start gap-1.5 rounded-2xl border px-3 py-2 transition-all duration-150 ${
                      block.completed
                        ? 'border-[#10B981]/35 bg-[#ECFDF5]/60 dark:border-[#10B981]/30 dark:bg-[#064E3B]/25'
                        : 'border-[#E4E4E7] bg-[#FFFFFF] shadow-[0_1px_2px_0_rgba(9,9,11,0.03)] hover:border-[#C7C4D7] dark:border-[#27272A] dark:bg-[#18181B] dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.4)] dark:hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="-ml-1.5 -mt-1.5">
                      <TaskCheckbox
                        checked={block.completed}
                        onToggle={() => onToggleTask(block.id)}
                        label={block.title}
                      />
                    </div>

                    <div
                      onClick={() => onEditTask(block)}
                      className="min-w-0 flex-1 cursor-pointer pt-0.5"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-[#09090B] dark:text-[#FAFAFA]">
                          <span
                            className={`task-strike ${
                              block.completed ? 'task-strike-done' : ''
                            }`}
                          >
                            {block.title}
                          </span>
                        </p>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-[#71717A] dark:text-[#A1A1AA]">
                          {block.startTime}–{endStr}
                        </span>
                      </div>

                      {!isCompact && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
                          <span
                            className={`font-medium ${
                              block.completed
                                ? 'text-[#006c49] dark:text-[#34D399]'
                                : CATEGORY_TEXT_ACCENT[block.category]
                            }`}
                          >
                            {block.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">
                            {formatDuration(block.durationMinutes)}
                          </span>
                          {block.notes && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate text-[#71717A] dark:text-[#A1A1AA]">
                                {block.notes}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Block Controls */}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => onUpdateTaskDuration(block.id, -15)}
                        title="Shorten 15m"
                        aria-label={`Shorten ${block.title} by 15 minutes`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#FAFAFA]"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateTaskDuration(block.id, 15)}
                        title="Extend 15m"
                        aria-label={`Extend ${block.title} by 15 minutes`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#FAFAFA]"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      {!block.completed && (
                        <button
                          type="button"
                          onClick={() => onStartFocusForTask(block)}
                          title="Enter focus mode"
                          aria-label={`Start focus for ${block.title}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[#4648d4] hover:bg-[#F4F2FD] dark:text-[#A5B4FC] dark:hover:bg-[#6366F1]/20"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onUnscheduleTask(block.id)}
                        title="Move back to inbox"
                        aria-label={`Unschedule ${block.title}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#FAFAFA]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Live Chronological Timehead Scrim */}
              {showTimehead && (
                <div
                  style={{ top: `${timeheadTop}px` }}
                  className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                  aria-hidden="true"
                >
                  <div className="w-14 shrink-0 pr-1.5 text-right">
                    <span className="inline-block rounded-full bg-[#6366F1] px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-white">
                      {formatClockTime(now)}
                    </span>
                  </div>
                  <div className="h-[1.5px] flex-1 bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,0.35)]" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
