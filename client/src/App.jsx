import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import CustomerChatPage from "./pages/CustomerChatPage.jsx";
import CustomerSubmitPage from "./pages/CustomerSubmitPage.jsx";
import JoinPresentationPage from "./pages/JoinPresentationPage.jsx";
import ReviewerDashboardPage from "./pages/ReviewerDashboardPage.jsx";
import ReviewerTicketPage from "./pages/ReviewerTicketPage.jsx";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/join" element={<JoinPresentationPage />} />
        <Route path="/" element={<CustomerSubmitPage />} />
        <Route path="/tickets/:ticketId/chat" element={<CustomerChatPage />} />
        <Route path="/reviewer" element={<ReviewerDashboardPage />} />
        <Route path="/reviewer/:ticketId" element={<ReviewerTicketPage />} />
      </Routes>
    </AppShell>
  );
}
