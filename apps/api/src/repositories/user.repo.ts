import type { DbClient, QueryableRow } from '../db/client.js';
import type { Role, UserStatus } from '@turvo/shared';

export interface UserRow {
  id: string;
  auth_user_id: string | null;
  role: Role;
  name: string;
  email: string;
  phone: string;
  status: UserStatus;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  authUserId: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
}

function toUserRow(row: QueryableRow): UserRow {
  return row as unknown as UserRow;
}

export function createUserRepo(db: DbClient) {
  return {
    async findByAuthUserId(authUserId: string): Promise<UserRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `select id, auth_user_id, role, name, email, phone, status, last_login_at, created_at, updated_at
         from public.users where auth_user_id = $1`,
        [authUserId],
      );
      return rows.length ? toUserRow(rows[0]!) : null;
    },

    async findByEmail(email: string): Promise<UserRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `select id, auth_user_id, role, name, email, phone, status, last_login_at, created_at, updated_at
         from public.users where lower(email) = lower($1)`,
        [email],
      );
      return rows.length ? toUserRow(rows[0]!) : null;
    },

    async findById(id: string): Promise<UserRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `select id, auth_user_id, role, name, email, phone, status, last_login_at, created_at, updated_at
         from public.users where id = $1`,
        [id],
      );
      return rows.length ? toUserRow(rows[0]!) : null;
    },

    async create(input: CreateUserInput): Promise<UserRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.users (auth_user_id, role, name, email, phone)
         values ($1, $2, $3, $4, $5)
         returning id, auth_user_id, role, name, email, phone, status, last_login_at, created_at, updated_at`,
        [input.authUserId, input.role, input.name, input.email, input.phone],
      );
      return toUserRow(rows[0]!);
    },

    async updateProfile(
      id: string,
      input: { name?: string; phone?: string },
    ): Promise<UserRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `update public.users
         set name = coalesce($2, name), phone = coalesce($3, phone)
         where id = $1
         returning id, auth_user_id, role, name, email, phone, status, last_login_at, created_at, updated_at`,
        [id, input.name ?? null, input.phone ?? null],
      );
      return rows.length ? toUserRow(rows[0]!) : null;
    },

    async touchLastLogin(id: string): Promise<void> {
      await db.query(`update public.users set last_login_at = now() where id = $1`, [id]);
    },

    async setStatus(id: string, status: UserStatus): Promise<UserRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `update public.users set status = $2 where id = $1
         returning id, auth_user_id, role, name, email, phone, status, last_login_at, created_at, updated_at`,
        [id, status],
      );
      return rows.length ? toUserRow(rows[0]!) : null;
    },
  };
}

export type UserRepo = ReturnType<typeof createUserRepo>;
