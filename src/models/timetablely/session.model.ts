import { model, Schema, Types } from "mongoose";

export interface ISession {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  studentCount?: number;
  room?: string;
}

export interface ISessionDocument extends ISession, Document {
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    studentCount: { type: Number, min: 0 },
    room: { type: String, trim: true },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1 });
sessionSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Session = model<ISessionDocument>("timetablely_session", sessionSchema);
