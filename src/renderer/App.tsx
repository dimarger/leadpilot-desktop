import DashboardClient from "./dashboard-client";

export default function App() {
  return (
    <DashboardClient
      userName="Дмитрий Гордеев"
      userEmail="admin@leadpilot.local"
      subscriptionExpiresAt="без ограничений"
      subscriptionPlan="desktop-admin"
      isTrial={false}
      isAdmin
      signOutPath="#"
    />
  );
}
