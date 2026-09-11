import mongoose from 'mongoose';

const organizationRequestSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['invitation', 'join_request'], required: true },
  role: { type: String, enum: ['admin', 'manager', 'developer', 'qa', 'viewer'], default: 'developer' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'expired'], default: 'pending', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, index: true },
  respondedAt: Date,
}, { timestamps: true });

organizationRequestSchema.index({ organization: 1, user: 1, type: 1, status: 1 });
export default mongoose.model('OrganizationRequest', organizationRequestSchema);
