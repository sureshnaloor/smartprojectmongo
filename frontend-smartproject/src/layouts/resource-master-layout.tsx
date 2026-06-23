import { GlobalMastersHubLayout } from "@/layouts/global-masters-hub-layout";

interface ResourceMasterLayoutProps {
  children: React.ReactNode;
}

export default function ResourceMasterLayout({ children }: ResourceMasterLayoutProps) {
  return <GlobalMastersHubLayout>{children}</GlobalMastersHubLayout>;
}
