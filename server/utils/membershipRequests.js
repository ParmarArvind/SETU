import OrganizationRequest from '../models/OrganizationRequest.js';
import Notification from '../models/Notification.js';

export const VALIDITY_DAYS = [3, 7, 14, 30];
export const hasActiveMembership = (user) => import('../models/OrganizationMember.js').then(({ default: OrganizationMember }) => OrganizationMember.exists({ user, status: 'active' }));

export const expirePendingRequests = async () => {
  const expired = await OrganizationRequest.find({ status: 'pending', expiresAt: { $lte: new Date() } }).populate('organization', 'name');
  if (!expired.length) return 0;
  await OrganizationRequest.updateMany({ _id: { $in: expired.map((item) => item._id) } }, { $set: { status: 'expired', respondedAt: new Date() } });
  await Notification.insertMany(expired.map((item) => ({
    recipient: item.user,
    type: 'organization_request_expired',
    title: `${item.type === 'invitation' ? 'Invitation' : 'Join request'} expired`,
    message: `Your ${item.type === 'invitation' ? 'invitation to' : 'request to join'} ${item.organization?.name || 'an organization'} has expired.`,
    request: item._id, organization: item.organization?._id,
  })));
  return expired.length;
};
