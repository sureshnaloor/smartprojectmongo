/** Hour is the only billing UOM for manpower, equipment, tools, and rental resources. */
export const RESOURCE_HOURLY_UOM = "H";

export const HOURLY_RESOURCE_TYPES = [
  "manpower",
  "equipment",
  "rental_manpower",
  "rental_equipment",
  "tools",
] as const;

export type HourlyResourceType = (typeof HOURLY_RESOURCE_TYPES)[number];

export const HOURLY_PO_ITEM_TYPES = [
  "tools",
  "rental_equipment",
  "rental_employee",
] as const;

export function isHourlyResourceType(type: string): type is HourlyResourceType {
  return (HOURLY_RESOURCE_TYPES as readonly string[]).includes(type);
}

export function isHourlyPoItemType(itemType: string): boolean {
  return (HOURLY_PO_ITEM_TYPES as readonly string[]).includes(itemType);
}

export function formatHourlyRate(rate: string | number | null | undefined): string {
  if (rate == null || rate === "") return "—";
  return `${rate} / ${RESOURCE_HOURLY_UOM}`;
}
