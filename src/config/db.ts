import chalk from "colors";
import mongoose from "mongoose";
import { MONGO_PROD_URI, MONGO_URI } from "./constants";

const isProd = process.env.NODE_ENV === "PROD";
const dbUri = isProd ? MONGO_PROD_URI : MONGO_URI;

export const connectDB = async () => {
  try {
    await mongoose.connect(dbUri);
    console.log(
      chalk.bgMagenta(
        `MongoDB Server up and running at ${dbUri} (${isProd ? "production" : "development"})`
      )
    );
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};