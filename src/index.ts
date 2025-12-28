import cors from "cors";
import path from "path";
import color from "colors";
import morgan from "morgan";
import { rootRouter } from "./routes";
import { connectDB } from "./config/db";
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

// Serve static HTML pages per app
app.use("/pages/docxiq", express.static(path.join(__dirname, "public/docxiq")));
app.use(
  "/pages/timetablely",
  express.static(path.join(__dirname, "public/timetablely"))
);
app.use(
  "/pages/linkshyft",
  express.static(path.join(__dirname, "public/linkshyft"))
);

app.use("/api/v1", rootRouter);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(color.green(`server is running on port ${PORT}`));
});
