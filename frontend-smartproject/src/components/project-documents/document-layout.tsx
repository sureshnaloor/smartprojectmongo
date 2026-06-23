import { DocumentCategoryTabs } from "./document-category-tabs";

interface DocumentLayoutProps {
  activeTabKey?: string;
  children: React.ReactNode;
}

export function DocumentLayout({ activeTabKey, children }: DocumentLayoutProps) {
  return (
    <div className="flex min-h-full flex-col bg-[var(--bg-cream)]">
      <DocumentCategoryTabs activeKey={activeTabKey} />
      <div className="doc-tab-fade flex-1">{children}</div>
    </div>
  );
}
