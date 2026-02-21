import { Request, Response, NextFunction } from 'express';
import Report from '../models/Report';
import User from '../models/User';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import mongoose from 'mongoose';
import { sendEmail, threadNotificationTemplate } from '../services/emailService';
import { getIO } from '../services/socketService';

// Create a new report
export const createReport = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { 
    programId, 
    title, 
    vulnerabilityCategory,
    severity,
    cvssVector,
    cvssScore,
    target, // asset url
    assetType,
    vulnerabilityDetails, // mapped to description
    validationSteps, // mapped to pocSteps
    impact,
    assets // additional files/urls
  } = req.body;

  // Basic validation mapping
  const reportData = {
    researcherId: req.user!.id,
    programId: programId || new mongoose.Types.ObjectId(), // For now, allow loose program ID if mock, but ideally required
    title,
    vulnerabilityCategory,
    severity,
    cvssVector,
    cvssScore,
    description: vulnerabilityDetails,
    pocSteps: validationSteps,
    impact,
    assets: target ? [target] : [], // Use target as primary asset
    status: 'Submitted'
  };

  const newReport = await Report.create(reportData);

  res.status(201).json({
    status: 'success',
    data: newReport
  });
});

// Get reports for logged-in researcher
export const getMyReports = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const reports = await Report.find({ researcherId: req.user!.id }).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: reports.length,
    data: reports
  });
});

// Get single report details
export const getReport = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const report = await Report.findById(req.params.id)
    .populate('researcherId', 'username name nickname avatar')
    .populate({
         path: 'programId',
         model: 'Program', // Explicitly provide model since schema lacks ref
         select: 'companyId companyName', // The Program schema has companyId ref
         populate: {
             path: 'companyId',
             model: 'User',
             select: 'avatar name'
         }
    })
    .populate('comments.sender', 'username name nickname role avatar');

  if (!report) {
    return next(new AppError('Report not found', 404));
  }

  // Authorization check: Only Author or Triager/Admin can view
  if (
      report.researcherId._id.toString() !== req.user!.id && 
      req.user!.role !== 'admin' && 
      req.user!.role !== 'triager'
  ) {
      return next(new AppError('You do not have permission to view this report', 403));
  }

  res.status(200).json({
    status: 'success',
    data: report
  });
});

// Add a comment
export const addComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { content } = req.body;
  const report = await Report.findById(req.params.id);

  if (!report) {
    return next(new AppError('Report not found', 404));
  }
  
  // Auth check
   if (
      report.researcherId.toString() !== req.user!.id && 
      req.user!.role !== 'admin' && 
      req.user!.role !== 'triager'
  ) {
      return next(new AppError('You do not have permission to comment on this report', 403));
  }

  report.comments.push({
    sender: req.user!.id,
    content,
    createdAt: new Date()
  });

  await report.save();
  
  // Re-populate to return the new comment with user info
  await report.populate('comments.sender', 'username name nickname role avatar');

  const newComment = report.comments[report.comments.length - 1];

  try {
      const io = getIO();
      // Determine role based on sender
      const senderObj = newComment.sender as any;
      let roleLabel = 'System';
      if (senderObj.role === 'researcher') roleLabel = 'Researcher';
      else if (senderObj.role === 'triager') roleLabel = 'Triager';
      else if (senderObj.role === 'admin') roleLabel = 'Admin';
      
      io.to(req.params.id).emit('new_activity', {
           id: newComment._id,
           type: 'comment',
           author: senderObj?.role !== 'company' ? (senderObj?.username || senderObj?.name || 'Unknown User') : (senderObj?.name || 'Unknown Company'),
           role: roleLabel,
           content: newComment.content,
           timestamp: newComment.createdAt,
           authorAvatar: senderObj?.avatar
      });
  } catch (socketError) {
      console.error("Socket emit failed:", socketError);
  }

  res.status(200).json({
    status: 'success',
    data: report.comments
  });

  // Trigger Email Notification in background
  (async () => {
      try {
          const senderId = req.user!.id;
          const isResearcher = report.researcherId.toString() === senderId;

          if (isResearcher) {
              // Notify Triager if assigned
              if (report.triagerId) {
                  await report.populate('triagerId', 'email name');
                  const triager = report.triagerId as any;
                  if (triager?.email) {
                      await sendEmail(
                          triager.email,
                          `New Comment on Report #${report._id}`,
                          threadNotificationTemplate(
                              triager.name || 'Triager',
                              req.user!.name || 'Researcher',
                              'Comment',
                              report.title,
                              content,
                              `${process.env.CLIENT_URL}/triager/app/reports/${report._id}`
                          )
                      );
                  }
              }
          } else {
               // Notify Researcher (if sender is Triager/Admin)
               await report.populate('researcherId', 'email name');
               const researcher = report.researcherId as any;
               if (researcher?.email) {
                    await sendEmail(
                          researcher.email,
                          `New Comment on ${report.title}`,
                          threadNotificationTemplate(
                              researcher.name || 'Researcher',
                              req.user!.name || 'Triager',
                              'Comment',
                              report.title,
                              content,
                              `${process.env.CLIENT_URL}/researcher/reports/${report._id}`
                          )
                      );
               }
          }
      } catch (emailError) {
          console.error("Failed to send comment notification email:", emailError);
      }
  })();
});

// Get reports by program ID (for leaderboard)
export const getReportsByProgram = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { programId } = req.params;
    const reports = await Report.find({ programId })
        .populate('researcherId', 'username name nickname avatar')
        .select('researcherId status severity'); // Select fields needed for count/leaderboard

    res.status(200).json({
        status: 'success',
        results: reports.length,
        data: reports
    });
});
