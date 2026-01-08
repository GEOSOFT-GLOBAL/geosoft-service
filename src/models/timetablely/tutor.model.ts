import { model, Model, Schema, Types } from "mongoose";

export interface IAvailability {
  day: number; // 0-4 (Mon-Fri)
  slot: number; // time slot index
  available: boolean;
}

export interface ITutor {
  userId: Types.ObjectId;
  name: string;
  email?: string;
  maxPeriodsPerDay: number;
  availability: IAvailability[];
  preferredSlots?: number[];
  color?: string;
}

export interface ITutorDocument extends ITutor, Document {
  createdAt: Date;
  updatedAt: Date;
}

const availabilitySchema = new Schema<IAvailability>(
  {
    day: { type: Number, required: true, min: 0, max: 4 },
    slot: { type: Number, required: true },
    available: { type: Boolean, default: true },
  },
  { _id: false }
);

const tutorSchema = new Schema<ITutorDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    maxPeriodsPerDay: { type: Number, default: 6, min: 1 },
    availability: { type: [availabilitySchema], default: [] },
    preferredSlots: { type: [Number], default: [] },
    color: { type: String },
  },
  { timestamps: true }
);

tutorSchema.index({ userId: 1 });
tutorSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Tutor = model<ITutorDocument>("timetablely_tutor", tutorSchema);
