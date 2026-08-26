import PricingModel from './pricing.model';
import RoomModel from '../room/room.model';

/** All Mongoose access for per-date pricing lives here. */
export const pricingRepository = {
  upsertPrice: (roomId: string, date: Date, price: number) =>
    PricingModel.findOneAndUpdate({ roomId, date }, { price }, { returnDocument: 'after', upsert: true }).exec(),

  findByRoomId: (roomId: string) => PricingModel.find({ roomId }).exec(),

  findRoomDefaultPrice: (roomId: string) => RoomModel.findById(roomId).select('price').exec(),
};
