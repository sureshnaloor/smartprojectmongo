import MasterLayout from "@/layouts/master-layout";
import {
  GlobalMastersHubHeader,
  GlobalMasterTypeTabs,
} from "@/components/global-masters/global-masters-hub-header";

interface GlobalMastersHubLayoutProps {
  children: React.ReactNode;
  /** Optional secondary tabs (UOM, material types, etc.) */
  secondaryTabs?: React.ReactNode;
}

export function GlobalMastersHubLayout({
  children,
  secondaryTabs,
}: GlobalMastersHubLayoutProps) {
  return (
    <MasterLayout>
      <div className="gm-hub flex flex-col h-full min-w-0">
        <div className="gm-hub-content flex-1 overflow-auto min-w-0">
          <GlobalMastersHubHeader />
          <GlobalMasterTypeTabs />
          {secondaryTabs}
          {children}
        </div>
      </div>
    </MasterLayout>
  );
}
