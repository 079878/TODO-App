import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  Archive,
  CalendarPlus,
  CheckCircle2,
  LogOut,
  Mail,
  MailOpen,
  PenSquare,
  RefreshCw,
  Reply,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  listGmailMessages,
  modifyGmailLabels,
  ParsedGmailMessage,
  sendGmailMessage,
  trashGmailMessage,
} from '../services/gmailApi';
import {
  clearCachedToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logoutGmail,
} from '../services/gmailAuth';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GmailViewProps {
  selectedDate: string;
  onAddTaskFromEmail: (payload: {
    title: string;
    notes: string;
  }) => void;
}

type MailboxFilter = 'INBOX' | 'UNREAD' | 'STARRED' | 'SENT';

interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void>;
}

const MAILBOX_TABS: { id: MailboxFilter; label: string }[] = [
  { id: 'INBOX', label: 'Inbox' },
  { id: 'UNREAD', label: 'Unread' },
  { id: 'STARRED', label: 'Starred' },
  { id: 'SENT', label: 'Sent' },
];

function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return match ? match[1] : fromHeader.trim();
}

function extractSenderName(fromHeader: string): string {
  const idx = fromHeader.indexOf('<');
  if (idx > 0) {
    return fromHeader.slice(0, idx).replace(/["']/g, '').trim();
  }
  return fromHeader.trim();
}

export const GmailView: React.FC<GmailViewProps> = ({
  selectedDate,
  onAddTaskFromEmail,
}) => {
  const [needsAuth, setNeedsAuth] = useState<boolean>(() => !getAccessToken());
  const [user, setUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [mailbox, setMailbox] = useState<MailboxFilter>('INBOX');
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [messages, setMessages] = useState<ParsedGmailMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeThreadId, setComposeThreadId] = useState<string | undefined>(
    undefined
  );

  const [pendingConfirm, setPendingConfirm] =
    useState<PendingConfirmation | null>(null);
  const [isConfirmBusy, setIsConfirmBusy] = useState(false);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => setStatusNotice(null), 3200);
  };

  const fetchMessages = useCallback(
    async (tokenOverride?: string) => {
      const token = tokenOverride || getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);
      try {
        const list = await listGmailMessages(token, {
          labelId: mailbox,
          query: activeQuery,
          maxResults: 15,
        });
        setMessages(list);
        setSelectedId((prev) =>
          prev && list.some((m) => m.id === prev) ? prev : list[0]?.id || null
        );
      } catch (err) {
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403) {
          clearCachedToken();
          setNeedsAuth(true);
          setErrorMsg(
            'Your Gmail session expired or requires permission. Please sign in with Google again.'
          );
        } else {
          setErrorMsg(
            err instanceof Error ? err.message : 'Unable to load Gmail messages.'
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [mailbox, activeQuery]
  );

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setNeedsAuth(false);
        void fetchMessages(token);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, [fetchMessages]);

  const handleLogin = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      setUser(res.user);
      setNeedsAuth(false);
      await fetchMessages(res.accessToken);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGmail();
    setUser(null);
    setMessages([]);
    setSelectedId(null);
    setNeedsAuth(true);
  };

  const selectedMessage =
    messages.find((m) => m.id === selectedId) || null;

  const openCompose = (replyTo?: ParsedGmailMessage) => {
    if (replyTo) {
      setComposeTo(extractEmailAddress(replyTo.from));
      setComposeSubject(
        replyTo.subject.toLowerCase().startsWith('re:')
          ? replyTo.subject
          : `Re: ${replyTo.subject}`
      );
      setComposeBody('');
      setComposeThreadId(replyTo.threadId);
    } else {
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setComposeThreadId(undefined);
    }
    setComposeOpen(true);
  };

  const requestSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim()) return;

    setPendingConfirm({
      title: 'Send email via Gmail?',
      description: `Send "${composeSubject.trim()}" to ${composeTo.trim()}?`,
      confirmLabel: 'Send Email',
      onConfirm: async () => {
        const token = getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }
        await sendGmailMessage(token, {
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
          threadId: composeThreadId,
        });
        setComposeOpen(false);
        showNotice(`Sent email to ${composeTo.trim()}`);
        await fetchMessages(token);
      },
    });
  };

  const requestToggleRead = (msg: ParsedGmailMessage) => {
    const markAsRead = msg.isUnread;
    setPendingConfirm({
      title: markAsRead ? 'Mark email as read?' : 'Mark email as unread?',
      description: `Update Gmail read status for "${msg.subject}"?`,
      confirmLabel: markAsRead ? 'Mark Read' : 'Mark Unread',
      onConfirm: async () => {
        const token = getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }
        await modifyGmailLabels(
          token,
          msg.id,
          markAsRead ? [] : ['UNREAD'],
          markAsRead ? ['UNREAD'] : []
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, isUnread: !markAsRead } : m
          )
        );
        showNotice(markAsRead ? 'Marked as read' : 'Marked as unread');
      },
    });
  };

  const requestArchive = (msg: ParsedGmailMessage) => {
    setPendingConfirm({
      title: 'Archive email in Gmail?',
      description: `Remove "${msg.subject}" from your Gmail Inbox? You can still find it in All Mail.`,
      confirmLabel: 'Archive Email',
      onConfirm: async () => {
        const token = getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }
        await modifyGmailLabels(token, msg.id, [], ['INBOX']);
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        if (selectedId === msg.id) setSelectedId(null);
        showNotice('Archived email from Inbox');
      },
    });
  };

  const requestTrash = (msg: ParsedGmailMessage) => {
    setPendingConfirm({
      title: 'Move email to Gmail Trash?',
      description: `Move "${msg.subject}" from ${extractSenderName(msg.from)} to Trash?`,
      confirmLabel: 'Move to Trash',
      isDestructive: true,
      onConfirm: async () => {
        const token = getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }
        await trashGmailMessage(token, msg.id);
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        if (selectedId === msg.id) setSelectedId(null);
        showNotice('Moved email to Trash');
      },
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirm) return;
    setIsConfirmBusy(true);
    setErrorMsg(null);
    try {
      await pendingConfirm.onConfirm();
      setPendingConfirm(null);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        clearCachedToken();
        setNeedsAuth(true);
      }
      setErrorMsg(
        err instanceof Error ? err.message : 'Gmail action failed.'
      );
      setPendingConfirm(null);
    } finally {
      setIsConfirmBusy(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="mx-auto flex max-w-[680px] flex-col items-center justify-center px-4 py-16 pb-24 sm:px-6">
        <div className="elevation-card w-full rounded-2xl p-8 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F2FD] text-[#4648d4] dark:bg-[#6366F1]/15 dark:text-[#A5B4FC]">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-xl font-semibold tracking-[-0.02em] text-[#09090B] dark:text-[#FAFAFA]">
            Connect your Gmail inbox
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">
            Sign in with Google to read your inbox, turn actionable emails into
            scheduled Dayflow tasks, and send replies without leaving your daily
            workspace.
          </p>

          {errorMsg && (
            <div
              role="alert"
              className="mx-auto mt-5 flex max-w-md items-start gap-2 rounded-xl border border-[#ba1a1a]/30 bg-[#ffdad6]/50 px-3.5 py-2.5 text-left text-xs text-[#93000a] dark:border-[#f87171]/30 dark:bg-[#7f1d1d]/30 dark:text-[#fecaca]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="mt-7 flex justify-center">
            <GoogleSignInButton
              onClick={() => void handleLogin()}
              disabled={isSigningIn}
              label={isSigningIn ? 'Signing in...' : 'Sign in with Google'}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-8">
      {/* Top Account & Search Toolbar */}
      <div className="elevation-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-[#F4F4F5] p-1 dark:bg-[#18181B]">
            {MAILBOX_TABS.map((tab) => {
              const active = mailbox === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMailbox(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#FFFFFF] text-[#09090B] shadow-xs dark:bg-[#27272A] dark:text-[#FAFAFA]'
                      : 'text-[#71717A] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActiveQuery(searchInput);
            }}
            className="relative flex items-center"
          >
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#A1A1AA]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Gmail..."
              aria-label="Search Gmail messages"
              className="h-9 w-48 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] pl-8 pr-7 text-xs text-[#09090B] placeholder:text-[#A1A1AA] focus:border-[#4648d4] focus:bg-[#FFFFFF] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1] sm:w-64"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setActiveQuery('');
                }}
                aria-label="Clear search"
                className="absolute right-2 text-[#71717A] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user?.email && (
            <span className="hidden text-xs text-[#71717A] dark:text-[#A1A1AA] md:inline">
              {user.email}
            </span>
          )}
          <button
            type="button"
            onClick={() => void fetchMessages()}
            disabled={isLoading}
            aria-label="Refresh Gmail"
            className="flex h-9 items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-3.5 text-xs font-medium text-[#27272A] transition-colors hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#E4E4E7] dark:hover:bg-[#27272A] whitespace-nowrap"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => openCompose()}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#4648d4] px-4 text-xs font-medium text-white transition-all hover:bg-[#3b3dc2] active:scale-[0.98] dark:bg-[#6366F1] dark:hover:bg-[#5558e6] whitespace-nowrap"
          >
            <PenSquare className="h-3.5 w-3.5" />
            <span>Compose</span>
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Sign out of Google"
            aria-label="Sign out of Google"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E4E7] bg-[#FFFFFF] text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#FAFAFA]"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Status / Error Notifications */}
      {statusNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-[#10B981]/35 bg-[#ECFDF5] px-4 py-2.5 text-xs font-medium text-[#006c49] dark:border-[#10B981]/30 dark:bg-[#064E3B]/30 dark:text-[#34D399]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[#ba1a1a]/30 bg-[#ffdad6]/50 px-4 py-3 text-xs text-[#93000a] dark:border-[#f87171]/30 dark:bg-[#7f1d1d]/30 dark:text-[#fecaca]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Split Mail List & Reader */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Thread List */}
        <section
          aria-label="Gmail Message List"
          className="elevation-card overflow-hidden rounded-2xl lg:col-span-5"
        >
          <div className="border-b border-[#F4F4F5] px-5 py-3.5 dark:border-[#1E1E22]">
            <p className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
              {isLoading
                ? 'Syncing messages...'
                : `${messages.length} messages in ${mailbox.toLowerCase()}`}
            </p>
          </div>

          <div className="max-h-[600px] divide-y divide-[#F4F4F5] overflow-y-auto dark:divide-[#1E1E22]">
            {isLoading && messages.length === 0 ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3, 4].map((row) => (
                  <div
                    key={row}
                    className="h-16 animate-pulse rounded-xl bg-[#F4F4F5] dark:bg-[#18181B]"
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                  No messages found
                </p>
                <p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                  Try another label filter or search query.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const active = msg.id === selectedId;
                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => setSelectedId(msg.id)}
                    className={`w-full px-5 py-3.5 text-left transition-colors ${
                      active
                        ? 'bg-[#F4F2FD] dark:bg-[#6366F1]/15'
                        : 'hover:bg-[#FAFAFA] dark:hover:bg-[#18181B]/70'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-xs ${
                          msg.isUnread
                            ? 'font-semibold text-[#4648d4] dark:text-[#A5B4FC]'
                            : 'font-medium text-[#71717A] dark:text-[#A1A1AA]'
                        }`}
                      >
                        {extractSenderName(msg.from)}
                        {msg.isUnread ? ' · Unread' : ''}
                      </span>
                    </div>
                    <p
                      className={`mt-1 truncate text-sm ${
                        msg.isUnread
                          ? 'font-semibold text-[#09090B] dark:text-[#FAFAFA]'
                          : 'font-medium text-[#27272A] dark:text-[#E4E4E7]'
                      }`}
                    >
                      {msg.subject}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#71717A] dark:text-[#A1A1AA]">
                      {msg.snippet}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Right Reader Pane */}
        <section
          aria-label="Email Reader"
          className="elevation-card flex min-h-[420px] flex-col rounded-2xl p-6 lg:col-span-7"
        >
          {!selectedMessage ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <Mail className="h-7 w-7 text-[#A1A1AA]" />
              <p className="mt-3 text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                Select an email to read
              </p>
              <p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                You can convert any message directly into a task for{' '}
                {selectedDate}.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-[#F4F4F5] pb-4 dark:border-[#1E1E22]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-[#09090B] dark:text-[#FAFAFA]">
                    {selectedMessage.subject}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      onAddTaskFromEmail({
                        title: `Email: ${selectedMessage.subject}`,
                        notes: `From ${extractSenderName(
                          selectedMessage.from
                        )} — ${selectedMessage.snippet}`,
                      });
                      showNotice(`Added task to ${selectedDate}`);
                    }}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#4648d4] px-3.5 text-xs font-medium text-white transition-all hover:bg-[#3b3dc2] active:scale-[0.98] dark:bg-[#6366F1] dark:hover:bg-[#5558e6] whitespace-nowrap"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    <span>Add as Task</span>
                  </button>
                </div>

                <div className="mt-2 space-y-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                  <p>
                    <span className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                      From:
                    </span>{' '}
                    {selectedMessage.from}
                  </p>
                  {selectedMessage.to && (
                    <p>
                      <span className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        To:
                      </span>{' '}
                      {selectedMessage.to}
                    </p>
                  )}
                  {selectedMessage.date && (
                    <p className="font-mono text-[11px] tabular-nums">
                      {selectedMessage.date}
                    </p>
                  )}
                </div>

                {/* Message Action Bar */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCompose(selectedMessage)}
                    className="flex h-8 items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-3 text-xs font-medium text-[#09090B] hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#FAFAFA] dark:hover:bg-[#27272A] whitespace-nowrap"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    <span>Reply</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => requestToggleRead(selectedMessage)}
                    className="flex h-8 items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-3 text-xs font-medium text-[#09090B] hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#FAFAFA] dark:hover:bg-[#27272A] whitespace-nowrap"
                  >
                    <MailOpen className="h-3.5 w-3.5" />
                    <span>
                      {selectedMessage.isUnread ? 'Mark Read' : 'Mark Unread'}
                    </span>
                  </button>
                  {selectedMessage.labelIds.includes('INBOX') && (
                    <button
                      type="button"
                      onClick={() => requestArchive(selectedMessage)}
                      className="flex h-8 items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-3 text-xs font-medium text-[#09090B] hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#FAFAFA] dark:hover:bg-[#27272A] whitespace-nowrap"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span>Archive</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => requestTrash(selectedMessage)}
                    className="flex h-8 items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-3 text-xs font-medium text-[#ba1a1a] hover:bg-[#ffdad6]/50 dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#fca5a5] dark:hover:bg-[#7f1d1d]/30 whitespace-nowrap"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Trash</span>
                  </button>
                </div>
              </div>

              <div className="mt-5 flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-[#27272A] dark:text-[#E4E4E7]">
                {selectedMessage.bodyText}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Compose / Reply Sheet */}
      {composeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#09090B]/40 p-0 backdrop-blur-[2px] dark:bg-black/65 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-modal-title"
          onClick={() => setComposeOpen(false)}
        >
          <div
            className="elevation-sheet w-full max-w-lg rounded-t-2xl p-6 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-4 dark:border-[#27272A]">
              <h2
                id="compose-modal-title"
                className="font-display text-lg font-semibold text-[#09090B] dark:text-[#FAFAFA]"
              >
                {composeThreadId ? 'Reply via Gmail' : 'Compose Email'}
              </h2>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                aria-label="Close compose"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E22] dark:hover:text-[#FAFAFA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={requestSendEmail} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="gmail-to"
                  className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]"
                >
                  To
                </label>
                <input
                  id="gmail-to"
                  type="email"
                  required
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="mt-1 w-full border-b border-[#E4E4E7] bg-transparent pb-2 text-sm text-[#09090B] placeholder:text-[#A1A1AA] focus:border-b-2 focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label
                  htmlFor="gmail-subject"
                  className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]"
                >
                  Subject
                </label>
                <input
                  id="gmail-subject"
                  type="text"
                  required
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Email subject"
                  className="mt-1 w-full border-b border-[#E4E4E7] bg-transparent pb-2 text-sm text-[#09090B] placeholder:text-[#A1A1AA] focus:border-b-2 focus:border-[#4648d4] focus:outline-none dark:border-[#27272A] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label
                  htmlFor="gmail-body"
                  className="block text-xs font-medium text-[#464554] dark:text-[#A1A1AA]"
                >
                  Message
                </label>
                <textarea
                  id="gmail-body"
                  rows={5}
                  required
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your reply..."
                  className="mt-1.5 w-full resize-none rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2.5 text-sm text-[#09090B] placeholder:text-[#A1A1AA] focus:border-[#4648d4] focus:bg-[#FFFFFF] focus:outline-none dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-[#52525B] dark:focus:border-[#6366F1] dark:focus:bg-[#18181B]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#F4F4F5] pt-4 dark:border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="h-10 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-5 text-xs font-medium text-[#09090B] hover:bg-[#F4F4F5] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#FAFAFA] dark:hover:bg-[#27272A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex h-10 items-center gap-1.5 rounded-full bg-[#4648d4] px-5 text-xs font-medium text-white hover:bg-[#3b3dc2] dark:bg-[#6366F1] dark:hover:bg-[#5558e6]"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Review &amp; Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Confirmation Modal for Destructive / Mutating Operations */}
      {pendingConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#09090B]/45 p-4 backdrop-blur-[2px] dark:bg-black/70"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="gmail-confirm-title"
          aria-describedby="gmail-confirm-desc"
        >
          <div className="elevation-sheet w-full max-w-md rounded-2xl p-6">
            <h3
              id="gmail-confirm-title"
              className="font-display text-base font-semibold text-[#09090B] dark:text-[#FAFAFA]"
            >
              {pendingConfirm.title}
            </h3>
            <p
              id="gmail-confirm-desc"
              className="mt-2 text-sm leading-relaxed text-[#464554] dark:text-[#A1A1AA]"
            >
              {pendingConfirm.description}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isConfirmBusy}
                onClick={() => setPendingConfirm(null)}
                className="h-10 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-5 text-xs font-medium text-[#09090B] hover:bg-[#F4F4F5] disabled:opacity-50 dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#FAFAFA] dark:hover:bg-[#27272A]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConfirmBusy}
                onClick={() => void executeConfirmedAction()}
                className={`h-10 rounded-full px-5 text-xs font-medium text-white transition-colors disabled:opacity-50 ${
                  pendingConfirm.isDestructive
                    ? 'bg-[#ba1a1a] hover:bg-[#93000a]'
                    : 'bg-[#4648d4] hover:bg-[#3b3dc2] dark:bg-[#6366F1] dark:hover:bg-[#5558e6]'
                }`}
              >
                {isConfirmBusy ? 'Working...' : pendingConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
