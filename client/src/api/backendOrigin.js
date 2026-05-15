/**
 * When you open the app as http://THIS_MACHINE:5173, talk to the API on the same host port 3001
 * so phones / other PCs on the LAN work without editing env for every IP.
 * Override with VITE_API_BASE_URL / VITE_SOCKET_URL when needed.
 */
export function getBrowserBackendOrigin() {
  if (typeof window === "undefined") return "http://localhost:3001";
  const port = import.meta.env.VITE_BACKEND_PORT || "3001";
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}
