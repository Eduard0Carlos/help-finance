"use client";

export interface QueuedMutation {
  id: string;
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: string;
  headers?: Record<string, string>;
  createdAt: number;
}

const STORAGE_KEY = "hf.offline.queue";

function readQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMutation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent("hf-queue-updated"));
}

function buildQueueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOfflineQueueCount() {
  return readQueue().length;
}

export function subscribeQueueUpdates(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("hf-queue-updated", listener);
  return () => window.removeEventListener("hf-queue-updated", listener);
}

function enqueueMutation(payload: Omit<QueuedMutation, "id" | "createdAt">) {
  const queue = readQueue();
  queue.push({
    ...payload,
    id: buildQueueId(),
    createdAt: Date.now(),
  });
  saveQueue(queue);
}

export async function flushOfflineQueue() {
  if (typeof window === "undefined" || !navigator.onLine) return { flushed: 0, pending: 0 };

  const queue = readQueue();
  if (queue.length === 0) return { flushed: 0, pending: 0 };

  let flushed = 0;
  const pending: QueuedMutation[] = [];

  for (const mutation of queue) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body,
      });
      if (!response.ok) {
        pending.push(mutation);
        // Keep order and stop early when backend rejects.
        pending.push(...queue.slice(flushed + pending.length));
        break;
      }
      flushed++;
    } catch {
      pending.push(mutation);
      pending.push(...queue.slice(flushed + pending.length));
      break;
    }
  }

  if (pending.length === 0 && flushed === queue.length) {
    saveQueue([]);
  } else if (pending.length > 0) {
    saveQueue(pending);
  }

  return { flushed, pending: pending.length };
}

export async function performMutationWithOfflineQueue(options: {
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}) {
  const headers = options.headers ?? { "Content-Type": "application/json" };
  const bodyString =
    options.body === undefined
      ? undefined
      : typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueueMutation({
      url: options.url,
      method: options.method,
      headers,
      body: bodyString,
    });
    return { ok: true, queued: true };
  }

  try {
    const response = await fetch(options.url, {
      method: options.method,
      headers,
      body: bodyString,
    });
    if (!response.ok) {
      return { ok: false, queued: false, response };
    }
    return { ok: true, queued: false, response };
  } catch {
    enqueueMutation({
      url: options.url,
      method: options.method,
      headers,
      body: bodyString,
    });
    return { ok: true, queued: true };
  }
}
