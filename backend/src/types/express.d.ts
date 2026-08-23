export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        sub: string;
        role: string;
        iat: number;
        exp: number;
      };
    }
  }
}
