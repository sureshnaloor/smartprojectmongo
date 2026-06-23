import { GlobalMastersHubLayout } from "@/layouts/global-masters-hub-layout";

interface TaskMasterLayoutProps {
  children: React.ReactNode;
}

export default function TaskMasterLayout({ children }: TaskMasterLayoutProps) {
  return <GlobalMastersHubLayout>{children}</GlobalMastersHubLayout>;
}
