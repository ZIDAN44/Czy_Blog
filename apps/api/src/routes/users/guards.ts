import type { FastifyReply } from 'fastify';
import { Prisma, Role } from '../../db.js';

// Tx callbacks return the value or the HTTP failure to render, so a guard can abort without throwing.
type Denied = { denied: { status: number; message: string } };
export type Outcome<T> = Denied | { value: T };

export const deny = (status: number, message: string): Denied => ({ denied: { status, message } });

/** Sends the failure if there was one; true when the request is already answered. */
export function sendIfDenied<T>(reply: FastifyReply, o: Outcome<T>): o is Denied {
  if (!('denied' in o)) return false;
  reply.code(o.denied.status).send({ error: o.denied.message });
  return true;
}

// Anti-lockout: never leave the system without a SUPER_ADMIN. Demote and delete
// both call this inside a serializable tx, else two concurrent removals each see
// the other super admin and both succeed.
export async function hasAnotherSuperAdmin(tx: Prisma.TransactionClient, excludeId: string) {
  const others = await tx.user.count({ where: { role: Role.SUPER_ADMIN, NOT: { id: excludeId } } });
  return others > 0;
}
