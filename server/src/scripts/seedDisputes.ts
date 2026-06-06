import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Dispute from '../models/Dispute';
import User from '../models/User';

dotenv.config();

/**
 * Seeds realistic disputes so the support portal has useful data to show.
 * Uses stable IDs and upserts, so it can be run repeatedly. Run from server:
 *   npx ts-node-dev --transpile-only src/scripts/seedDisputes.ts
 */
async function seed() {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) throw new Error('MONGO_URI is not configured');
  await mongoose.connect(mongoUri);
  console.log('[seed] DB connected.');

  const companies = await User.find({ role: 'company' }).limit(3).lean();
  const researchers = await User.find({ role: 'researcher' }).limit(3).lean();
  const support = await User.findOne({ role: 'support' }).lean();

  const pickCompany = (i: number) => companies[i % Math.max(companies.length, 1)] || null;
  const pickResearcher = (i: number) => researchers[i % Math.max(researchers.length, 1)] || null;

  const samples = [
    {
      disputeId: 'DSP-SAMPLE-001',
      subject: 'Severity downgrade disputed on SQL injection report',
      description:
        'Our triage team rated this as Critical based on direct database read access, but the report was downgraded to High by the platform. We are requesting a re-evaluation with the proof-of-concept attached.',
      category: 'severity' as const,
      priority: 'high' as const,
      status: 'in_review' as const,
      reportLabel: 'RPT-SQLI-1042',
      raiser: pickResearcher(0),
      raiserRole: 'researcher',
      fallbackName: 'Independent Researcher',
      supportReply:
        'Thanks for raising this. I am reviewing the triage notes, CVSS vector, proof-of-concept evidence, and program impact policy before issuing a support decision.',
    },
    {
      disputeId: 'DSP-SAMPLE-002',
      subject: 'Payout amount lower than program policy',
      description:
        'The program advertised $2,000–$5,000 for High severity findings. We received $900 for a confirmed High. Requesting reconciliation against the published reward table.',
      category: 'payout' as const,
      priority: 'medium' as const,
      status: 'open' as const,
      reportLabel: 'RPT-IDOR-0771',
      raiser: pickResearcher(1),
      raiserRole: 'researcher',
      fallbackName: 'Independent Researcher',
    },
    {
      disputeId: 'DSP-SAMPLE-003',
      subject: 'Report incorrectly marked as duplicate',
      description:
        'This was flagged as a duplicate of an earlier submission, but the root cause and affected endpoint are different. The earlier report targeted /login; ours targets /api/v2/session refresh.',
      category: 'duplicate' as const,
      priority: 'medium' as const,
      status: 'resolved' as const,
      reportLabel: 'RPT-AUTH-0588',
      raiser: pickResearcher(2),
      raiserRole: 'researcher',
      fallbackName: 'Independent Researcher',
      supportReply:
        'Support compared both reports and confirmed the affected endpoint and token refresh path are materially different.',
      resolution: {
        outcome: 'upheld' as const,
        note: 'Duplicate decision overturned. The report should continue through normal triage.',
      },
    },
    {
      disputeId: 'DSP-SAMPLE-004',
      subject: 'Out-of-scope finding accepted then rejected',
      description:
        'A finding on a subdomain was accepted by a triager and later rejected as out of scope. We dispute the scope interpretation and request a final ruling from support.',
      category: 'scope' as const,
      priority: 'low' as const,
      status: 'rejected' as const,
      reportLabel: 'RPT-SCOPE-0310',
      raiser: pickCompany(0),
      raiserRole: 'company',
      fallbackName: 'Program Owner',
      supportReply:
        'The disclosed host was not present in the active program scope at submission time. The rejection is consistent with the published policy.',
      resolution: {
        outcome: 'rejected' as const,
        note: 'Scope rejection confirmed.',
      },
    },
    {
      disputeId: 'DSP-SAMPLE-005',
      subject: 'Researcher conduct complaint',
      description:
        'A researcher repeatedly bypassed responsible disclosure timelines and threatened public disclosure. We request a conduct review.',
      category: 'conduct' as const,
      priority: 'critical' as const,
      status: 'in_review' as const,
      reportLabel: 'RPT-COND-0099',
      raiser: pickCompany(1),
      raiserRole: 'company',
      fallbackName: 'Program Owner',
      supportReply:
        'This complaint has been escalated to support review. Please keep all communication on-platform while the case is evaluated.',
    },
    {
      disputeId: 'DSP-SAMPLE-006',
      subject: 'Company requests evidence redaction before disclosure',
      description:
        'The researcher attached request logs containing employee email addresses. We need support to redact sensitive personal data before the public write-up is shared.',
      category: 'other' as const,
      priority: 'high' as const,
      status: 'open' as const,
      reportLabel: 'RPT-PII-2210',
      raiser: pickCompany(2),
      raiserRole: 'company',
      fallbackName: 'Program Owner',
    },
    {
      disputeId: 'DSP-SAMPLE-007',
      subject: 'Researcher says remediation proof was not considered',
      description:
        'The company closed the report as fixed, but the endpoint remains vulnerable from a second tenant account. Requesting support to reopen the remediation review.',
      category: 'other' as const,
      priority: 'medium' as const,
      status: 'in_review' as const,
      reportLabel: 'RPT-TENANT-1440',
      raiser: pickResearcher(0),
      raiserRole: 'researcher',
      fallbackName: 'Independent Researcher',
      supportReply:
        'Support is validating the second-tenant reproduction evidence and will coordinate with the program if the fix is incomplete.',
    },
    {
      disputeId: 'DSP-SAMPLE-008',
      subject: 'Payment held after report was accepted',
      description:
        'The report is accepted and marked resolved, but payout has been pending for more than 14 days. Requesting payout status and release timeline.',
      category: 'payout' as const,
      priority: 'high' as const,
      status: 'open' as const,
      reportLabel: 'RPT-PAY-7342',
      raiser: pickResearcher(1),
      raiserRole: 'researcher',
      fallbackName: 'Independent Researcher',
    },
  ];

  let upserted = 0;
  for (const s of samples) {
    const raiser: any = s.raiser;
    const messages: any[] = [
      {
        senderId: raiser?._id,
        senderName: raiser?.name || s.fallbackName,
        senderRole: s.raiserRole,
        content: s.description,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    ];
    if ('supportReply' in s && s.supportReply) {
      messages.push({
        senderId: support?._id,
        senderName: (support as any)?.name || 'BugChase Support',
        senderRole: 'support',
        content: s.supportReply,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      });
    }

    await Dispute.updateOne(
      { disputeId: s.disputeId },
      {
        $set: {
          disputeId: s.disputeId,
          subject: s.subject,
          description: s.description,
          category: s.category,
          priority: s.priority,
          status: s.status,
          assignedTo: s.status === 'open' ? undefined : support?._id,
          assignedToName: s.status === 'open' ? undefined : ((support as any)?.name || 'BugChase Support'),
          raisedBy: raiser?._id,
          raisedByName: raiser?.name || s.fallbackName,
          raisedByEmail: raiser?.email,
          raisedByRole: s.raiserRole,
          reportLabel: s.reportLabel,
          messages,
          resolution:
            'resolution' in s && s.resolution
              ? {
                  ...s.resolution,
                  resolvedBy: support?._id,
                  resolvedByName: (support as any)?.name || 'BugChase Support',
                  resolvedAt: new Date(Date.now() - 1000 * 60 * 60),
                }
              : undefined,
        },
      },
      { upsert: true }
    );
    upserted += 1;
  }

  console.log(`[seed] upserted ${upserted} realistic sample disputes.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
