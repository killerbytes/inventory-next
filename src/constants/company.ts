/**
 * Centralized business & store profile used across invoices, sales orders, and receipts.
 */
export const COMPANY_PROFILE = {
  name: "H Concepcion Hardware",
  tin: "009-123-456-000",
  address: "#246 Brgy. H.Concepcion Maharlika Rd National Hiway Cabanatuan City, Nueva Ecija",
  phone: "(02) 8123-4567 / 0917-123-4567",
  email: "sales@myhardwaresupply.com",
} as const;

export type CompanyProfile = typeof COMPANY_PROFILE;

