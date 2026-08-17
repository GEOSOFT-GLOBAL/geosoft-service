import { model, Schema, Types } from "mongoose";

export interface ISession {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  studentCount?: number;
  room?: string;
  /**
   * Courses this class takes.
   *
   * Generation filters on it — "build a timetable for Grade 10B" means the
   * courses 10B takes and no others — so without it a session-scoped
   * generation has nothing to place. Clients have modelled the field all
   * along; it lives here now so the answer survives a reload.
   */
  subjects: Types.ObjectId[];
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
    subjects: {
      type: [{ type: Schema.Types.ObjectId, ref: "timetablely_course" }],
      default: [],
    },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1 });
sessionSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Session = model<ISessionDocument>("timetablely_session", sessionSchema);
