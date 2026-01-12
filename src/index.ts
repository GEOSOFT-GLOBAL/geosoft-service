import cors from "cors";
import color from "colors";
import morgan from "morgan";
import { rootRouter } from "./routes";
import { connectDB } from "./config/db";
import pagesRouter from "./routes/pages.route";
import express, { Application, json } from "express";
import errorHandler from "./middlewares/error.middleware";
import { ALLOWED_ORIGINS, PORT } from "./config/constants";

if (!PORT) {
  process.exit(1);
}

connectDB();

const app: Application = express();

app.use(morgan("dev"));

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(json());

app.use("/pages", pagesRouter);
app.use("/api/v1", rootRouter);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(color.green(`server is running on port ${PORT}`));
});
