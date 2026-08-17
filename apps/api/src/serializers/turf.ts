import type { TurfDetailRow, TurfRow } from '../repositories/turf.repo.js';

export interface TurfResponse {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  contactPhone: string;
  contactEmail: string | null;
  slotDurationMinutes: number;
  status: string;
  approvalStatus: string;
  rejectionReason: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeTurf(turf: TurfRow): TurfResponse {
  return {
    id: turf.id,
    ownerId: turf.owner_id,
    name: turf.name,
    description: turf.description,
    addressLine1: turf.address_line_1,
    addressLine2: turf.address_line_2,
    city: turf.city,
    state: turf.state,
    pincode: turf.pincode,
    latitude: turf.latitude === null ? null : Number(turf.latitude),
    longitude: turf.longitude === null ? null : Number(turf.longitude),
    contactPhone: turf.contact_phone,
    contactEmail: turf.contact_email,
    slotDurationMinutes: turf.slot_duration_minutes,
    status: turf.status,
    approvalStatus: turf.approval_status,
    rejectionReason: turf.rejection_reason,
    submittedAt: turf.submitted_at,
    approvedAt: turf.approved_at,
    rejectedAt: turf.rejected_at,
    createdAt: turf.created_at,
    updatedAt: turf.updated_at,
  };
}

export interface TurfDetailResponse extends TurfResponse {
  owner: { name: string; businessName: string; status: string };
  courtCount: number;
  sportIds: string[];
}

export function serializeTurfDetail(turf: TurfDetailRow): TurfDetailResponse {
  return {
    ...serializeTurf(turf),
    owner: {
      name: turf.owner_name,
      businessName: turf.owner_business_name,
      status: turf.owner_status,
    },
    courtCount: turf.court_count,
    sportIds: turf.sport_ids,
  };
}
