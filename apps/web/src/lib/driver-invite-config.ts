/** Keys that can be toggled open (shown on driver-register) vs closed (admin-only, stored on invite). */

export type DriverInviteFieldKey =
  | "name"
  | "email"
  | "phone"
  | "vehicle"
  | "vehiclePlate"
  | "photo"
  | "backgroundCheck"
  | "commercialInsurance"
  | "driverLicence"
  | "proofOfWorkEligibility"
  | "municipalTaxiLimoLicence"
  | "vehicleInsurance"
  | "vehicleRegistration";

/** Profile & vehicle basics (registration form top section). */
export const DRIVER_PROFILE_FIELD_KEYS: DriverInviteFieldKey[] = [
  "name",
  "email",
  "phone",
  "vehicle",
  "vehiclePlate",
  "photo",
];

/** Documents section — compliance uploads. */
export const DRIVER_DOCUMENT_FIELD_KEYS: DriverInviteFieldKey[] = [
  "backgroundCheck",
  "commercialInsurance",
  "driverLicence",
  "proofOfWorkEligibility",
  "municipalTaxiLimoLicence",
];

/** Vehicle documents subsection. */
export const DRIVER_VEHICLE_DOC_FIELD_KEYS: DriverInviteFieldKey[] = [
  "vehicleInsurance",
  "vehicleRegistration",
];

/** All PDF/image compliance uploads (not profile photo). */
export const DRIVER_COMPLIANCE_UPLOAD_KEYS: DriverInviteFieldKey[] = [
  ...DRIVER_DOCUMENT_FIELD_KEYS,
  ...DRIVER_VEHICLE_DOC_FIELD_KEYS,
];

export const DRIVER_INVITE_FIELD_KEYS: DriverInviteFieldKey[] = [
  ...DRIVER_PROFILE_FIELD_KEYS,
  ...DRIVER_DOCUMENT_FIELD_KEYS,
  ...DRIVER_VEHICLE_DOC_FIELD_KEYS,
];

export const DRIVER_INVITE_FIELD_LABELS: Record<DriverInviteFieldKey, string> = {
  name: "Full name",
  email: "Email",
  phone: "Phone number",
  vehicle: "Vehicle",
  vehiclePlate: "Plate number",
  photo: "Profile photo",
  backgroundCheck: "Background check",
  commercialInsurance: "Commercial insurance",
  driverLicence: "Driver licence",
  proofOfWorkEligibility: "Proof of work eligibility",
  municipalTaxiLimoLicence: "Municipal taxi or limo licence",
  vehicleInsurance: "Vehicle insurance",
  vehicleRegistration: "Vehicle registration",
};

export type VisibleFieldsMap = Record<DriverInviteFieldKey, boolean>;

export type PrefilledFieldsMap = Partial<Record<DriverInviteFieldKey, string>>;

export const DEFAULT_VISIBLE_FIELDS: VisibleFieldsMap = {
  name: true,
  email: true,
  phone: true,
  vehicle: true,
  vehiclePlate: true,
  photo: true,
  backgroundCheck: true,
  commercialInsurance: true,
  driverLicence: true,
  proofOfWorkEligibility: true,
  municipalTaxiLimoLicence: true,
  vehicleInsurance: true,
  vehicleRegistration: true,
};

/** Fields where "closed" can be left empty (optional admin / driver). */
export function isPrefilledOptionalWhenClosed(key: DriverInviteFieldKey): boolean {
  return key === "photo";
}

export function isDocumentUploadField(key: DriverInviteFieldKey): boolean {
  return key === "photo" || DRIVER_COMPLIANCE_UPLOAD_KEYS.includes(key);
}

export function normalizeVisibleFields(input: unknown): VisibleFieldsMap {
  const out = { ...DEFAULT_VISIBLE_FIELDS };
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const o = input as Record<string, boolean>;
    for (const key of DRIVER_INVITE_FIELD_KEYS) {
      if (key in o) {
        out[key] = Boolean(o[key]);
      }
    }
  }
  return out;
}

export function parseVisibleFieldsFromDb(raw: unknown): VisibleFieldsMap {
  if (raw == null) return { ...DEFAULT_VISIBLE_FIELDS };
  return normalizeVisibleFields(raw);
}

export function normalizePrefilledFields(input: unknown): PrefilledFieldsMap {
  const out: PrefilledFieldsMap = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  const o = input as Record<string, string>;
  for (const key of DRIVER_INVITE_FIELD_KEYS) {
    const v = o[key];
    if (typeof v === "string") {
      out[key] = v;
    }
  }
  return out;
}

