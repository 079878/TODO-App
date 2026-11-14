import React from 'react';
import {
  CalendarDays,
  CheckSquare,
  Clock,
  Mail,
  MessageSquare,
  Moon,
  Plus,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { PlannerView } from '../types/planner';
import { formatDisplayDate, getTodayKey, getWeekDates } from '../utils/time';

interface SidebarProps {
  activeView: PlannerView;
  onSelectView: (view: PlannerView) => void;
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  onOpenNewBlock: () => void;
  completedCount: number;
  totalCount: number;
  scheduledMinutes: number;
}

const NAV_ITEMS: {
  id: PlannerView;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'week', label: 'Week', icon: CalendarDays },
  { id: 'focus', label: 'Focus', icon: Clock },
  { id: 'habits', label: 'Habits', icon: CheckSquare },
  { id: 'review', label: 'Review', icon: Moon },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'gmail', label: 'Gmail', icon: Mail },
  { id: 'assistant', label: 'Assistant', icon: MessageSquare },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  selectedDate,
  onSelectDate,
  onOpenNewBlock,
  completedCount,
  totalCount,
  scheduledMinutes,
}) => {
  const weekDates = getWeekDates(selectedDate);
  const todayKey = getTodayKey();
  const completionPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const scheduledHours = (scheduledMinutes / 60).toFixed(1);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-[#E4E4E7] lg:bg-[#FFFFFF] dark:lg:border-[#27272A] dark:lg:bg-[#111114]">
        {/* Brand Zone */}
        <div className="flex h-16 items-center justify-between border-b border-[#F4F4F5] px-6 dark:border-[#1E1E22]">
          <button
            type="button"
            onClick={() => {
              onSelectDate(todayKey);
              onSelectView('today');
            }}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4] rounded-md"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#09090B] text-white dark:bg-[#FAFAFA] dark:text-[#09090B]">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="4"
                  width="14"
                  height="3"
                  rx="1.5"
                  fill="currentColor"
                />
                <rect
                  x="3"
                  y="9.5"
                  width="9"
                  height="3"
                  rx="1.5"
                  fill="#6366F1"
                />
                <rect
                  x="3"
                  y="15"
                  width="11"
                  height="2"
                  rx="1"
                  fill="currentColor"
                  fillOpacity="0.45"
                />
              </svg>
            </span>
            <span className="font-display text-lg font-semibold tracking-[-0.02em] text-[#09090B] dark:text-[#FAFAFA] whitespace-nowrap">
              Dayflow
            </span>
          </button>
        </div>

        {/* Primary Action */}
        <div className="px-4 pt-5 pb-3">
          <button
            type="button"
            onClick={onOpenNewBlock}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#4648d4] px-4 text-sm font-medium text-white transition-all duration-150 hover:bg-[#3b3dc2] active:scale-[0.98] dark:bg-[#6366F1] dark:hover:bg-[#5558e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111114] whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>New Time Block</span>
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4] whitespace-nowrap ${
                  isActive
                    ? 'bg-[#F4F2FD] text-[#4648d4] dark:bg-[#6366F1]/15 dark:text-[#A5B4FC]'
                    : 'text-[#464554] hover:bg-[#FAFAFA] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#18181B] dark:hover:text-[#FAFAFA]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive
                      ? 'text-[#4648d4] dark:text-[#A5B4FC]'
                      : 'text-[#71717A] dark:text-[#71717A]'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Week Date Strip */}
        <div className="border-t border-[#F4F4F5] px-4 py-4 dark:border-[#1E1E22]">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
              Week Navigator
            </span>
            <button
              type="button"
              onClick={() => onSelectDate(todayKey)}
              className="text-xs font-medium text-[#4648d4] hover:underline dark:text-[#A5B4FC] focus-visible:outline-none"
            >
              Jump to today
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((dKey) => {
              const info = formatDisplayDate(dKey);
              const dayNum = dKey.split('-')[2];
              const isSelected = dKey === selectedDate;
              const isToday = dKey === todayKey;
              return (
                <button
                  key={dKey}
                  type="button"
                  onClick={() => {
                    onSelectDate(dKey);
                    if (activeView === 'week') onSelectView('today');
                  }}
                  aria-label={info.full}
                  className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4] ${
                    isSelected
                      ? 'bg-[#4648d4] text-white dark:bg-[#6366F1]'
                      : isToday
                        ? 'bg-[#F4F2FD] text-[#4648d4] dark:bg-[#6366F1]/15 dark:text-[#A5B4FC]'
                        : 'text-[#27272A] hover:bg-[#F4F4F5] dark:text-[#E4E4E7] dark:hover:bg-[#18181B]'
                  }`}
                >
                  <span
                    className={`text-[10px] font-medium ${
                      isSelected
                        ? 'text-white/80'
                        : 'text-[#71717A] dark:text-[#A1A1AA]'
                    }`}
                  >
                    {info.shortWeekday.slice(0, 1)}
                  </span>
                  <span className="mt-0.5 font-mono text-xs font-medium tabular-nums">
                    {Number(dayNum)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Progress Summary */}
        <div className="border-t border-[#F4F4F5] px-5 py-4 dark:border-[#1E1E22]">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
              Daily Progress
            </span>
            <span className="font-mono tabular-nums text-[#71717A] dark:text-[#A1A1AA]">
              {completedCount}/{totalCount} tasks
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F4F4F5] dark:bg-[#27272A]">
            <div
              className="h-full rounded-full bg-[#10B981] transition-all duration-300 ease-out"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
            <span>Scheduled</span>
            <span className="font-mono font-medium text-[#27272A] dark:text-[#E4E4E7]">
              {scheduledHours}h
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (<= 60px height, <15% viewport height) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-between overflow-x-auto border-t border-[#E4E4E7] bg-[#FFFFFF]/95 px-1 backdrop-blur-sm dark:border-[#27272A] dark:bg-[#111114]/95 sm:justify-around lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`flex h-11 min-w-[56px] flex-1 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-[#4648d4] dark:text-[#A5B4FC]'
                  : 'text-[#71717A] dark:text-[#A1A1AA]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
