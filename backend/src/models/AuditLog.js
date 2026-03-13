import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorMasterAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterAdmin', required: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    action: { type: String, required: true, index: true },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
