import jwt from 'jsonwebtoken';

const TWO_FA_LOGIN_AUD = '2fa_login_pending';

export const signToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN as any,
  });
};

/** Short-lived token after password OK, before TOTP (second login step). */
export const signTwoFactorLoginPendingToken = (userId: string) => {
  return jwt.sign({ id: userId, aud: TWO_FA_LOGIN_AUD }, process.env.JWT_SECRET as string, {
    expiresIn: '10m',
  });
};

export const verifyTwoFactorLoginPendingToken = (token: string): { id: string } => {
  const payload = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
  if (payload.aud !== TWO_FA_LOGIN_AUD || !payload.id) {
    throw new Error('Invalid 2FA session');
  }
  return { id: String(payload.id) };
};

export const signRefreshToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any,
  });
};
