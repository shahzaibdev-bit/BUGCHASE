import { Request, Response, NextFunction } from 'express';
import catchAsync from '../utils/catchAsync';
import Report from '../models/Report';

export const verifyCertificate = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const certificateId = String(req.params.certificateId).trim();
    
    if (!certificateId) {
        return res.status(400).json({ status: 'fail', message: 'Certificate ID is required' });
    }

    const report = await Report.findOne({ certificateId })
        .populate('researcherId', 'username name avatar github');

    if (!report) {
         return res.status(404).json({ status: 'fail', message: 'No certificate found' });
    }

    let companyName = "BugChase Partner";
    try {
        const Program = (await import('../models/Program')).default;
        // In local state programId might be just "1" internally, try block protects it if it's not a real ObjectId
        const program = await Program.findOne({ $or: [{ _id: report.programId }, { id: report.programId }] }).select('companyName title');
        if (program) {
            companyName = program.companyName || program.title || "BugChase Partner";
        }
    } catch (e) {
        // Fallback if lookup fails for non-object ID dev data
        companyName = "BugChase Partner";
    }

    res.status(200).json({
        status: 'success',
        message: `Your certificate has been verified ID: ${report.certificateId}`,
        data: {
            certificateId: report.certificateId,
            issueDate: report.updatedAt || report.createdAt, // usually resolved date
            targetCompany: companyName,
            reportTitle: report.title,
            severity: report.severity,
            researcher: report.researcherId
        }
    });
});
