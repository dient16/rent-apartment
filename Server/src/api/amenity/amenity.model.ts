import type { Document } from 'mongoose';
import mongoose from 'mongoose';

import type { Amenity } from './amenity.dto';

const COLLECTION = 'amenities';
const DOCUMENT = 'Amenity';

const amenityMongooseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    icon: { type: String },
    description: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

const amenityModel = mongoose.model<Amenity & Document>(DOCUMENT, amenityMongooseSchema, COLLECTION);

export default amenityModel;
