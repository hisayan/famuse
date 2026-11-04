import { useCallback, useEffect, useRef, useState } from 'react';
import { connect } from 'void/ws';
import { randomId } from '../lib/id';
import type {
  Attachment,
  ChatMessage,
  ConnectionStatus,
  OnlinePresence,
} from '../../shared/types';
import type { ClientRoomEvent, RoomQuickAction } from '../../shared/room-events';

export interface TypingPeer {
  memberId: string;
  name: string;
}

export interface RoomSelf {
  memberId: string;
  name: string;
}

interface UseRoomResult {
  status: ConnectionStatus;
  messages: ChatMessage[];
  pendingIds: string[];
  online: OnlinePresence[];
  typing: TypingPeer[];
  summaries: Record<string, unknown>;
  quickActions: RoomQuickAction[];
  catchUp: string | null;
  catchUpPending: boolean;
  error: string | null;
  send: (text: string, attachments: Attachment[]) => void;
  sendTyping: (typing: boolean) => void;
  requestCatchUp: () => void;
  dismissCatchUp: () => void;
  dismissError: () => void;
}

const TYPING_EXPIRY_MS = 4000;

export function useRoom(channelId: string, self: RoomSelf | null): UseRoomResult {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [online, setOnline] = useState<OnlinePresence[]>([]);
  const [typing, setTyping] = useState<TypingPeer[]>([]);
  const [summaries, setSummaries] = useState<Record<string, unknown>>({});
  const [quickActions, setQuickActions] = useState<RoomQuickAction[]>([]);
  const [catchUp, setCatchUp] = useState<string | null>(null);
  const [catchUpPending, setCatchUpPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<ReturnType<typeof connect> | null>(null);
  const authFailedRef = useRef(false);
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const typingSent = useRef(false);
  const typingIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selfRef = useRef(self);
  selfRef.current = self;

  const clearTypingTimers = useCallback(() => {
    for (const timer of typingTimers.current.values()) clearTimeout(timer);
    typingTimers.current.clear();
    if (typingIdleTimer.current) {
      clearTimeout(typingIdleTimer.current);
      typingIdleTimer.current = null;
    }
    typingSent.current = false;
  }, []);

  // Load durable history, then open the live room socket.
  useEffect(() => {
    let cancelled = false;
    const historyController = new AbortController();

    setStatus('connecting');
    setMessages([]);
    setPendingIds([]);
    setOnline([]);
    setTyping([]);
    setSummaries({});
    setQuickActions([]);
    setCatchUp(null);
    setCatchUpPending(false);
    setError(null);
    authFailedRef.current = false;
    clearTypingTimers();

    fetch(`/api/channels/${encodeURIComponent(channelId)}/messages`, {
      signal: historyController.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`History request failed (${response.status}).`);
        const history = (await response.json()) as ChatMessage[];
        if (!cancelled) setMessages(history);
      })
      .catch((fetchError: unknown) => {
        if (cancelled || (fetchError instanceof DOMException && fetchError.name === 'AbortError')) {
          return;
        }
        console.error('[famuse] History load failed.', fetchError);
        if (!cancelled) setError('Could not load recent messages. Live updates still work.');
      });

    const socket = connect('/rooms/:channel', {
      params: { channel: channelId },
      reconnect: true,
    });
    socketRef.current = socket;

    const offOpen = socket.on('open', () => {
      if (cancelled) return;
      setStatus('live');
      socket.send({ type: 'room.context.request' });
    });
    const offClose = socket.on('close', (event) => {
      if (cancelled || authFailedRef.current) return;
      if (event.code === 4401 || event.code === 4403) {
        // Auth failures never heal by retrying: stop the socket instead of
        // looping forever, and point the user at a fresh sign-in.
        authFailedRef.current = true;
        socket.close();
        setStatus('offline');
        setError('Your session ended. Refresh the page to sign in again.');
        return;
      }
      setStatus('reconnecting');
    });
    const offError = socket.on('error', (socketError) => {
      if (cancelled) return;
      // Transport noise (dev restarts, network blips) while VoidSocket keeps
      // retrying underneath; real failures surface as room.error events.
      console.debug('[famuse] Room socket error.', socketError);
      setStatus((current) => (current === 'live' ? current : 'reconnecting'));
    });
    const offMessage = socket.on('message', (event) => {
      if (cancelled) return;
      switch (event.type) {
        case 'room.message.new': {
          const incoming = event.message;
          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) return current;
            return [...current, incoming].sort((a, b) => a.createdAt - b.createdAt);
          });
          setPendingIds((current) => current.filter((id) => id !== incoming.id));
          break;
        }
        case 'room.presence': {
          setOnline(event.online);
          break;
        }
        case 'room.typing': {
          if (selfRef.current && event.memberId === selfRef.current.memberId) break;
          setTyping((current) => {
            const others = current.filter((peer) => peer.memberId !== event.memberId);
            return event.typing ? [...others, { memberId: event.memberId, name: event.name }] : others;
          });
          const existing = typingTimers.current.get(event.memberId);
          if (existing) clearTimeout(existing);
          if (event.typing) {
            typingTimers.current.set(
              event.memberId,
              setTimeout(() => {
                setTyping((current) => current.filter((peer) => peer.memberId !== event.memberId));
                typingTimers.current.delete(event.memberId);
              }, TYPING_EXPIRY_MS),
            );
          } else {
            typingTimers.current.delete(event.memberId);
          }
          break;
        }
        case 'room.context': {
          setSummaries(event.summaries);
          setQuickActions(event.quickActions);
          break;
        }
        case 'room.context.updated': {
          setSummaries(event.summaries);
          break;
        }
        case 'room.catchup.result': {
          setCatchUp(event.text);
          setCatchUpPending(false);
          break;
        }
        case 'room.error': {
          setError(event.message);
          setCatchUpPending(false);
          break;
        }
      }
    });

    return () => {
      cancelled = true;
      historyController.abort();
      clearTypingTimers();
      offOpen();
      offMessage();
      offClose();
      offError();
      socket.close();
      socketRef.current = null;
    };
  }, [channelId, clearTypingTimers]);

  const send = useCallback(
    (text: string, attachments: Attachment[]) => {
      const socket = socketRef.current;
      const currentSelf = selfRef.current;
      if (!socket || !currentSelf) return;
      const trimmed = text.trim();
      if (!trimmed && attachments.length === 0) return;
      const id = randomId();
      const outgoing: ClientRoomEvent = {
        type: 'room.message.send',
        id,
        text: trimmed.slice(0, 2000),
        attachments,
      };
      const optimistic: ChatMessage = {
        id,
        channelId,
        senderId: currentSelf.memberId,
        senderName: currentSelf.name,
        text: outgoing.text,
        isAi: false,
        attachments,
        createdAt: Date.now(),
      };
      setMessages((current) => [...current, optimistic]);
      setPendingIds((current) => [...current, id]);
      socket.send(outgoing);
      if (typingSent.current) {
        typingSent.current = false;
        socket.send({ type: 'room.typing', typing: false });
      }
    },
    [channelId],
  );

  const sendTyping = useCallback((typing: boolean) => {
    const socket = socketRef.current;
    if (!socket) return;
    if (typingIdleTimer.current) {
      clearTimeout(typingIdleTimer.current);
      typingIdleTimer.current = null;
    }
    if (typing) {
      if (!typingSent.current) {
        typingSent.current = true;
        socket.send({ type: 'room.typing', typing: true });
      }
      typingIdleTimer.current = setTimeout(() => {
        typingSent.current = false;
        socket.send({ type: 'room.typing', typing: false });
      }, 2500);
    } else if (typingSent.current) {
      typingSent.current = false;
      socket.send({ type: 'room.typing', typing: false });
    }
  }, []);

  const requestCatchUp = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    setCatchUp(null);
    setCatchUpPending(true);
    socket.send({ type: 'room.catchup.request' });
  }, []);

  const dismissCatchUp = useCallback(() => {
    setCatchUp(null);
    setCatchUpPending(false);
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  return {
    status,
    messages,
    pendingIds,
    online,
    typing,
    summaries,
    quickActions,
    catchUp,
    catchUpPending,
    error,
    send,
    sendTyping,
    requestCatchUp,
    dismissCatchUp,
    dismissError,
  };
}
