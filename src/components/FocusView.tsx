import React, { useEffect, useState } from 'react';
import { Check, Pause, Play, RotateCcw } from 'lucide-react';
import { FocusSession, PlannerTask } from '../types/planner';
import { formatDuration, getTodayKey } from '../utils/time';

interface FocusViewProps {
  selectedDate: string;
  tasks: PlannerTask[];
  activeTaskId: string | null;
  onSelectTaskId: (taskId: string | null) => void;
  focusSessions: FocusSession[];
  onLogFocusSession: (payload: {
    taskId?: string;
    title: string;
    durationMinutes: number;
    markTaskComplete: boolean;
  }) => void;
}

const PRESET_DURATIONS = [15, 25, 45, 60, 90];

export const FocusView: React.FC<FocusViewProps> = ({
  selectedDate,
  tasks,
  activeTaskId,
  onSelectTaskId,
  focusSessions,
  onLogFocusSession,
}) => {
  const dayTasks = tasks.filter(
    (t) => t.date === selectedDate && !t.completed
  );
  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

  const [customIntention, setCustomIntention] = useState(
    'Uninterrupted deep work sprint'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    activeTask ? activeTask.durationMinutes : 45
  );
  const [secondsLeft, setSecondsLeft] = useState<number>(
    (activeTask ? activeTask.durationMinutes : 45) * 60
  );
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  useEffect(() => {
    if (!isRunning && activeTask) {
      setDurationMinutes(activeTask.durationMinutes);
      setSecondsLeft(activeTask.durationMinutes * 60);
      setSessionCompleted(false);
    }
  }, [activeTaskId]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          setSessionCompleted(true);
          onLogFocusSession({
            taskId: activeTask?.id,
            title:
              activeTask
                ? activeTask.title
                : customIntention.trim() || 'Deep work session',
            durationMinutes,
            markTaskComplete: Boolean(activeTask),
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, activeTask, customIntention, durationMinutes, onLogFocusSession]);

  const handleSelectDuration = (mins: number) => {
    setIsRunning(false);
    setSessionCompleted(false);
    setDurationMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSessionCompleted(false);
    setSecondsLeft(durationMinutes * 60);
  };

  const handleCompleteEarly = () => {
    const elapsedMinutes = Math.max(
      1,
      Math.round((durationMinutes * 60 - secondsLeft) / 60) || durationMinutes
    );
    setIsRunning(false);
    setSessionCompleted(true);
    setSecondsLeft(0);
    onLogFocusSession({
      taskId: activeTask?.id,
      title:
        activeTask
          ? activeTask.title
          : customIntention.trim() || 'Deep work session',
      durationMinutes: elapsedMinutes,
      markTaskComplete: Boolean(activeTask),
    });
  };

  const totalSeconds = Math.max(1, durationMinutes * 60);
  const progress = Math.min(1, Math.max(0, 1 - secondsLeft / totalSeconds));
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const minsDisplay = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secsDisplay = String(secondsLeft % 60).padStart(2, '0');

  const todaySessions = focusSessions.filter((s) => s.date === selectedDate);
  const totalTodayFocusMinutes = todaySessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );

  return (
    <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-4 py-6 pb-20 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-8">
      {/* Main Focus Stage */}
      <section className="elevation-card flex flex-col items-center rounded-2xl px-6 py-8 sm:p-10 lg:col-span-7">
        {/* Task Anchor Selector */}
        <div className="w-full max-w-md">
          <label
            htmlFor="focus-task-select"
            className="block text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]"
          >
            Focus Anchor
          </label>
          <select
            id="focus-task-select"
            value={activeTaskId || ''}
            onChange={(e) => {
              const val = e.target.value;
              onSelectTaskId(val ? val : null);
            }}
            className="mt-1.5 h-10 w-full rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 text-sm font-medium text-[#09090B] focus:border-[#4648d4] focus:bg-[#FFFFFF] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:focus:border-[#6366F1] dark:focus:bg-[#18181B]"
          >
            <option value="">Custom Focus Intention</option>
            {dayTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({formatDuration(t.durationMinutes)})
              </option>
            ))}
          </select>

          {!activeTask && (
            <input
              type="text"
              value={customIntention}
              onChange={(e) => setCustomIntention(e.target.value)}
              placeholder="Write a single-sentence intention..."
              aria-label="Custom focus intention"
              className="mt-3 w-full border-b border-[#E4E4E7] bg-transparent pb-2 text-center text-base text-[#09090B] placeholder:text-[#A1A1AA] focus:border-b-2 focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1]"
            />
          )}
        </div>

        {/* Circular Precision Timer */}
        <div className="relative my-8 flex h-[260px] w-[260px] items-center justify-center">
          <svg
            viewBox="0 0 260 260"
            className="h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="130"
              cy="130"
              r={radius}
              fill="none"
              className="stroke-[#F4F4F5] dark:stroke-[#27272A]"
              strokeWidth="4"
            />
            <circle
              cx="130"
              cy="130"
              r={radius}
              fill="none"
              stroke={sessionCompleted ? '#10B981' : '#6366F1'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-5xl font-semibold tracking-[-0.03em] tabular-nums text-[#09090B] dark:text-[#FAFAFA]">
              {minsDisplay}:{secsDisplay}
            </span>
            <span className="mt-2 max-w-[180px] truncate text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
              {sessionCompleted
                ? 'Session logged'
                : activeTask
                  ? activeTask.category
                  : selectedDate === getTodayKey()
                    ? 'Single-task mode'
                    : selectedDate}
            </span>
          </div>
        </div>

        {/* Duration Presets */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {PRESET_DURATIONS.map((mins) => {
            const active = durationMinutes === mins;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => handleSelectDuration(mins)}
                className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-medium tabular-nums transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#4648d4] text-white dark:bg-[#6366F1]'
                    : 'bg-[#F4F4F5] text-[#27272A] hover:bg-[#E4E4E7] dark:bg-[#1E1E22] dark:text-[#E4E4E7] dark:hover:bg-[#27272A]'
                }`}
              >
                {mins}m
              </button>
            );
          })}
        </div>

        {/* Transport Controls */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (secondsLeft === 0) handleReset();
              setSessionCompleted(false);
              setIsRunning((r) => !r);
            }}
            className="flex h-12 min-w-[144px] items-center justify-center gap-2 rounded-full bg-[#4648d4] px-6 text-sm font-medium text-white transition-all hover:bg-[#3b3dc2] active:scale-[0.98] dark:bg-[#6366F1] dark:hover:bg-[#5558e6] whitespace-nowrap"
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>
                  {secondsLeft < durationMinutes * 60 && secondsLeft > 0
                    ? 'Resume'
                    : 'Start Focus'}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset timer"
            className="flex h-12 items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-5 text-sm font-medium text-[#09090B] transition-colors hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#FAFAFA] dark:hover:bg-[#27272A] whitespace-nowrap"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>

          {!sessionCompleted && (
            <button
              type="button"
              onClick={handleCompleteEarly}
              className="flex h-12 items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-5 text-sm font-medium text-[#006c49] transition-colors hover:bg-[#ECFDF5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#34D399] dark:hover:bg-[#064E3B]/30 whitespace-nowrap"
            >
              <Check className="h-4 w-4" />
              <span>Finish &amp; Log</span>
            </button>
          )}
        </div>
      </section>

      {/* Session Log */}
      <aside className="elevation-card flex flex-col rounded-2xl p-6 lg:col-span-5">
        <div className="flex items-baseline justify-between border-b border-[#F4F4F5] pb-4 dark:border-[#1E1E22]">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]">
              Focus Log
            </h2>
            <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
              Completed sprints for {selectedDate}
            </p>
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums text-[#006c49] dark:text-[#34D399]">
            {formatDuration(totalTodayFocusMinutes)}
          </span>
        </div>

        <div className="mt-2 divide-y divide-[#F4F4F5] dark:divide-[#1E1E22]">
          {todaySessions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                No focus sessions logged yet
              </p>
              <p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                Start the timer to record uninterrupted work blocks.
              </p>
            </div>
          ) : (
            todaySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#09090B] dark:text-[#FAFAFA]">
                    {session.title}
                  </p>
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-[#71717A] dark:text-[#A1A1AA]">
                    Completed at {session.completedAt}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs font-medium tabular-nums text-[#006c49] dark:text-[#34D399]">
                  {formatDuration(session.durationMinutes)}
                </span>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};
