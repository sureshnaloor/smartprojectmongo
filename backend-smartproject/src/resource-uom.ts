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

export function isHourlyResourceType(type: string): type is HourlyResourceType {
  return (HOURLY_RESOURCE_TYPES as readonly string[]).includes(type);
}

export function normalizeHourlyResourceUom<T extends { type?: string; unitOfMeasure?: string }>(
  data: T,
  existingType?: string
): T {
  const type = data.type ?? existingType;
  if (type && isHourlyResourceType(type)) {
    return { ...data, unitOfMeasure: RESOURCE_HOURLY_UOM };
  }
  return data;
}
