export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  mimeType?: string;
  filename?: string;
  body?: {
    data?: string;
    size?: number;
  };
  parts?: GmailMessagePart[];
}

export interface GmailRawMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailMessageHeader[];
    mimeType?: string;
    body?: {
      data?: string;
      size?: number;
    };
    parts?: GmailMessagePart[];
  };
}

export interface ParsedGmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  bodyText: string;
  isUnread: boolean;
  isStarred: boolean;
  labelIds: string[];
}

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

function decodeBase64Url(encoded: string): string {
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

function encodeBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function extractBodyText(payload?: GmailRawMessage['payload']): string {
  if (!payload) return '';

  const findPart = (
    parts: GmailMessagePart[] | undefined,
    targetMime: string
  ): string | null => {
    if (!parts) return null;
    for (const part of parts) {
      if (part.mimeType === targetMime && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.parts) {
        const nested = findPart(part.parts, targetMime);
        if (nested) return nested;
      }
    }
    return null;
  };

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  const plain = findPart(payload.parts, 'text/plain');
  if (plain) return plain;

  const html =
    payload.mimeType === 'text/html' && payload.body?.data
      ? decodeBase64Url(payload.body.data)
      : findPart(payload.parts, 'text/html');

  if (html) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  return '';
}

function getHeader(
  headers: GmailMessageHeader[] | undefined,
  name: string
): string {
  if (!headers) return '';
  const target = name.toLowerCase();
  const match = headers.find((h) => h.name.toLowerCase() === target);
  return match?.value || '';
}

export function parseGmailMessage(raw: GmailRawMessage): ParsedGmailMessage {
  const headers = raw.payload?.headers;
  const labelIds = raw.labelIds || [];
  const bodyText = extractBodyText(raw.payload);

  return {
    id: raw.id,
    threadId: raw.threadId,
    subject: getHeader(headers, 'Subject') || '(No subject)',
    from: getHeader(headers, 'From') || 'Unknown sender',
    to: getHeader(headers, 'To') || '',
    date: getHeader(headers, 'Date') || '',
    snippet: raw.snippet || '',
    bodyText: bodyText || raw.snippet || '',
    isUnread: labelIds.includes('UNREAD'),
    isStarred: labelIds.includes('STARRED'),
    labelIds,
  };
}

async function gmailFetch<T>(
  url: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = `Gmail API request failed (${res.status})`;
    try {
      const errJson = (await res.json()) as {
        error?: { message?: string; code?: number };
      };
      if (errJson?.error?.message) {
        detail = errJson.error.message;
      }
    } catch {
      // Keep status error
    }
    const err = new Error(detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}

export async function listGmailMessages(
  token: string,
  options: {
    labelId?: string;
    query?: string;
    maxResults?: number;
  }
): Promise<ParsedGmailMessage[]> {
  const params = new URLSearchParams();
  params.set('maxResults', String(options.maxResults ?? 15));
  if (options.labelId && options.labelId !== 'ALL') {
    params.set('labelIds', options.labelId);
  }
  if (options.query && options.query.trim()) {
    params.set('q', options.query.trim());
  }

  const listRes = await gmailFetch<{
    messages?: { id: string; threadId: string }[];
  }>(`${GMAIL_BASE}/messages?${params.toString()}`, token);

  const stubs = listRes.messages || [];
  if (stubs.length === 0) return [];

  const details = await Promise.all(
    stubs.map((m) =>
      gmailFetch<GmailRawMessage>(
        `${GMAIL_BASE}/messages/${m.id}?format=full`,
        token
      )
    )
  );

  return details.map(parseGmailMessage);
}

export async function modifyGmailLabels(
  token: string,
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[]
): Promise<void> {
  await gmailFetch(`${GMAIL_BASE}/messages/${messageId}/modify`, token, {
    method: 'POST',
    body: JSON.stringify({ addLabelIds, removeLabelIds }),
  });
}

export async function trashGmailMessage(
  token: string,
  messageId: string
): Promise<void> {
  await gmailFetch(`${GMAIL_BASE}/messages/${messageId}/trash`, token, {
    method: 'POST',
  });
}

export async function sendGmailMessage(
  token: string,
  payload: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
  }
): Promise<void> {
  const lines = [
    `To: ${payload.to.trim()}`,
    `Subject: ${payload.subject.trim()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    payload.body,
  ];
  const raw = encodeBase64Url(lines.join('\r\n'));

  await gmailFetch(`${GMAIL_BASE}/messages/send`, token, {
    method: 'POST',
    body: JSON.stringify({
      raw,
      ...(payload.threadId ? { threadId: payload.threadId } : {}),
    }),
  });
}
