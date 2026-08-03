// Mongoose Multi-tenant Plugin
import { Schema } from 'mongoose';

export function tenantPlugin(schema: Schema) {
  // Every tenant-scoped collection gets an indexed orgId field
  schema.add({ orgId: { type: Schema.Types.ObjectId, index: true } });
}