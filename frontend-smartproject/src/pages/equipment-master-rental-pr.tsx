import PurchaseRequisitionsPage from "@/pages/purchase-requisitions";

/** Rental equipment purchase requisitions — equipment hub tab. */
export default function EquipmentMasterRentalPr() {
  return (
    <PurchaseRequisitionsPage
      requisitionType="rental_equipment"
      pageTitle="Rental Equipment Purchase Requisitions"
      listTitle="Rental Equipment PRs"
      emptyHint="Create a rental equipment PR to request hired plant and equipment from vendors."
    />
  );
}
