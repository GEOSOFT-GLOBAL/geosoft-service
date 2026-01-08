import { model, Schema, Types } from "mongoose";

export enum BlockType {
  BREAK = "break",
  LUNCH = "lunch",
  ASSEMBLY = "assembly",
  SPORTS = "sports",
  STUDY = "study",
  HOMEROOM = "homeroom",
  CUSTOM = "custom",
}

export interface ISpecialBlock {
  userId: Types.ObjectId;
  name: string;
  type: BlockType;
  day?: number; // 0-4 (Mon-Fri), undefined = all days
  slot: number;
  duration: number; // in minutes
  color?: string;
}

export interface ISpecialBlockDocument extends ISpecialBlock, Document {
  createdAt: Date;
  updatedAt: Date;
}

const specialBlockSchema = new Schema<ISpecialBlockDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(BlockType),
      default: BlockType.CUSTOM,
    },
    day: { type: Number, min: 0, max: 4 },
    slot: { type: Number, required: true },
    duration: { type: Number, required: true, default: 15 },
    color: { type: String },
  },
  { timestamps: true }
);

specialBlockSchema.index({ userId: 1 });

export const SpecialBlock = model<ISpecialBlockDocument>(
  "timetablely_special_block",
  specialBlockSchema
);
