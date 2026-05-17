import { Request } from 'express';
import User, { IUser } from '../models/User';
import AppError from './AppError';

/**
 * Resolves the company owner account (parent user when the caller is a team member).
 */
export async function resolveCompanyAccount(req: Request): Promise<IUser> {
  const current = req.user as IUser;
  if (!current?.parentCompany) {
    return current;
  }
  const parent = await User.findById(current.parentCompany);
  if (!parent) {
    throw new AppError('Company account not found', 404);
  }
  return parent;
}

export function companyOwnerId(user: IUser): string {
  return (user.parentCompany ? user.parentCompany : user._id).toString();
}
