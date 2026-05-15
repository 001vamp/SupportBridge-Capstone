import { useCallback, useEffect, useRef, useState } from "react";
import { getTicket, getTicketMessages } from "../api/http.js";
import { getSocket, joinTicketRoom, leaveTicketRoom, rejoinTicketRoom } from "../api/socket.js";

const DEFAULT_POLL_INTERVAL_MS = 4000;

export function useTicketThread(ticketId, options = {}) {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("offline");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const isMountedRef = useRef(false);
  const hasJoinedRoomRef = useRef(false);

  const refresh = useCallback(async ({ showLoading = false } = {}) => {
    if (!ticketId) return;
    if (showLoading) setIsLoading(true);

    const [ticketData, messagesData] = await Promise.all([
      getTicket(ticketId),
      getTicketMessages(ticketId)
    ]);

    if (!isMountedRef.current) return;
    setTicket(ticketData.ticket);
    setMessages(messagesData.messages);
    setError("");
    setIsLoading(false);
  }, [ticketId]);

  useEffect(() => {
    let isMounted = true;
    isMountedRef.current = true;

    async function loadInitial() {
      setError("");
      setIsLoading(true);
      try {
        const [ticketData, messagesData] = await Promise.all([
          getTicket(ticketId),
          getTicketMessages(ticketId)
        ]);
        if (!isMounted) return;
        setTicket(ticketData.ticket);
        setMessages(messagesData.messages);
      } catch (requestError) {
        if (isMounted) setError(requestError.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInitial();

    const intervalId = window.setInterval(() => {
      if (connectionStatus === "live") return;
      refresh().catch((requestError) => {
        if (isMounted) setError(requestError.message);
      });
    }, pollIntervalMs);

    return () => {
      isMounted = false;
      isMountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [connectionStatus, pollIntervalMs, refresh, ticketId]);

  useEffect(() => {
    if (!ticketId) return undefined;

    const socket = getSocket();

    function handleConnect() {
      setConnectionStatus("live");
      if (hasJoinedRoomRef.current) {
        rejoinTicketRoom(ticketId);
      } else {
        joinTicketRoom(ticketId);
        hasJoinedRoomRef.current = true;
      }
      refresh().catch((requestError) => setError(requestError.message));
    }

    function handleDisconnect() {
      setConnectionStatus("offline");
    }

    function handleReconnectAttempt() {
      setConnectionStatus("reconnecting");
    }

    function handleMessageCreated(payload) {
      const message = payload?.message;
      if (!message) return;
      if (message.ticketId !== ticketId && message.ticket_id !== ticketId) return;

      setMessages((currentMessages) => {
        if (currentMessages.some((currentMessage) => currentMessage.id === message.id)) {
          return currentMessages;
        }

        return [...currentMessages, message].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });
    }

    function handleTicketUpdated(payload) {
      if (payload?.ticket?.id === ticketId) setTicket(payload.ticket);
    }

    function handleClosureSuggested(payload) {
      if (payload?.ticket?.id === ticketId) setTicket(payload.ticket);
    }

    function handleAiTyping(payload) {
      if (payload?.ticketId === ticketId) setIsAiTyping(Boolean(payload.isTyping));
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.on("message:created", handleMessageCreated);
    socket.on("ticket:updated", handleTicketUpdated);
    socket.on("reviewer:action", handleTicketUpdated);
    socket.on("ai:closure-suggested", handleClosureSuggested);
    socket.on("ai:typing", handleAiTyping);

    if (!socket.connected) {
      setConnectionStatus("reconnecting");
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      if (hasJoinedRoomRef.current) {
        leaveTicketRoom(ticketId);
        hasJoinedRoomRef.current = false;
      }
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      socket.off("message:created", handleMessageCreated);
      socket.off("ticket:updated", handleTicketUpdated);
      socket.off("reviewer:action", handleTicketUpdated);
      socket.off("ai:closure-suggested", handleClosureSuggested);
      socket.off("ai:typing", handleAiTyping);
    };
  }, [refresh, setError, ticketId]);

  return {
    ticket,
    messages,
    error,
    isLoading,
    connectionStatus,
    isAiTyping,
    refresh,
    setError
  };
}
