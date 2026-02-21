import { Document, ObjectId } from "mongoose";

export interface IncomeSource {
  id: string;
  type: 'salary' | 'bonus' | 'allowance' | 'other';
  label: string;
  amount: number;
  period: 'monthly' | 'annual';
  activeMonths?: number[]; // Array of months 1-12
}

export interface BracketCalculation {
  bracket: {
    min: number;
    max: number;
    rate: number;
  };
  taxableAmount: number;
  taxDue: number;
}

export interface ITaxData extends Document {
  userId: ObjectId;
  taxYear: number;
  
  // Income Sources (array of IncomeSource objects)
  incomeSources: IncomeSource[];
  
  // Income Totals (computed from sources)
  basicSalary: number;
  housing: number;
  transport: number;
  otherAllowances: number;
  bonus: number;
  
  // Deductions (individual values)
  pension: number;
  nhf: number;
  nhis: number;
  lifeInsurance: number;
  voluntaryPension: number;
  loanInterest: number;
  annualRent: number;
  
  // Calculated Results
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  taxPayable: number;
  effectiveRate: number;
  
  // Bracket Breakdown
  bracketsJson: BracketCalculation[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}