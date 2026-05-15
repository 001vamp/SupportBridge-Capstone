import { useCallback, useEffect, useRef, useState } from "react";
import { listTickets } from "../api/http.js";
import { getSocket, joinDashboardRoom, leaveDashboardRoom, rejoinDashboardRoom } from "../api/socket.js";

const DEFAULT_POLL_INTERVAL_MS = 5000;

export function useTickets(options = {}) {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("offline");
  const isMountedRef = useRef(false);
  const hasJoinedDashboardRef = useRef(false);

  const refresh = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) setIsLoading(true);
    const data = await listTickets();
    if (!isMountedRef.current) return;
    setTickets(data.tickets);
    setError("");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    isMountedRef.current = true;

    async function loadInitial() {
      setError("");
      setIsLoading(true);
      try {
        const data = await listTickets();
        if (!isMounted) return;
        setTickets(data.tickets);
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
  }, [connectionStatus, pollIntervalMs, refresh]);

  useEffect(() => {
    const socket = getSocket();

    function handleConnect() {
      setConnectionStatus("live");
      if (hasJoinedDashboardRef.current) {
        rejoinDashboardRoom();
      } else {
        joinDashboardRoom();
        hasJoinedDashboardRef.current = true;
      }
      refresh().catch((requestError) => setError(requestError.message));
    }

    function handleDisconnect() {
      setConnectionStatus("offline");
    }

    function handleReconnectAttempt() {
      setConnectionStatus("reconnecting");
    }

    function handleTicketUpdated(payload) {
      const ticket = payload?.ticket;
      if (!ticket) return;

      setTickets((currentTickets) => {
        const exists = currentTickets.some((currentTicket) => currentTicket.id === ticket.id);
        const nextTickets = exists
          ? currentTickets.map((currentTicket) => currentTicket.id === ticket.id ? ticket : currentTicket)
          : [ticket, ...currentTickets];

        return nextTickets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.on("ticket:updated", handleTicketUpdated);

    if (!socket.connected) {
      setConnectionStatus("reconnecting");
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      if (hasJoinedDashboardRef.current) {
        leaveDashboardRoom();
        hasJoinedDashboardRef.current = false;
      }
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      socket.off("ticket:updated", handleTicketUpdated);
    };
  }, [refresh, setError]);

  return { tickets, error, isLoading, connectionStatus, refresh, setError };
}
