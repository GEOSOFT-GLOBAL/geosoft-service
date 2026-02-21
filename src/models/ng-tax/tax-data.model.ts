import { model, Model, Schema } from "mongoose";
import {
  BracketCalculation,
  IncomeSource,
  ITaxData,
} from "../../interfaces/tax-data";

const incomeSourceSchema = new Schema<IncomeSource>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["salary", "bonus", "allowance", "other"],
      required: true,
    },
    label: { type: String, required: true },
    amount: { type: Number, required: true },
    period: {
      type: String,
      enum: ["monthly", "annual"],
      required: true,
    },
    activeMonths: { type: [Number] },
  },
  { _id: false },
);

const bracketCalculationSchema = new Schema<BracketCalculation>(
  {
    bracket: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
      rate: { type: Number, required: true },
    },
    taxableAmount: { type: Number, required: true },
    taxDue: { type: Number, required: true },
  },
  { _id: false },
);

const taxDataSchema = new Schema<ITaxData, Model<ITaxData>>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    taxYear: {
      type: Number,
      required: true,
    },

    // Income Sources
    incomeSources: {
      type: [incomeSourceSchema],
      default: [],
    },

    // Income Totals
    basicSalary: { type: Number, default: 0 },
    housing: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },

    // Deductions
    pension: { type: Number, default: 0 },
    nhf: { type: Number, default: 0 },
    nhis: { type: Number, default: 0 },
    lifeInsurance: { type: Number, default: 0 },
    voluntaryPension: { type: Number, default: 0 },
    loanInterest: { type: Number, default: 0 },
    annualRent: { type: Number, default: 0 },

    // Calculated Results
    grossIncome: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    taxableIncome: { type: Number, default: 0 },
    taxPayable: { type: Number, default: 0 },
    effectiveRate: { type: Number, default: 0 },

    // Bracket Breakdown
    bracketsJson: {
      type: [bracketCalculationSchema],
      default: [],
    },
  },
  { timestamps: true },
);

taxDataSchema.index({ userId: 1, taxYear: 1 }, { unique: true });

export const TaxData = model<ITaxData>("tax_data", taxDataSchema);
