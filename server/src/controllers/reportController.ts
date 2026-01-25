import { Request, Response, NextFunction } from 'express';
import Report from '../models/Report';
import User from '../models/User';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import mongoose from 'mongoose';

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
    .populate('researcherId', 'name nickname avatar')
    .populate('comments.sender', 'name nickname role avatar');

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
  await report.populate('comments.sender', 'name nickname role avatar');

  res.status(200).json({
    status: 'success',
    data: report.comments
  });
});

// Get reports by program ID (for leaderboard)
export const getReportsByProgram = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { programId } = req.params;
    const reports = await Report.find({ programId })
        .populate('researcherId', 'name nickname avatar')
        .select('researcherId status severity'); // Select fields needed for count/leaderboard

    res.status(200).json({
        status: 'success',
        results: reports.length,
        data: reports
    });
});
