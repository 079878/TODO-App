import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  DailyReflection,
  FocusSession,
  Habit,
  PlannerTask,
  ReflectionMood,
} from '../types/planner';
import { addDays, formatDisplayDate, formatDuration } from '../utils/time';

interface ReviewViewProps {
  selectedDate: string;
  tasks: PlannerTask[];
  habits: Habit[];
  focusSessions: FocusSession[];
  reflection?: DailyReflection;
  onSaveReflection: (reflection: DailyReflection) => void;
  onRolloverTasks: (fromDate: string, toDate: string) => void;
}

const MOODS: ReflectionMood[] = ['Calm', 'Focused', 'Stretched', 'Energized'];

export const ReviewView: React.FC<ReviewViewProps> = ({
  selectedDate,
  tasks,
  habits,
  focusSessions,
  reflection,
  onSaveReflection,
  onRolloverTasks,
}) => {
  const [highlight, setHighlight] = useState(reflection?.highlight || '');
  const [energyDrain, setEnergyDrain] = useState(reflection?.energyDrain || '');
  const [tomorrowPriority, setTomorrowPriority] = useState(
    reflection?.tomorrowPriority || ''
  );
  const [mood, setMood] = useState<ReflectionMood>(
    reflection?.mood || 'Focused'
  );
  const [savedNotice, setSavedNotice] = useState(false);
  const [rolledOverNotice, setRolledOverNotice] = useState(false);

  useEffect(() => {
    setHighlight(reflection?.highlight || '');
    setEnergyDrain(reflection?.energyDrain || '');
    setTomorrowPriority(reflection?.tomorrowPriority || '');
    setMood(reflection?.mood || 'Focused');
    setSavedNotice(false);
    setRolledOverNotice(false);
  }, [selectedDate, reflection]);

  const dayTasks = tasks.filter((t) => t.date === selectedDate);
  const completedTasks = dayTasks.filter((t) => t.completed);
  const unfinishedTasks = dayTasks.filter((t) => !t.completed);
  const scheduledMinutes = dayTasks
    .filter((t) => Boolean(t.startTime))
    .reduce((sum, t) => sum + t.durationMinutes, 0);
  const focusMinutes = focusSessions
    .filter((s) => s.date === selectedDate)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const habitsDone = habits.filter((h) => h.completedDates[selectedDate]).length;

  const tomorrowKey = addDays(selectedDate, 1);
  const tomorrowInfo = formatDisplayDate(tomorrowKey);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveReflection({
      date: selectedDate,
      highlight: highlight.trim(),
      energyDrain: energyDrain.trim(),
      tomorrowPriority: tomorrowPriority.trim(),
      mood,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleRollover = () => {
    if (unfinishedTasks.length === 0) return;
    onRolloverTasks(selectedDate, tomorrowKey);
    setRolledOverNotice(true);
    window.setTimeout(() => setRolledOverNotice(false), 3000);
  };

  return (
    <div className="mx-auto max-w-[1040px] space-y-6 px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-8">
      {/* Real Daily Metrics Strip */}
      <div className="elevation-card grid grid-cols-2 gap-4 rounded-2xl p-6 sm:grid-cols-4">
        <div>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Tasks Completed
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#09090B] dark:text-[#FAFAFA]">
            {completedTasks.length} / {dayTasks.length}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Time Blocked
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#09090B] dark:text-[#FAFAFA]">
            {formatDuration(scheduledMinutes)}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Deep Focus
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#4648d4] dark:text-[#A5B4FC]">
            {formatDuration(focusMinutes)}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Rituals Checked
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#006c49] dark:text-[#34D399]">
            {habitsDone} / {habits.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Evening Reflection Prompts */}
        <form
          onSubmit={handleSave}
          className="elevation-card space-y-5 rounded-2xl p-6 lg:col-span-7"
        >
          <div className="flex items-baseline justify-between border-b border-[#F4F4F5] pb-4 dark:border-[#1E1E22]">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]">
                Evening Shutdown
              </h2>
              <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                Close mental loops for {formatDisplayDate(selectedDate).full}
              </p>
            </div>
            {savedNotice && (
              <span className="flex items-center gap-1 text-xs font-medium text-[#006c49] dark:text-[#34D399]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
          </div>

          <div>
            <span className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]">
              Energy &amp; Cadence
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    mood === m
                      ? 'bg-[#4648d4] text-white dark:bg-[#6366F1]'
                      : 'bg-[#F4F4F5] text-[#27272A] hover:bg-[#E4E4E7] dark:bg-[#1E1E22] dark:text-[#E4E4E7] dark:hover:bg-[#27272A]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="rev-highlight"
              className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]"
            >
              1. What moved the needle most today?
            </label>
            <textarea
              id="rev-highlight"
              rows={2}
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              placeholder="Capture one meaningful win or completed milestone..."
              className="mt-1.5 w-full resize-none rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2.5 text-sm text-[#09090B] placeholder:text-[#A1A1AA] focus:border-[#4648d4] focus:bg-[#FFFFFF] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1] dark:focus:bg-[#18181B]"
            />
          </div>

          <div>
            <label
              htmlFor="rev-drain"
              className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]"
            >
              2. Where did attention fracture or stall?
            </label>
            <textarea
              id="rev-drain"
              rows={2}
              value={energyDrain}
              onChange={(e) => setEnergyDrain(e.target.value)}
              placeholder="Note meetings, interruptions, or scope creep..."
              className="mt-1.5 w-full resize-none rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2.5 text-sm text-[#09090B] placeholder:text-[#A1A1AA] focus:border-[#4648d4] focus:bg-[#FFFFFF] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1] dark:focus:bg-[#18181B]"
            />
          </div>

          <div>
            <label
              htmlFor="rev-tomorrow"
              className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]"
            >
              3. Single non-negotiable priority for {tomorrowInfo.monthDay}
            </label>
            <input
              id="rev-tomorrow"
              type="text"
              value={tomorrowPriority}
              onChange={(e) => setTomorrowPriority(e.target.value)}
              placeholder="Start tomorrow morning with..."
              className="mt-1.5 w-full border-b border-[#E4E4E7] bg-transparent pb-2 text-base text-[#09090B] placeholder:text-[#A1A1AA] focus:border-b-2 focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="h-11 rounded-full bg-[#4648d4] px-6 text-sm font-medium text-white transition-all hover:bg-[#3b3dc2] active:scale-[0.98] dark:bg-[#6366F1] dark:hover:bg-[#5558e6] whitespace-nowrap"
            >
              Save Reflection
            </button>
          </div>
        </form>

        {/* Task Rollover Panel */}
        <aside className="elevation-card flex flex-col justify-between rounded-2xl p-6 lg:col-span-5">
          <div>
            <div className="border-b border-[#F4F4F5] pb-4 dark:border-[#1E1E22]">
              <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]">
                Rollover Queue
              </h2>
              <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
                {unfinishedTasks.length} unfinished{' '}
                {unfinishedTasks.length === 1 ? 'task' : 'tasks'} remaining on{' '}
                {formatDisplayDate(selectedDate).monthDay}
              </p>
            </div>

            <div className="mt-3 divide-y divide-[#F4F4F5] dark:divide-[#1E1E22]">
              {unfinishedTasks.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-[#006c49] dark:text-[#34D399]">
                    All tasks cleared for today
                  </p>
                  <p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                    {rolledOverNotice
                      ? `Moved open items cleanly to ${tomorrowInfo.monthDay}.`
                      : 'Your slate is completely clean.'}
                  </p>
                </div>
              ) : (
                unfinishedTasks.map((t) => (
                  <div key={t.id} className="py-2.5">
                    <p className="text-sm font-medium text-[#09090B] dark:text-[#FAFAFA]">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
                      {t.category}
                      <span className="mx-1.5 text-[#D4D4D8] dark:text-[#3F3F46]">
                        ·
                      </span>
                      <span className="font-mono">
                        {formatDuration(t.durationMinutes)}
                      </span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {unfinishedTasks.length > 0 && (
            <button
              type="button"
              onClick={handleRollover}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-4 text-sm font-medium text-[#09090B] transition-colors hover:bg-[#F4F2FD] hover:border-[#4648d4]/40 hover:text-[#4648d4] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#FAFAFA] dark:hover:bg-[#6366F1]/20 dark:hover:border-[#6366F1]/50 dark:hover:text-[#A5B4FC] whitespace-nowrap"
            >
              <span>
                Move {unfinishedTasks.length} to {tomorrowInfo.monthDay}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </aside>
      </div>
    </div>
  );
};
