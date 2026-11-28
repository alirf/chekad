import { StudentPortalShell } from "../../components/student-portal-shell";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return <StudentPortalShell>{children}</StudentPortalShell>;
}
