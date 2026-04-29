import Program from '../models/Program';

/**
 * Sets programs with an expired timed ban back to Active.
 * Permanent bans keep bannedUntil null and are not changed here.
 */
export async function releaseExpiredProgramBans(): Promise<number> {
    const now = new Date();
    const result = await Program.updateMany(
        {
            status: 'Banned',
            bannedUntil: { $exists: true, $ne: null, $lte: now },
        },
        {
            $set: {
                status: 'Active',
                bannedUntil: null,
                suspensionReason: null,
                moderationCommentHtml: null,
            },
        }
    );
    return result.modifiedCount ?? 0;
}
