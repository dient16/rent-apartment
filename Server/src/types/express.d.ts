import type { JwtPayload } from 'jsonwebtoken';
import { Aggregate, Document, Model } from 'mongoose';

declare global {
  interface UserDecode extends JwtPayload {
    _id: string;
    isAdmin: boolean;
  }
  namespace Express {
    interface Request {
      user?: UserDecode | JwtPayload;
    }
  }
  declare module 'mongoose' {
    interface AggregatePaginateModel<T extends Document> extends Model<T> {
      aggregatePaginate(
        query: Aggregate<any>,
        options: any
      ): Promise<{
        docs: T[];
        totalDocs: number;
        limit: number;
        totalPages: number;
        page: number;
        pagingCounter: number;
        hasPrevPage: boolean;
        hasNextPage: boolean;
        prevPage: number | null;
        nextPage: number | null;
      }>;
    }
  }
}
