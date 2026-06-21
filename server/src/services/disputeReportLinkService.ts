import mongoose from 'mongoose';
import Dispute from '../models/Dispute';
import Report from '../models/Report';
import { getIO } from './socketService';

export const REPORT_IN_DISPUTE_STATUS = 'In Dispute';

const ACTIVE_DISPUTE_STATUSES = ['open', 'in_review'] as const;
export { ACTIVE_DISPUTE_STATUSES };

export type DisputeActor = { _id: any; name?: string; username?: string; role?: string };

export const isReportThreadLocked = (status?: string | null) =>
  status === REPORT_IN_DISPUTE_STATUS;

export const REPORT_THREAD_LOCKED_MESSAGE =
  'This report thread is locked while a support dispute is in progress. Please use your Support ticket or wait for a decision.';

/** Push a system-authored status change (no reason box in the UI). */
const pushSystemStatusChange = (
  report: InstanceType<typeof Report>,
  oldStatus: string,
  newStatus: string,
  kind: 'dispute_opened' | 'dispute_closed',
  disputeId: string,
) => {
  report.comments.push({
    sender: report.researcherId,
    content: `System changed status to ${newStatus}`,
    type: 'status_change',
    metadata: {
      oldStatus,
      newStatus,
      kind,
      disputeId,
      systemAction: true,
    },
    createdAt: new Date(),
  } as any);
};

/** Resolve a report by Mongo _id or public reportId (e.g. BU-BIC-3CBWYH). */
export const resolveReportByRef = async (ref: string) => {
  if (!ref || !String(ref).trim()) return null;
  const value = String(ref).trim();

  if (mongoose.Types.ObjectId.isValid(value)) {
    const byId = await Report.findById(value);
    if (byId) return byId;
  }

  return Report.findOne({ reportId: value });
};

/** Move a linked report into In Dispute when a support ticket is opened. */
export const markLinkedReportInDispute = async (
  report: InstanceType<typeof Report>,
  _actor: DisputeActor,
  disputeId: string,
) => {
  const oldStatus = report.status;
  if (oldStatus === REPORT_IN_DISPUTE_STATUS) return false;

  report.statusBeforeDispute = oldStatus;
  report.status = REPORT_IN_DISPUTE_STATUS;

  pushSystemStatusChange(report, oldStatus, REPORT_IN_DISPUTE_STATUS, 'dispute_opened', disputeId);

  await report.save();

  try {
    const io = getIO();
    io.to(String(report._id)).emit('status_updated', { status: REPORT_IN_DISPUTE_STATUS });
  } catch (socketError) {
    console.error('Failed to emit report In Dispute status:', socketError);
  }

  return true;
};

/** Restore a report's pre-dispute status when no open disputes remain. */
export const restoreLinkedReportAfterDispute = async (
  reportRef: any,
  actor: DisputeActor,
  disputeId: string,
  options?: { statusOverride?: string },
) => {
  const otherActive = await Dispute.countDocuments({
    reportRef,
    status: { $in: [...ACTIVE_DISPUTE_STATUSES] },
  });
  if (otherActive > 0) return false;

  const report = await Report.findById(reportRef);
  if (!report || report.status !== REPORT_IN_DISPUTE_STATUS) return false;

  const restoreTo = (options?.statusOverride ||
    report.statusBeforeDispute ||
    'Under Review') as typeof report.status;
  const oldStatus = report.status;
  report.status = restoreTo;
  report.statusBeforeDispute = undefined;

  pushSystemStatusChange(report, oldStatus, restoreTo, 'dispute_closed', disputeId);

  await report.save();

  try {
    const io = getIO();
    io.to(String(report._id)).emit('status_updated', { status: restoreTo });
  } catch (socketError) {
    console.error('Failed to emit report status restore after dispute:', socketError);
  }

  return true;
};

/** Ensure report status matches open disputes (repairs tickets created before status sync). */
export const syncReportDisputeStatus = async (report: InstanceType<typeof Report>) => {
  const activeDispute = await Dispute.findOne({
    reportRef: report._id,
    status: { $in: [...ACTIVE_DISPUTE_STATUSES] },
  })
    .select('disputeId raisedBy raisedByName')
    .lean();

  if (activeDispute && report.status !== REPORT_IN_DISPUTE_STATUS) {
    await markLinkedReportInDispute(
      report,
      {
        _id: activeDispute.raisedBy,
        name: activeDispute.raisedByName || 'BugChase Support',
        role: 'support',
      },
      activeDispute.disputeId,
    );
    return true;
  }

  if (!activeDispute && report.status === REPORT_IN_DISPUTE_STATUS) {
    await restoreLinkedReportAfterDispute(
      report._id,
      { _id: report.researcherId, name: 'System', role: 'system' },
      'sync',
    );
    return true;
  }

  return false;
};

/** Batch-sync dispute status for a list of reports (used by list endpoints). */
export const syncReportsDisputeStatus = async (reports: InstanceType<typeof Report>[]) => {
  if (!reports.length) return;

  const reportIds = reports.map((r) => r._id);
  const activeDisputes = await Dispute.find({
    reportRef: { $in: reportIds },
    status: { $in: [...ACTIVE_DISPUTE_STATUSES] },
  })
    .select('reportRef disputeId raisedBy raisedByName')
    .lean();

  const disputeByReport = new Map(
    activeDisputes.map((d) => [String(d.reportRef), d]),
  );

  for (const report of reports) {
    const dispute = disputeByReport.get(String(report._id));
    if (dispute && report.status !== REPORT_IN_DISPUTE_STATUS) {
      await markLinkedReportInDispute(
        report,
        {
          _id: dispute.raisedBy,
          name: dispute.raisedByName || 'BugChase Support',
          role: 'support',
        },
        dispute.disputeId,
      );
    }
  }
};
