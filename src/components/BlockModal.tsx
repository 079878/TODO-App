import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PlannerTask, TaskCategory } from '../types/planner';

interface BlockModalProps {
  isOpen: boolean;
  initialTask?: PlannerTask | null;
  defaultDate: string;
  defaultStartTime?: string;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    title: string;
    category: TaskCategory;
    durationMinutes: number;
    date: string;
    startTime?: string;
    priority: boolean;
    notes?: string;
  }) => void;
}

const CATEGORIES: TaskCategory[] = ['Deep Work', 'Meetings', 'Personal', 'Admin'];
const DURATIONS = [15, 30, 45, 60, 90, 120];

export const BlockModal: React.FC<BlockModalProps> = ({
  isOpen,
  initialTask,
  defaultDate,
  defaultStartTime,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Deep Work');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('');
  const [priority, setPriority] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialTask) {
      setTitle(initialTask.title);
      setCategory(initialTask.category);
      setDurationMinutes(initialTask.durationMinutes);
      setDate(initialTask.date);
      setStartTime(initialTask.startTime || '');
      setPriority(initialTask.priority);
      setNotes(initialTask.notes || '');
    } else {
      setTitle('');
      setCategory('Deep Work');
      setDurationMinutes(45);
      setDate(defaultDate);
      setStartTime(defaultStartTime || '');
      setPriority(false);
      setNotes('');
    }
  }, [isOpen, initialTask, defaultDate, defaultStartTime]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave({
      id: initialTask?.id,
      title: trimmed,
      category,
      durationMinutes,
      date,
      startTime: startTime ? startTime : undefined,
      priority,
      notes: notes.trim() ? notes.trim() : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#09090B]/40 p-0 backdrop-blur-[2px] dark:bg-black/65 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-modal-title"
      onClick={onClose}
    >
      <div
        className="elevation-sheet w-full max-w-lg rounded-t-2xl p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-4 dark:border-[#27272A]">
          <h2
            id="block-modal-title"
            className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]"
          >
            {initialTask ? 'Edit Task & Time Block' : 'Schedule Time Block'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E22] dark:hover:text-[#FAFAFA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <label
              htmlFor="block-title"
              className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]"
            >
              Title
            </label>
            <input
              id="block-title"
              type="text"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs your focused attention?"
              className="mt-1.5 w-full border-b border-[#E4E4E7] bg-transparent pb-2 text-base text-[#09090B] placeholder:text-[#A1A1AA] focus:border-b-2 focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1]"
            />
          </div>

          {/* Category segmented control */}
          <div>
            <span className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]">
              Category
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      selected
                        ? 'bg-[#4648d4] text-white dark:bg-[#6366F1]'
                        : 'bg-[#F4F4F5] text-[#27272A] hover:bg-[#E4E4E7] dark:bg-[#1E1E22] dark:text-[#E4E4E7] dark:hover:bg-[#27272A]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration selector */}
          <div>
            <span className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]">
              Duration
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {DURATIONS.map((mins) => {
                const selected = durationMinutes === mins;
                const label =
                  mins < 60
                    ? `${mins}m`
                    : mins % 60 === 0
                      ? `${mins / 60}h`
                      : `${Math.floor(mins / 60)}h ${mins % 60}m`;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-medium tabular-nums transition-colors whitespace-nowrap ${
                      selected
                        ? 'bg-[#4648d4] text-white dark:bg-[#6366F1]'
                        : 'bg-[#F4F4F5] text-[#27272A] hover:bg-[#E4E4E7] dark:bg-[#1E1E22] dark:text-[#E4E4E7] dark:hover:bg-[#27272A]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Start Time */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="block-date"
                className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]"
              >
                Date
              </label>
              <input
                id="block-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] px-3 font-mono text-sm tabular-nums text-[#09090B] focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:focus:border-[#6366F1]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="block-start-time"
                  className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]"
                >
                  Start Time (optional)
                </label>
                {startTime && (
                  <button
                    type="button"
                    onClick={() => setStartTime('')}
                    className="text-xs text-[#71717A] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]"
                  >
                    Unschedule
                  </button>
                )}
              </div>
              <input
                id="block-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] px-3 font-mono text-sm tabular-nums text-[#09090B] focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:focus:border-[#6366F1]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="block-notes"
              className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]"
            >
              Notes (optional)
            </label>
            <textarea
              id="block-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Success criteria or links for this session..."
              className="mt-1.5 w-full resize-none rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2 text-sm text-[#09090B] placeholder:text-[#A1A1AA] focus:border-[#4648d4] focus:bg-[#FFFFFF] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1] dark:focus:bg-[#111114]"
            />
          </div>

          {/* Priority toggle */}
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E4E4E7] px-3.5 py-2.5 dark:border-[#27272A]">
            <span className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
              Mark as Top Priority
            </span>
            <input
              type="checkbox"
              checked={priority}
              onChange={(e) => setPriority(e.target.checked)}
              className="h-4 w-4 accent-[#4648d4] dark:accent-[#6366F1]"
            />
          </label>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-[#F4F4F5] pt-4 dark:border-[#27272A]">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-5 text-sm font-medium text-[#09090B] transition-colors hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#FAFAFA] dark:hover:bg-[#27272A] whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-11 rounded-full bg-[#4648d4] px-6 text-sm font-medium text-white transition-all hover:bg-[#3b3dc2] active:scale-[0.98] dark:bg-[#6366F1] dark:hover:bg-[#5558e6] whitespace-nowrap"
            >
              {initialTask ? 'Save Changes' : 'Save Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