export function validatePrefilledForHidden(
  visible: VisibleFieldsMap,
  prefilled: PrefilledFieldsMap
): string | null {
  for (const key of DRIVER_INVITE_FIELD_KEYS) {
    if (visible[key]) continue;
    if (isPrefilledOptionalWhenClosed(key)) continue;
    const val = prefilled[key]?.trim();
    if (!val) {
      return `When "${DRIVER_INVITE_FIELD_LABELS[key]}" is closed, provide a value or upload for the driver record.`;
    }
  }
  return null;
}

export interface DriverRegistrationBody {
  name?: string;
  email?: string;
  phone?: string;
  vehicle?: string;
  vehiclePlate?: string;
  photo?: string | null;
  backgroundCheck?: string | null;
  commercialInsurance?: string | null;
  driverLicence?: string | null;
  proofOfWorkEligibility?: string | null;
  municipalTaxiLimoLicence?: string | null;
  vehicleInsurance?: string | null;
  vehicleRegistration?: string | null;
}

export interface MergedDriverRegistration {
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  vehiclePlate: string;
  photo: string | null;
  backgroundCheck: string | null;
  commercialInsurance: string | null;
  driverLicence: string | null;
  proofOfWorkEligibility: string | null;
  municipalTaxiLimoLicence: string | null;
  vehicleInsurance: string | null;
  vehicleRegistration: string | null;
}

export function mergeDriverInviteRegistration(
  invite: { visibleFields: unknown; prefilledFields: unknown },
  body: DriverRegistrationBody
): MergedDriverRegistration {
  const visible = parseVisibleFieldsFromDb(invite.visibleFields);
  const prefilled = normalizePrefilledFields(invite.prefilledFields);

  const str = (key: DriverInviteFieldKey, bodyVal: string | undefined | null): string => {
    if (visible[key]) {
      return typeof bodyVal === "string" ? bodyVal.trim() : "";
    }
    return (prefilled[key] ?? "").trim();
  };

  const urlOrNull = (key: DriverInviteFieldKey, bodyVal: string | undefined | null): string | null => {
    if (visible[key]) {
      const v = bodyVal != null ? String(bodyVal).trim() : "";
      return v || null;
    }
    const p = prefilled[key]?.trim();
    return p || null;
  };

  let photo: string | null;
  if (visible.photo) {
    photo = body.photo ? String(body.photo).trim() || null : null;
  } else {
    photo = prefilled.photo?.trim() || null;
  }

  return {
    name: str("name", body.name),
    email: str("email", body.email),
    phone: str("phone", body.phone),
    vehicle: str("vehicle", body.vehicle),
    vehiclePlate: str("vehiclePlate", body.vehiclePlate),
    photo,
    backgroundCheck: urlOrNull("backgroundCheck", body.backgroundCheck),
    commercialInsurance: urlOrNull("commercialInsurance", body.commercialInsurance),
    driverLicence: urlOrNull("driverLicence", body.driverLicence),
    proofOfWorkEligibility: urlOrNull("proofOfWorkEligibility", body.proofOfWorkEligibility),
    municipalTaxiLimoLicence: urlOrNull("municipalTaxiLimoLicence", body.municipalTaxiLimoLicence),
    vehicleInsurance: urlOrNull("vehicleInsurance", body.vehicleInsurance),
    vehicleRegistration: urlOrNull("vehicleRegistration", body.vehicleRegistration),
  };
}

/** When visible, these document uploads are required on the public form (enterprise compliance). */
export function getVisibleComplianceDocKeys(visible: VisibleFieldsMap): DriverInviteFieldKey[] {
  return DRIVER_COMPLIANCE_UPLOAD_KEYS.filter((k) => visible[k]);
}

export function emptyPrefilledFieldsRecord(): Record<DriverInviteFieldKey, string> {
  const o = {} as Record<DriverInviteFieldKey, string>;
  for (const k of DRIVER_INVITE_FIELD_KEYS) {
    o[k] = "";
  }
  return o;
}

export function emptyComplianceUrlState(): Partial<Record<DriverInviteFieldKey, string>> {
  const o: Partial<Record<DriverInviteFieldKey, string>> = {};
  for (const k of DRIVER_COMPLIANCE_UPLOAD_KEYS) {
    o[k] = "";
  }
  return o;
}
