import type { OwnerRow, OwnerWithUserRow } from '../repositories/owner.repo.js';

export interface OwnerResponse {
  id: string;
  userId: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OwnerWithUserResponse extends OwnerResponse {
  user: {
    name: string;
    email: string;
    phone: string;
    status: string;
    lastLoginAt: Date | null;
  };
  turfCount?: number;
}

export function serializeOwner(owner: OwnerRow): OwnerResponse {
  return {
    id: owner.id,
    userId: owner.user_id,
    businessName: owner.business_name,
    businessPhone: owner.business_phone,
    businessEmail: owner.business_email,
    addressLine1: owner.address_line_1,
    addressLine2: owner.address_line_2,
    city: owner.city,
    state: owner.state,
    pincode: owner.pincode,
    status: owner.status,
    createdAt: owner.created_at,
    updatedAt: owner.updated_at,
  };
}

export function serializeOwnerWithUser(owner: OwnerWithUserRow): OwnerWithUserResponse {
  return {
    ...serializeOwner(owner),
    user: {
      name: owner.user_name,
      email: owner.user_email,
      phone: owner.user_phone,
      status: owner.user_status,
      lastLoginAt: owner.user_last_login_at,
    },
    turfCount: owner.turf_count,
  };
}
