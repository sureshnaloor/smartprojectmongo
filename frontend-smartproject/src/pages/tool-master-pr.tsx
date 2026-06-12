import PurchaseRequisitionsPage from "@/pages/purchase-requisitions";

export default function ToolMasterPr() {
  return (
    <PurchaseRequisitionsPage
      requisitionType="tools"
      pageTitle="Tool Purchase Requisitions"
      listTitle="Tool PRs"
      emptyHint="Create a tool PR to request tools. Add tools in Tool Master first."
    />
  );
}
