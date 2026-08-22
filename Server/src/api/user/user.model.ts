import type { Document } from 'mongoose';
import mongoose from 'mongoose';

import type { User } from './user.dto';

const userMongooseSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    firstname: { type: String },
    lastname: { type: String },
    password: { type: String },
    avatar: { type: String, default: '30b64d2bf8fe39eb2576e10c939b6689.png' },
    phone: { type: String },
    dateOfBirth: { type: Date },
    nationality: { type: String },
    gender: { type: String },
    personalId: { type: String },
    isAdmin: { type: Boolean, default: false },
    address: { type: String },
    aboutMe: { type: String },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' }],
    createApartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' }],
    confirmationToken: { type: String },
    emailConfirmed: { type: Boolean, default: false },
    refreshToken: { type: String },
    provider: { type: String, enum: ['Email', 'Google', 'Facebook'], default: 'Email' },
  },
  { timestamps: true }
);

const UserModel = mongoose.model<User & Document>('User', userMongooseSchema, 'users');

export default UserModel;
