import AmenityModel from './amenity.model';

interface AmenityInput {
  name: string;
  description?: string;
  icon?: string;
}

/** All Mongoose access for amenities lives here — handlers never touch the model. */
export const amenityRepository = {
  findByName: (name: string) => AmenityModel.findOne({ name: name as any }).exec(),

  findById: (amenityId: string) => AmenityModel.findById(amenityId).exec(),

  findAll: () => AmenityModel.find({}).exec(),

  create: (data: AmenityInput) => AmenityModel.create(data as any),

  updateById: (amenityId: string, data: Partial<AmenityInput>) =>
    AmenityModel.findByIdAndUpdate(amenityId, data, { returnDocument: 'after' }).exec(),

  deleteById: (amenityId: string) => AmenityModel.findByIdAndDelete(amenityId).exec(),
};
