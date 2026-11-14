import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Plus,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { PlannerView } from '../types/planner';
import { addDays, formatDisplayDate, getTodayKey } from '../utils/time';

interface TopBarProps {
  activeView: PlannerView;
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  onOpenNewBlock: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchingTaskCount: number;
}

const VIEW_TITLES: Record<PlannerView, string> = {
  today: 'Daily Agenda',
  week: 'Week Horizon',
  focus: 'Deep Focus',
  habits: 'Daily Rituals',
  review: 'Evening Review',
  gmail: 'Gmail',
  assistant: 'Assistant',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  selectedDate,
  onSelectDate,
  onOpenNewBlock,
  theme,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  matchingTaskCount,
}) => {
  const dateInfo = formatDisplayDate(selectedDate);
  const todayKey = getTodayKey();
  const isToday = selectedDate === todayKey;
  const isDark = theme === 'dark';
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <header className="shrink-0 border-b border-[#E4E4E7] bg-[#FFFFFF] dark:border-[#27272A] dark:bg-[#111114]">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        {/* Zone 1: Context / Screen Title */}
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="font-display text-lg font-semibold tracking-[-0.02em] text-[#09090B] dark:text-[#FAFAFA] whitespace-nowrap truncate sm:text-xl">
            {activeView === 'today' && dateInfo.relativeLabel
              ? dateInfo.relativeLabel
              : VIEW_TITLES[activeView]}
          </h1>
          <span className="hidden text-sm text-[#71717A] dark:text-[#A1A1AA] whitespace-nowrap xl:inline">
            <span
              className="mr-3 text-[#D4D4D8] dark:text-[#3F3F46]"
              aria-hidden="true"
            >
              /
            </span>
            {dateInfo.full}
          </span>
        </div>

        {/* Zone 2: Global Task Search (Desktop / Tablet) */}
        <div className="relative hidden max-w-xs flex-1 md:flex">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A1A1AA] dark:text-[#71717A]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && searchQuery) {
                onSearchChange('');
              }
            }}
            placeholder="Search tasks by title or notes..."
            aria-label="Search tasks by title or notes"
            className="h-9 w-full rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] pl-8 pr-16 text-xs text-[#09090B] placeholder:text-[#A1A1AA] transition-colors focus:border-[#4648d4] focus:bg-[#FFFFFF] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1] dark:focus:bg-[#18181B] [&::-webkit-search-cancel-button]:hidden"
          />
          {hasSearch && (
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              <span
                className="font-mono text-[11px] tabular-nums text-[#71717A] dark:text-[#A1A1AA]"
                title={`${matchingTaskCount} matching tasks`}
              >
                {matchingTaskCount}
              </span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear task search"
                className="flex h-5 w-5 items-center justify-center rounded-full text-[#71717A] transition-colors hover:bg-[#E4E4E7] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#FAFAFA]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Zone 3: Date Navigation Controls */}
        <div className="flex items-center gap-1 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] p-0.5 dark:border-[#27272A] dark:bg-[#09090B] shrink-0">
          <button
            type="button"
            onClick={() => onSelectDate(addDays(selectedDate, -1))}
            aria-label="Previous day"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#464554] transition-colors hover:bg-[#FFFFFF] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#18181B] dark:hover:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(todayKey)}
            className={`h-8 rounded-md px-2.5 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4] ${
              isToday
                ? 'bg-[#FFFFFF] text-[#09090B] shadow-xs dark:bg-[#18181B] dark:text-[#FAFAFA]'
                : 'text-[#464554] hover:bg-[#FFFFFF] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#18181B] dark:hover:text-[#FAFAFA]'
            }`}
          >
            {isToday ? 'Today' : dateInfo.monthDay}
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(addDays(selectedDate, 1))}
            aria-label="Next day"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#464554] transition-colors hover:bg-[#FFFFFF] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#18181B] dark:hover:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Zone 4: Theme Switch & Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={onToggleTheme}
            className="group relative flex h-9 w-[62px] items-center rounded-full border border-[#E4E4E7] bg-[#F4F4F5] p-1 transition-colors duration-150 hover:border-[#C7C4D7] dark:border-[#27272A] dark:bg-[#18181B] dark:hover:border-[#3F3F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111114]"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-[#FFFFFF] text-[#09090B] shadow-xs transition-transform duration-150 ease-out dark:bg-[#27272A] dark:text-[#FAFAFA] ${
                isDark ? 'translate-x-[24px]' : 'translate-x-0'
              }`}
            >
              {isDark ? (
                <Moon className="h-3.5 w-3.5 text-[#A5B4FC]" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-[#4648d4]" />
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenNewBlock}
            className="flex h-10 items-center gap-1.5 rounded-full bg-[#4648d4] px-4 text-xs font-medium text-white transition-all duration-150 hover:bg-[#3b3dc2] active:scale-[0.98] dark:bg-[#6366F1] dark:hover:bg-[#5558e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111114] whitespace-nowrap shrink-0 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Block</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Mobile Task Search Row */}
      <div className="border-t border-[#F4F4F5] px-4 py-2 dark:border-[#1E1E22] md:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A1A1AA] dark:text-[#71717A]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && searchQuery) {
                onSearchChange('');
              }
            }}
            placeholder="Search tasks by title or notes..."
            aria-label="Search tasks by title or notes"
            className="h-9 w-full rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] pl-8 pr-16 text-xs text-[#09090B] placeholder:text-[#A1A1AA] transition-colors focus:border-[#4648d4] focus:bg-[#FFFFFF] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1] dark:focus:bg-[#18181B] [&::-webkit-search-cancel-button]:hidden"
          />
          {hasSearch && (
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              <span className="font-mono text-[11px] tabular-nums text-[#71717A] dark:text-[#A1A1AA]">
                {matchingTaskCount}
              </span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear task search"
                className="flex h-5 w-5 items-center justify-center rounded-full text-[#71717A] transition-colors hover:bg-[#E4E4E7] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#FAFAFA]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
