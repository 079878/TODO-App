import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  RotateCcw,
  SlidersHorizontal,
  Square,
} from 'lucide-react';
import {
  ChatMessage,
  ChatModelMode,
  ChatRolePreset,
  Habit,
  PlannerTask,
} from '../types/planner';
import { formatClockTime, formatDuration } from '../utils/time';

interface ChatViewProps {
  selectedDate: string;
  tasks: PlannerTask[];
  habits: Habit[];
  messages: ChatMessage[];
  onUpdateMessages: (
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => void;
}

const ROLE_PRESETS: ChatRolePreset[] = [
  {
    id: 'architect',
    name: 'Day Architect',
    summary: 'Time-blocking & schedule structure',
    systemInstruction:
      'You are Dayflow Day Architect, a calm, pragmatic scheduling strategist. Help the user convert unscheduled tasks into realistic chronological time blocks between 07:00 and 21:00, protect deep work windows, and keep buffer time between meetings.',
  },
  {
    id: 'coach',
    name: 'Focus Coach',
    summary: 'Sprint scoping & anti-procrastination',
    systemInstruction:
      'You are Dayflow Focus Coach, a direct, encouraging productivity partner. Help the user break overwhelming tasks into concrete 25-to-45 minute sprints with an unmistakable first physical action and clear done criteria.',
  },
  {
    id: 'strategist',
    name: 'Evening Strategist',
    summary: 'Prioritization & workload triage',
    systemInstruction:
      'You are Dayflow Evening Strategist, an analytical reflection partner. Help the user review completed vs unfinished tasks, identify overcommitment or meeting creep, and choose a single non-negotiable priority for tomorrow.',
  },
];

const STARTER_PROMPTS = [
  'Suggest time blocks for my unscheduled tasks today',
  'Help me break my top priority into a 45m focus sprint',
  'Where is my schedule overloaded or fragmented today?',
  'Draft an evening reset checklist based on what is left',
];

export const ChatView: React.FC<ChatViewProps> = ({
  selectedDate,
  tasks,
  habits,
  messages,
  onUpdateMessages,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('architect');
  const [customInstruction, setCustomInstruction] = useState<string>(
    ROLE_PRESETS[0].systemInstruction
  );
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [mode, setMode] = useState<ChatModelMode>('general');
  const [includeAgendaContext, setIncludeAgendaContext] = useState(true);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const activePreset =
    ROLE_PRESETS.find((r) => r.id === selectedRoleId) || ROLE_PRESETS[0];

  const handleSelectPreset = (preset: ChatRolePreset) => {
    setSelectedRoleId(preset.id);
    setCustomInstruction(preset.systemInstruction);
  };

  const agendaSnapshot = useMemo(() => {
    const dayTasks = tasks.filter((t) => t.date === selectedDate);
    const scheduled = dayTasks
      .filter((t) => Boolean(t.startTime))
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      .map(
        (t) =>
          `- [${t.completed ? 'x' : ' '}] ${t.startTime} (${formatDuration(
            t.durationMinutes
          )}) ${t.title} [${t.category}${t.priority ? ', Priority' : ''}]`
      );
    const inbox = dayTasks
      .filter((t) => !t.startTime)
      .map(
        (t) =>
          `- [${t.completed ? 'x' : ' '}] (${formatDuration(
            t.durationMinutes
          )}) ${t.title} [${t.category}${t.priority ? ', Priority' : ''}]`
      );
    const dayHabits = habits.map(
      (h) =>
        `- [${h.completedDates[selectedDate] ? 'x' : ' '}] ${h.title} (${
          h.routine
        } @ ${h.targetTime})`
    );

    return [
      `Selected Date: ${selectedDate}`,
      scheduled.length > 0
        ? `Scheduled Time Blocks:\n${scheduled.join('\n')}`
        : 'Scheduled Time Blocks: None yet',
      inbox.length > 0
        ? `Unscheduled Inbox Tasks:\n${inbox.join('\n')}`
        : 'Unscheduled Inbox Tasks: None',
      dayHabits.length > 0
        ? `Daily Rituals:\n${dayHabits.join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }, [selectedDate, tasks, habits]);

  const handleStopStreaming = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  };

  const handleSend = async (promptOverride?: string) => {
    const textToSend = (promptOverride ?? input).trim();
    if (!textToSend || isStreaming) return;

    setErrorMessage(null);
    if (!promptOverride) setInput('');

    const nowClock = formatClockTime(new Date());
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: nowClock,
    };
    const modelMsgId = `msg-m-${Date.now() + 1}`;
    const selectedModelName =
      mode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

    const historyPayload = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    onUpdateMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: modelMsgId,
        role: 'model',
        text: '',
        timestamp: nowClock,
        modelUsed: selectedModelName,
      },
    ]);

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          mode,
          systemInstruction: customInstruction,
          plannerContext: includeAgendaContext ? agendaSnapshot : undefined,
        }),
      });

      if (!response.ok) {
        let errText = `Request failed (${response.status})`;
        try {
          const errJson = (await response.json()) as { error?: string };
          if (errJson?.error) errText = errJson.error;
        } catch {
          // Keep fallback status message
        }
        throw new Error(errText);
      }

      if (!response.body) {
        throw new Error('Streaming response body unavailable.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          const lines = evt
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim());

          for (const jsonLine of lines) {
            if (!jsonLine) continue;
            const parsed = JSON.parse(jsonLine) as {
              type: 'chunk' | 'done' | 'error';
              text?: string;
              error?: string;
            };

            if (parsed.type === 'chunk' && parsed.text) {
              onUpdateMessages((prev) =>
                prev.map((m) =>
                  m.id === modelMsgId
                    ? { ...m, text: m.text + parsed.text }
                    : m
                )
              );
            } else if (parsed.type === 'error') {
              throw new Error(parsed.error || 'Gemini response interrupted.');
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User stopped stream manually; keep partial text if any
        onUpdateMessages((prev) =>
          prev.filter((m) => m.id !== modelMsgId || m.text.trim().length > 0)
        );
      } else {
        const msg =
          err instanceof Error ? err.message : 'Unable to reach Gemini.';
        setErrorMessage(msg);
        onUpdateMessages((prev) =>
          prev.filter((m) => m.id !== modelMsgId || m.text.trim().length > 0)
        );
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-[1160px] flex-col gap-4 px-4 py-5 pb-20 sm:px-6 lg:flex-row lg:gap-6 lg:px-8 lg:py-6 lg:pb-6">
      {/* Left Config Column: Role & Model Controls */}
      <aside className="elevation-card flex shrink-0 flex-col justify-between rounded-2xl p-5 lg:w-80">
        <div className="space-y-5">
          <div className="border-b border-[#F4F4F5] pb-4 dark:border-[#1E1E22]">
            <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]">
              Planning Assistant
            </h2>
            <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
              Multi-turn Gemini partner with custom roles
            </p>
          </div>

          {/* Role Selector */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#464554] dark:text-[#A1A1AA]">
                Assistant Role
              </span>
              <button
                type="button"
                onClick={() => setShowRoleEditor((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-[#4648d4] hover:underline dark:text-[#A5B4FC]"
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>{showRoleEditor ? 'Hide prompt' : 'Customize'}</span>
              </button>
            </div>

            <div className="mt-2 space-y-1.5">
              {ROLE_PRESETS.map((preset) => {
                const active = preset.id === selectedRoleId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-[#4648d4]/40 bg-[#F4F2FD] dark:border-[#6366F1]/50 dark:bg-[#6366F1]/15'
                        : 'border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#09090B] dark:hover:bg-[#18181B]'
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        active
                          ? 'text-[#4648d4] dark:text-[#A5B4FC]'
                          : 'text-[#09090B] dark:text-[#FAFAFA]'
                      }`}
                    >
                      {preset.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                      {preset.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {showRoleEditor && (
            <div>
              <label
                htmlFor="system-instruction-input"
                className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]"
              >
                System Instruction
              </label>
              <textarea
                id="system-instruction-input"
                rows={4}
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                className="mt-1.5 w-full resize-none rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2 text-xs leading-relaxed text-[#09090B] focus:border-[#4648d4] focus:bg-[#FFFFFF] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:focus:border-[#6366F1] dark:focus:bg-[#18181B]"
              />
            </div>
          )}

          {/* Speed / Depth Toggle */}
          <div>
            <span className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]">
              Response Mode
            </span>
            <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl bg-[#F4F4F5] p-1 dark:bg-[#18181B]">
              <button
                type="button"
                onClick={() => setMode('general')}
                className={`rounded-lg px-3 py-2 text-left transition-colors ${
                  mode === 'general'
                    ? 'bg-[#FFFFFF] text-[#09090B] shadow-xs dark:bg-[#27272A] dark:text-[#FAFAFA]'
                    : 'text-[#71717A] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                }`}
              >
                <div className="text-xs font-semibold">Balanced</div>
                <div className="font-mono text-[10px] text-[#71717A] dark:text-[#A1A1AA]">
                  gemini-4-hydrogen
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('fast')}
                className={`rounded-lg px-3 py-2 text-left transition-colors ${
                  mode === 'fast'
                    ? 'bg-[#FFFFFF] text-[#09090B] shadow-xs dark:bg-[#27272A] dark:text-[#FAFAFA]'
                    : 'text-[#71717A] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                }`}
              >
                <div className="text-xs font-semibold">Fast</div>
                <div className="font-mono text-[10px] text-[#71717A] dark:text-[#A1A1AA]">
                  3.1-flash-lite
                </div>
              </button>
            </div>
          </div>

          {/* Agenda Context Toggle */}
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E4E4E7] px-3.5 py-2.5 dark:border-[#27272A]">
            <div>
              <span className="block text-xs font-medium text-[#09090B] dark:text-[#FAFAFA]">
                Share {selectedDate} agenda
              </span>
              <span className="block text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                Include tasks, blocks &amp; habits
              </span>
            </div>
            <input
              type="checkbox"
              checked={includeAgendaContext}
              onChange={(e) => setIncludeAgendaContext(e.target.checked)}
              className="h-4 w-4 accent-[#4648d4] dark:accent-[#6366F1]"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isStreaming) handleStopStreaming();
            onUpdateMessages([]);
            setErrorMessage(null);
          }}
          disabled={messages.length === 0}
          className="mt-5 flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-4 text-xs font-medium text-[#27272A] transition-colors hover:bg-[#F4F4F5] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#E4E4E7] dark:hover:bg-[#27272A] whitespace-nowrap"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>New Thread</span>
        </button>
      </aside>

      {/* Right Main Column: Scrollable Chat Thread & Input */}
      <section
        aria-label="Conversation Thread"
        className="elevation-card flex min-h-[460px] flex-1 flex-col overflow-hidden rounded-2xl"
      >
        {/* Thread Header */}
        <div className="flex items-center justify-between border-b border-[#F4F4F5] px-5 py-3.5 dark:border-[#1E1E22] sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#09090B] dark:text-[#FAFAFA]">
              {activePreset.name}
            </p>
            <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              <span className="mx-1.5 text-[#D4D4D8] dark:text-[#3F3F46]">
                ·
              </span>
              <span className="font-mono">
                {mode === 'fast'
                  ? 'gemini-3.1-flash-lite'
                  : 'gemini-4-hydrogen'}
              </span>
            </p>
          </div>
        </div>

        {/* Scrollable Message History */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <p className="font-display text-base font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                Start a planning conversation
              </p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">
                Ask {activePreset.name} to organize your day, break down a deep
                work block, or audit your schedule.
              </p>

              <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void handleSend(prompt)}
                    className="rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] px-4 py-3 text-left text-xs font-medium text-[#27272A] transition-colors hover:border-[#4648d4]/40 hover:bg-[#F4F2FD] hover:text-[#4648d4] dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#E4E4E7] dark:hover:border-[#6366F1]/50 dark:hover:bg-[#6366F1]/15 dark:hover:text-[#A5B4FC]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isUser ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
                    <span className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                      {isUser ? 'You' : activePreset.name}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{msg.timestamp}</span>
                    {!isUser && msg.modelUsed && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{msg.modelUsed}</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[78%] ${
                      isUser
                        ? 'bg-[#4648d4] text-white dark:bg-[#6366F1]'
                        : 'border border-[#E4E4E7] bg-[#FAFAFA] text-[#09090B] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#FAFAFA]'
                    }`}
                  >
                    {msg.text || (
                      <span className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
                        Thinking...
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mx-5 mb-3 flex items-start gap-2 rounded-xl border border-[#ba1a1a]/30 bg-[#ffdad6]/50 px-3.5 py-2.5 text-xs text-[#93000a] dark:border-[#f87171]/30 dark:bg-[#7f1d1d]/30 dark:text-[#fecaca] sm:mx-6"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="border-t border-[#F4F4F5] px-4 py-3 dark:border-[#1E1E22] sm:px-6 sm:py-4"
        >
          <div className="flex items-end gap-3">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activePreset.name}... (Enter to send, Shift+Enter for new line)`}
              aria-label="Message Gemini assistant"
              className="max-h-36 min-h-[44px] flex-1 resize-none border-b border-[#E4E4E7] bg-transparent py-2.5 text-base text-[#09090B] placeholder:text-[#A1A1AA] focus:border-b-2 focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1]"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopStreaming}
                aria-label="Stop response"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E4E4E7] bg-[#FFFFFF] text-[#09090B] transition-colors hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#FAFAFA] dark:hover:bg-[#27272A]"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#4648d4] text-white transition-all hover:bg-[#3b3dc2] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#6366F1] dark:hover:bg-[#5558e6]"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
};
