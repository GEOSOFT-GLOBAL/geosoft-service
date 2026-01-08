import { model, Schema, Types } from "mongoose";
import { ICellData, IColumnConfig } from "./template.model";

export interface ITimetable {
  userId: Types.ObjectId;
  sessionId: Types.ObjectId;
  name: string;
  columnCount: number;
  defaultSlotDuration: number;
  startTime: string; // e.g., "08:00"
  columns: IColumnConfig[];
  cells: ICellData[];
  isGenerated: boolean;
  generatedAt?: Date;
  generationType?: "standard" | "ai";
}

export interface ITimetableDocument extends ITimetable, Document {
  createdAt: Date;
  updatedAt: Date;
}

const cellDataSchema = new Schema(
  {
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    content: { type: String, default: "" },
    backgroundColor: { type: String },
    textAlign: { type: String, enum: ["left", "center", "right"] },
    textOrientation: { type: String, enum: ["horizontal", "vertical"] },
    isMerged: { type: Boolean, default: false },
    mergeSpan: {
      rows: { type: Number, default: 1 },
      cols: { type: Number, default: 1 },
    },
    isHidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const columnConfigSchema = new Schema(
  {
    index: { type: Number, required: true },
    duration: { type: Number, required: true, default: 45 },
  },
  { _id: false }
);

const timetableSchema = new Schema<ITimetableDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "timetablely_session", required: true },
    name: { type: String, required: true, trim: true },
    columnCount: { type: Number, required: true, default: 8 },
    defaultSlotDuration: { type: Number, default: 45 },
    startTime: { type: String, default: "08:00" },
    columns: { type: [columnConfigSchema], default: [] },
    cells: { type: [cellDataSchema], default: [] },
    isGenerated: { type: Boolean, default: false },
    generatedAt: { type: Date },
    generationType: { type: String, enum: ["standard", "ai"] },
  },
  { timestamps: true }
);

timetableSchema.index({ userId: 1 });
timetableSchema.index({ userId: 1, sessionId: 1 });

export const Timetable = model<ITimetableDocument>("timetablely_timetable", timetableSchema);
