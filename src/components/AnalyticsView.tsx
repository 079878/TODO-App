import React, { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FocusSession, PlannerTask, TaskCategory } from '../types/planner';
import { addDays, formatDisplayDate, formatDuration } from '../utils/time';

interface AnalyticsViewProps {
  selectedDate: string;
  tasks: PlannerTask[];
  focusSessions: FocusSession[];
  theme: 'light' | 'dark';
  isGlobalSearchActive?: boolean;
}

interface DailyAnalyticsPoint {
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  total: number;
  completed: number;
  remaining: number;
  completionRate: number | null;
  trendRate: number | null;
  focusMinutes: number;
}

const CATEGORIES: TaskCategory[] = [
  'Deep Work',
  'Meetings',
  'Personal',
  'Admin',
];

const CATEGORY_BAR_COLOR: Record<TaskCategory, string> = {
  'Deep Work': 'bg-[#4648d4] dark:bg-[#6366F1]',
  Meetings: 'bg-[#27272A] dark:bg-[#E4E4E7]',
  Personal: 'bg-[#10B981]',
  Admin: 'bg-[#71717A] dark:bg-[#A1A1AA]',
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  selectedDate,
  tasks,
  focusSessions,
  theme,
  isGlobalSearchActive = false,
}) => {
  const [windowDays, setWindowDays] = useState<30 | 14>(30);
  const isDark = theme === 'dark';

  const { dailySeries, summary, categoryBreakdown } = useMemo(() => {
    const dateKeys: string[] = [];
    for (let offset = -(windowDays - 1); offset <= 0; offset++) {
      dateKeys.push(addDays(selectedDate, offset));
    }

    const tasksByDate = new Map<string, PlannerTask[]>();
    for (const task of tasks) {
      const bucket = tasksByDate.get(task.date);
      if (bucket) {
        bucket.push(task);
      } else {
        tasksByDate.set(task.date, [task]);
      }
    }

    const focusByDate = new Map<string, number>();
    for (const session of focusSessions) {
      focusByDate.set(
        session.date,
        (focusByDate.get(session.date) || 0) + session.durationMinutes
      );
    }

    const rawDays = dateKeys.map((dateKey) => {
      const dayList = tasksByDate.get(dateKey) || [];
      const total = dayList.length;
      const completed = dayList.filter((t) => t.completed).length;
      const remaining = Math.max(0, total - completed);
      const completionRate =
        total > 0 ? Math.round((completed / total) * 100) : null;
      const info = formatDisplayDate(dateKey);

      return {
        dateKey,
        shortLabel: info.monthDay,
        fullLabel: info.full,
        total,
        completed,
        remaining,
        completionRate,
        focusMinutes: focusByDate.get(dateKey) || 0,
      };
    });

    // Compute 7-day rolling weighted productivity trend line
    const series: DailyAnalyticsPoint[] = rawDays.map((day, idx) => {
      const startIdx = Math.max(0, idx - 6);
      let rollingTotal = 0;
      let rollingCompleted = 0;
      for (let j = startIdx; j <= idx; j++) {
        rollingTotal += rawDays[j].total;
        rollingCompleted += rawDays[j].completed;
      }
      const trendRate =
        rollingTotal > 0
          ? Math.round((rollingCompleted / rollingTotal) * 100)
          : null;
      return {
        ...day,
        trendRate,
      };
    });

    const totalTasks = series.reduce((sum, d) => sum + d.total, 0);
    const totalCompleted = series.reduce((sum, d) => sum + d.completed, 0);
    const overallRate =
      totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    const activeDays = series.filter((d) => d.total > 0).length;
    const totalFocusMinutes = series.reduce(
      (sum, d) => sum + d.focusMinutes,
      0
    );

    // Compare recent 7 days vs prior 7 days for productivity momentum
    const recentSlice = series.slice(-7);
    const priorSlice = series.slice(-14, -7);
    const recentTotal = recentSlice.reduce((s, d) => s + d.total, 0);
    const recentDone = recentSlice.reduce((s, d) => s + d.completed, 0);
    const priorTotal = priorSlice.reduce((s, d) => s + d.total, 0);
    const priorDone = priorSlice.reduce((s, d) => s + d.completed, 0);

    const recentRate =
      recentTotal > 0 ? Math.round((recentDone / recentTotal) * 100) : null;
    const priorRate =
      priorTotal > 0 ? Math.round((priorDone / priorTotal) * 100) : null;
    const deltaPct =
      recentRate !== null && priorRate !== null
        ? recentRate - priorRate
        : null;

    // Category completion breakdown within window
    const windowSet = new Set(dateKeys);
    const windowTasks = tasks.filter((t) => windowSet.has(t.date));
    const breakdown = CATEGORIES.map((category) => {
      const catTasks = windowTasks.filter((t) => t.category === category);
      const done = catTasks.filter((t) => t.completed).length;
      const total = catTasks.length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      const minutes = catTasks
        .filter((t) => t.completed)
        .reduce((s, t) => s + t.durationMinutes, 0);
      return { category, done, total, rate, minutes };
    });

    return {
      dailySeries: series,
      summary: {
        totalTasks,
        totalCompleted,
        overallRate,
        activeDays,
        totalFocusMinutes,
        recentRate,
        deltaPct,
      },
      categoryBreakdown: breakdown,
    };
  }, [selectedDate, tasks, focusSessions, windowDays]);

  const gridStroke = isDark ? '#27272A' : '#E4E4E7';
  const tickColor = isDark ? '#A1A1AA' : '#71717A';
  const trendStroke = isDark ? '#818CF8' : '#4648d4';
  const dailyStroke = '#10B981';
  const remainingFill = isDark ? '#27272A' : '#E4E4E7';

  return (
    <div className="mx-auto max-w-[1320px] space-y-6 px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-8">
      {/* Top KPI Summary Strip */}
      <div className="elevation-card grid grid-cols-2 gap-5 rounded-2xl p-6 lg:grid-cols-4">
        <div>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            {windowDays}-Day Completion Rate
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#09090B] dark:text-[#FAFAFA]">
            {summary.overallRate}%
          </p>
          <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
            {summary.totalCompleted} of {summary.totalTasks} tasks done
          </p>
        </div>

        <div>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            7-Day Productivity Trend
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#4648d4] dark:text-[#A5B4FC]">
            {summary.recentRate !== null ? `${summary.recentRate}%` : '—'}
          </p>
          <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
            {summary.deltaPct !== null
              ? `${summary.deltaPct >= 0 ? '+' : ''}${summary.deltaPct}% vs prior 7d`
              : 'Rolling 7-day average'}
          </p>
        </div>

        <div>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Active Days Tracked
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#006c49] dark:text-[#34D399]">
            {summary.activeDays} / {windowDays}
          </p>
          <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
            Ending {formatDisplayDate(selectedDate).monthDay}
          </p>
        </div>

        <div>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Deep Focus Logged
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#09090B] dark:text-[#FAFAFA]">
            {formatDuration(summary.totalFocusMinutes)}
          </p>
          <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
            {isGlobalSearchActive
              ? 'Tasks filtered by TopBar search'
              : `Across last ${windowDays} days`}
          </p>
        </div>
      </div>

      {/* Main Chart: Task Completion Rate & 7-Day Trend Line */}
      <section
        aria-label="Task Completion Rate Over Time"
        className="elevation-card rounded-2xl p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F4F4F5] pb-4 dark:border-[#1E1E22]">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]">
              Completion Rate &amp; Productivity Trend
            </h2>
            <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
              Daily task completion percentage paired with a 7-day rolling
              productivity trend line
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4 text-xs text-[#71717A] dark:text-[#A1A1AA]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                <span>Daily Rate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-[#4648d4] dark:bg-[#818CF8]" />
                <span>7-Day Trend</span>
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-[#F4F4F5] p-1 dark:bg-[#18181B]">
              {([30, 14] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setWindowDays(days)}
                  className={`rounded-full px-3 py-1 font-mono text-xs font-medium tabular-nums transition-colors whitespace-nowrap ${
                    windowDays === days
                      ? 'bg-[#FFFFFF] text-[#09090B] shadow-xs dark:bg-[#27272A] dark:text-[#FAFAFA]'
                      : 'text-[#71717A] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {summary.totalTasks === 0 ? (
          <div className="flex h-[320px] flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
              {isGlobalSearchActive
                ? 'No matching tasks in this 30-day window'
                : 'No tasks recorded in this window'}
            </p>
            <p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA]">
              {isGlobalSearchActive
                ? 'Clear or adjust the TopBar search filter to inspect all productivity data.'
                : 'Add or complete tasks in Today or Week to chart your productivity trend.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dailySeries}
                margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="dayflowCompletionGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#10B981"
                      stopOpacity={isDark ? 0.28 : 0.2}
                    />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={gridStroke}
                />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                  minTickGap={22}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine
                  y={summary.overallRate}
                  stroke={isDark ? '#52525B' : '#A1A1AA'}
                  strokeDasharray="4 4"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) {
                      return null;
                    }
                    const point = payload[0].payload as DailyAnalyticsPoint;
                    return (
                      <div className="elevation-sheet rounded-xl px-3.5 py-2.5 text-xs">
                        <p className="font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                          {point.fullLabel}
                        </p>
                        {point.total === 0 ? (
                          <p className="mt-1 text-[#71717A] dark:text-[#A1A1AA]">
                            No tasks scheduled
                          </p>
                        ) : (
                          <div className="mt-1.5 space-y-1 tabular-nums">
                            <p className="flex items-center justify-between gap-4">
                              <span className="text-[#71717A] dark:text-[#A1A1AA]">
                                Daily Completion
                              </span>
                              <span className="font-mono font-semibold text-[#006c49] dark:text-[#34D399]">
                                {point.completionRate}% ({point.completed}/
                                {point.total})
                              </span>
                            </p>
                            {point.trendRate !== null && (
                              <p className="flex items-center justify-between gap-4">
                                <span className="text-[#71717A] dark:text-[#A1A1AA]">
                                  7-Day Trend
                                </span>
                                <span className="font-mono font-semibold text-[#4648d4] dark:text-[#A5B4FC]">
                                  {point.trendRate}%
                                </span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completionRate"
                  name="Daily Completion %"
                  stroke={dailyStroke}
                  strokeWidth={2}
                  fill="url(#dayflowCompletionGradient)"
                  connectNulls
                  dot={{ r: 2.5, fill: dailyStroke, strokeWidth: 0 }}
                  activeDot={{ r: 4.5, fill: dailyStroke }}
                />
                <Line
                  type="monotone"
                  dataKey="trendRate"
                  name="7-Day Trend %"
                  stroke={trendStroke}
                  strokeWidth={2.5}
                  connectNulls
                  dot={false}
                  activeDot={{ r: 5, fill: trendStroke }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Secondary Row: Daily Task Volume & Category Completion */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Daily Completed vs Remaining Volume */}
        <section
          aria-label="Daily Task Volume"
          className="elevation-card rounded-2xl p-5 sm:p-6 lg:col-span-7"
        >
          <div className="border-b border-[#F4F4F5] pb-4 dark:border-[#1E1E22]">
            <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]">
              Daily Task Volume
            </h2>
            <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
              Completed vs open tasks per day across the last {windowDays} days
            </p>
          </div>

          <div className="mt-5 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailySeries}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={gridStroke}
                />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                  minTickGap={22}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) {
                      return null;
                    }
                    const point = payload[0].payload as DailyAnalyticsPoint;
                    return (
                      <div className="elevation-sheet rounded-xl px-3.5 py-2.5 text-xs">
                        <p className="font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                          {point.fullLabel}
                        </p>
                        <div className="mt-1 space-y-0.5 tabular-nums">
                          <p className="text-[#006c49] dark:text-[#34D399]">
                            Completed: {point.completed}
                          </p>
                          <p className="text-[#71717A] dark:text-[#A1A1AA]">
                            Open: {point.remaining}
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="completed"
                  stackId="tasks"
                  fill="#10B981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="remaining"
                  stackId="tasks"
                  fill={remainingFill}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Category Completion Breakdown */}
        <section
          aria-label="Category Completion Breakdown"
          className="elevation-card flex flex-col justify-between rounded-2xl p-5 sm:p-6 lg:col-span-5"
        >
          <div>
            <div className="border-b border-[#F4F4F5] pb-4 dark:border-[#1E1E22]">
              <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]">
                Completion by Category
              </h2>
              <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                Execution balance across workstreams ({windowDays}d)
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {categoryBreakdown.map((item) => (
                <div key={item.category}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-[#09090B] dark:text-[#FAFAFA]">
                      {item.category}
                    </span>
                    <span className="font-mono tabular-nums text-[#71717A] dark:text-[#A1A1AA]">
                      {item.done}/{item.total} ({item.rate}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#F4F4F5] dark:bg-[#27272A]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${CATEGORY_BAR_COLOR[item.category]}`}
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 border-t border-[#F4F4F5] pt-4 text-xs text-[#71717A] dark:border-[#1E1E22] dark:text-[#A1A1AA] tabular-nums">
            Dashed line marks your {windowDays}-day average ({summary.overallRate}
            %).
          </p>
        </section>
      </div>
    </div>
  );
};
