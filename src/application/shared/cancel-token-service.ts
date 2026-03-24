export interface ICancelTokenService {
  generateToken(bookingId: string): string;
  verifyToken(token: string): { bookingId: string } | null;
}
