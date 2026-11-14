import React from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { PlannerTask } from '../types/planner';
import {
  addDays,
  formatDisplayDate,
  formatDuration,
  getTodayKey,
  getWeekDates,
  timeToMinutes,
} from '../utils/time';
import { TaskCheckbox } from './TaskCheckbox';

interface WeekViewProps {
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  onOpenDay: (dateKey: string) => void;
  tasks: PlannerTask[];
  onToggleTask: (taskId: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  selectedDate,
  onSelectDate,
  onOpenDay,
  tasks,
  onToggleTask,
}) => {
  const weekDates = getWeekDates(selectedDate);
  const todayKey = getTodayKey();

  const weekTasks = tasks.filter((t) => weekDates.includes(t.date));
  const weekCompleted = weekTasks.filter((t) => t.completed).length;
  const weekScheduledMins = weekTasks
    .filter((t) => Boolean(t.startTime))
    .reduce((sum, t) => sum + t.durationMinutes, 0);

  const firstDayInfo = formatDisplayDate(weekDates[0]);
  const lastDayInfo = formatDisplayDate(weekDates[6]);

  return (
    <div className="mx-auto max-w-[1320px] space-y-6 px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-8">
      {/* Week Header Bar */}
      <div className="elevation-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 sm:px-6">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]">
            {firstDayInfo.monthDay} – {lastDayInfo.monthDay}
          </h2>
          <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
            {weekCompleted} of {weekTasks.length} tasks complete
            <span
              className="mx-1.5 text-[#D4D4D8] dark:text-[#3F3F46]"
              aria-hidden="true"
            >
              ·
            </span>
            {formatDuration(weekScheduledMins)} time-blocked
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectDate(addDays(selectedDate, -7))}
            className="flex h-9 items-center gap-1 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-3.5 text-xs font-medium text-[#27272A] hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#E4E4E7] dark:hover:bg-[#27272A] whitespace-nowrap"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Prev Week</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(todayKey)}
            className="h-9 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-3.5 text-xs font-medium text-[#27272A] hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#E4E4E7] dark:hover:bg-[#27272A] whitespace-nowrap"
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(addDays(selectedDate, 7))}
            className="flex h-9 items-center gap-1 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-3.5 text-xs font-medium text-[#27272A] hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#E4E4E7] dark:hover:bg-[#27272A] whitespace-nowrap"
          >
            <span>Next Week</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 7-Day Columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
        {weekDates.map((dKey) => {
          const info = formatDisplayDate(dKey);
          const isToday = dKey === todayKey;
          const isSelected = dKey === selectedDate;
          const dayItems = tasks
            .filter((t) => t.date === dKey)
            .sort((a, b) => {
              if (a.startTime && b.startTime) {
                return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
              }
              if (a.startTime) return -1;
              if (b.startTime) return 1;
              return 0;
            });

          const scheduledMins = dayItems
            .filter((t) => Boolean(t.startTime))
            .reduce((sum, t) => sum + t.durationMinutes, 0);

          return (
            <div
              key={dKey}
              className={`elevation-card flex flex-col rounded-2xl p-4 transition-colors ${
                isSelected ? 'ring-1 ring-[#4648d4] dark:ring-[#6366F1]' : ''
              }`}
            >
              <div className="flex items-start justify-between border-b border-[#F4F4F5] pb-3 dark:border-[#1E1E22]">
                <div>
                  <span
                    className={`text-xs font-semibold ${
                      isToday
                        ? 'text-[#4648d4] dark:text-[#A5B4FC]'
                        : 'text-[#71717A] dark:text-[#A1A1AA]'
                    }`}
                  >
                    {info.shortWeekday}
                    {isToday ? ' · Today' : ''}
                  </span>
                  <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-[#09090B] dark:text-[#FAFAFA]">
                    {info.monthDay}
                  </p>
                </div>
                <span className="font-mono text-xs tabular-nums text-[#71717A] dark:text-[#A1A1AA]">
                  {formatDuration(scheduledMins)}
                </span>
              </div>

              <div className="mt-3 flex-1 divide-y divide-[#F4F4F5] dark:divide-[#1E1E22]">
                {dayItems.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#A1A1AA] dark:text-[#52525B]">
                    Open day
                  </p>
                ) : (
                  dayItems.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-1 py-2"
                    >
                      <div className="-ml-2.5 -mt-1.5 scale-90">
                        <TaskCheckbox
                          checked={task.completed}
                          onToggle={() => onToggleTask(task.id)}
                          label={task.title}
                        />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-xs font-medium leading-snug text-[#09090B] dark:text-[#FAFAFA]">
                          <span
                            className={`task-strike ${
                              task.completed ? 'task-strike-done' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[#71717A] dark:text-[#A1A1AA]">
                          {task.startTime ? `${task.startTime} · ` : ''}
                          {formatDuration(task.durationMinutes)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => onOpenDay(dKey)}
                className="mt-3 flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-[#FAFAFA] text-xs font-medium text-[#27272A] transition-colors hover:bg-[#F4F2FD] hover:text-[#4648d4] dark:bg-[#18181B] dark:text-[#E4E4E7] dark:hover:bg-[#6366F1]/20 dark:hover:text-[#A5B4FC] whitespace-nowrap"
              >
                <span>Open Day</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
