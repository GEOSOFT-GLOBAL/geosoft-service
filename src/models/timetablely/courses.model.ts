import { model, Schema, Types } from "mongoose";

export enum CoursePriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export interface ICourse {
  userId: Types.ObjectId;
  name: string;
  code?: string;
  tutorId: Types.ObjectId;
  periodsPerWeek: number;
  priority: CoursePriority;
  color?: string;
  requiresLab?: boolean;
  notes?: string;
}

export interface ICourseDocument extends ICourse, Document {
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourseDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    tutorId: { type: Schema.Types.ObjectId, ref: "timetablely_tutor", required: true },
    periodsPerWeek: { type: Number, required: true, min: 1, default: 3 },
    priority: {
      type: String,
      enum: Object.values(CoursePriority),
      default: CoursePriority.MEDIUM,
    },
    color: { type: String },
    requiresLab: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true }
);

courseSchema.index({ userId: 1 });
courseSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Course = model<ICourseDocument>("timetablely_course", courseSchema);
