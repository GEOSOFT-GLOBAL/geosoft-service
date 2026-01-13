import { compare, hash } from "bcrypt";
import { model, Model, Schema } from "mongoose";
import { SALT_ROUNDS } from "../config/constants";
import {
  IUser,
  UserPlan,
  UserRole,
  AppSource,
  AuthProvider,
  IUserDocument,
} from "../interfaces/user";

const userSchema = new Schema<IUserDocument, Model<IUserDocument>, IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstname: {
      type: String,
    },
    lastname: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
    },
    authProvider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.LOCAL,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    appSource: {
      type: String,
      enum: Object.values(AppSource),
      required: true,
    },
    registeredApps: {
      type: [String],
      enum: Object.values(AppSource),
      default: function () {
        return [this.appSource];
      },
    },
    plan: {
      type: String,
      enum: Object.values(UserPlan),
      default: UserPlan.FREE,
    },
    apiQuota: {
      type: Number,
      default: 100,
    },
    usedQuota: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre<IUserDocument>("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  if (!this.password) return false;
  return compare(candidatePassword, this.password);
};

export const User = model<IUserDocument>("user", userSchema);
