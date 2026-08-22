import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

import type { Pricing } from './pricing.dto';

const pricingSchema = new Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    date: { type: Date, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

const PricingModel = mongoose.model<Pricing & Document>('Pricing', pricingSchema, 'pricings');

export default PricingModel;
