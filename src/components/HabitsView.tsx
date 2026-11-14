import React, { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Habit, RoutinePeriod } from '../types/planner';
import {
  calculateHabitStreak,
  formatDisplayDate,
  getTodayKey,
  getWeekDates,
} from '../utils/time';
import { TaskCheckbox } from './TaskCheckbox';

interface HabitsViewProps {
  selectedDate: string;
  habits: Habit[];
  onToggleHabitDate: (habitId: string, dateKey: string) => void;
  onAddHabit: (payload: {
    title: string;
    routine: RoutinePeriod;
    targetTime: string;
  }) => void;
  onDeleteHabit: (habitId: string) => void;
}

const PERIODS: RoutinePeriod[] = ['Morning', 'Midday', 'Evening'];

export const HabitsView: React.FC<HabitsViewProps> = ({
  selectedDate,
  habits,
  onToggleHabitDate,
  onAddHabit,
  onDeleteHabit,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newRoutine, setNewRoutine] = useState<RoutinePeriod>('Morning');
  const [newTime, setNewTime] = useState('07:30');

  const weekDates = getWeekDates(selectedDate);
  const todayKey = getTodayKey();

  const completedTodayCount = habits.filter(
    (h) => h.completedDates[selectedDate]
  ).length;
  const totalWeeklyPossible = habits.length * 7;
  const totalWeeklyDone = habits.reduce(
    (sum, h) =>
      sum + weekDates.filter((d) => Boolean(h.completedDates[d])).length,
    0
  );
  const weeklyRate =
    totalWeeklyPossible > 0
      ? Math.round((totalWeeklyDone / totalWeeklyPossible) * 100)
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onAddHabit({
      title: trimmed,
      routine: newRoutine,
      targetTime: newTime || '08:00',
    });
    setNewTitle('');
  };

  return (
    <div className="mx-auto max-w-[1160px] space-y-6 px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-8">
      {/* Header Summary Strip */}
      <div className="elevation-card grid grid-cols-1 gap-4 rounded-2xl p-6 sm:grid-cols-3">
        <div>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Completed on {formatDisplayDate(selectedDate).monthDay}
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#09090B] dark:text-[#FAFAFA]">
            {completedTodayCount} / {habits.length}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Weekly Consistency
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#006c49] dark:text-[#34D399]">
            {weeklyRate}%
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Longest Active Streak
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#09090B] dark:text-[#FAFAFA]">
            {habits.reduce(
              (max, h) =>
                Math.max(max, calculateHabitStreak(h.completedDates, todayKey)),
              0
            )}{' '}
            days
          </p>
        </div>
      </div>

      {/* Inline Add Habit */}
      <form
        onSubmit={handleSubmit}
        className="elevation-card flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:gap-4"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a daily ritual..."
          aria-label="New daily ritual title"
          className="flex-1 border-b border-[#E4E4E7] bg-transparent py-2 text-base text-[#09090B] placeholder:text-[#A1A1AA] focus:border-b-2 focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-[#F4F4F5] p-1 dark:bg-[#18181B]">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setNewRoutine(p)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  newRoutine === p
                    ? 'bg-[#FFFFFF] text-[#09090B] shadow-xs dark:bg-[#27272A] dark:text-[#FAFAFA]'
                    : 'text-[#71717A] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            aria-label="Target time"
            className="h-9 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-2.5 font-mono text-xs tabular-nums text-[#27272A] focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#E4E4E7] dark:focus:border-[#6366F1]"
          />
          <button
            type="submit"
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#4648d4] px-4 text-xs font-medium text-white transition-all hover:bg-[#3b3dc2] active:scale-[0.98] dark:bg-[#6366F1] dark:hover:bg-[#5558e6] whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Ritual</span>
          </button>
        </div>
      </form>

      {/* Weekly Habit Matrix */}
      <div className="elevation-card overflow-hidden rounded-2xl">
        {/* Matrix Header */}
        <div className="hidden items-center border-b border-[#E4E4E7] bg-[#FAFAFA] px-6 py-3 dark:border-[#27272A] dark:bg-[#09090B]/60 md:grid md:grid-cols-12">
          <div className="col-span-5 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Routine &amp; Ritual
          </div>
          <div className="col-span-5 grid grid-cols-7 gap-1.5 text-center">
            {weekDates.map((dKey) => {
              const info = formatDisplayDate(dKey);
              const isSelected = dKey === selectedDate;
              return (
                <div
                  key={dKey}
                  className={`text-xs font-medium tabular-nums ${
                    isSelected
                      ? 'text-[#4648d4] dark:text-[#A5B4FC]'
                      : 'text-[#71717A] dark:text-[#A1A1AA]'
                  }`}
                >
                  <div>{info.shortWeekday}</div>
                  <div className="font-mono text-[11px]">
                    {Number(dKey.split('-')[2])}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="col-span-2 text-right text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Streak
          </div>
        </div>

        {/* Grouped Sections */}
        <div className="divide-y divide-[#E4E4E7] dark:divide-[#27272A]">
          {PERIODS.map((period) => {
            const group = habits.filter((h) => h.routine === period);
            if (group.length === 0) return null;
            return (
              <div key={period} className="px-4 py-4 sm:px-6">
                <h2 className="mb-2 text-xs font-semibold tracking-wide text-[#71717A] dark:text-[#A1A1AA]">
                  {period}
                </h2>
                <div className="divide-y divide-[#F4F4F5] dark:divide-[#1E1E22]">
                  {group.map((habit) => {
                    const streak = calculateHabitStreak(
                      habit.completedDates,
                      todayKey
                    );
                    const doneSelected = Boolean(
                      habit.completedDates[selectedDate]
                    );

                    return (
                      <div
                        key={habit.id}
                        className="group grid grid-cols-1 items-center gap-3 py-3 md:grid-cols-12"
                      >
                        <div className="flex items-center gap-1.5 md:col-span-5">
                          <TaskCheckbox
                            checked={doneSelected}
                            onToggle={() =>
                              onToggleHabitDate(habit.id, selectedDate)
                            }
                            label={habit.title}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#09090B] dark:text-[#FAFAFA]">
                              {habit.title}
                            </p>
                            <p className="font-mono text-xs tabular-nums text-[#71717A] dark:text-[#A1A1AA]">
                              {habit.targetTime}
                            </p>
                          </div>
                        </div>

                        {/* 7-Day 8px Rounded Checkpoints */}
                        <div className="grid grid-cols-7 gap-1.5 md:col-span-5">
                          {weekDates.map((dKey) => {
                            const done = Boolean(habit.completedDates[dKey]);
                            const info = formatDisplayDate(dKey);
                            return (
                              <button
                                key={dKey}
                                type="button"
                                onClick={() =>
                                  onToggleHabitDate(habit.id, dKey)
                                }
                                aria-label={`${habit.title} on ${info.full}: ${
                                  done ? 'completed' : 'not completed'
                                }`}
                                className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4] ${
                                  done
                                    ? 'border-[#10B981] bg-[#10B981] text-white'
                                    : dKey === selectedDate
                                      ? 'border-[#C7C4D7] bg-[#F4F2FD]/60 text-transparent hover:border-[#4648d4] dark:border-[#6366F1]/50 dark:bg-[#6366F1]/10 dark:hover:border-[#818CF8]'
                                      : 'border-[#E4E4E7] bg-[#FAFAFA] text-transparent hover:border-[#A1A1AA] dark:border-[#27272A] dark:bg-[#18181B] dark:hover:border-[#52525B]'
                                }`}
                              >
                                <Check className="h-4 w-4" strokeWidth={2.5} />
                              </button>
                            );
                          })}
                        </div>

                        {/* Streak + Delete */}
                        <div className="flex items-center justify-between gap-2 md:col-span-2 md:justify-end">
                          <span
                            className={`font-mono text-xs font-semibold tabular-nums ${
                              streak > 0
                                ? 'text-[#006c49] dark:text-[#34D399]'
                                : 'text-[#71717A] dark:text-[#A1A1AA]'
                            }`}
                          >
                            {streak}d streak
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteHabit(habit.id)}
                            aria-label={`Delete ${habit.title}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] opacity-100 transition-opacity hover:bg-[#ffdad6]/50 hover:text-[#ba1a1a] dark:text-[#A1A1AA] dark:hover:bg-[#7f1d1d]/30 dark:hover:text-[#fca5a5] sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
