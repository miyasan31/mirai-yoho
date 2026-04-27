export interface ICancelTokenService {
  generateToken(bookingId: string, expiresAt: Date): string;
  verifyToken(token: string): { bookingId: string; expiresAt: string } | null;
}
