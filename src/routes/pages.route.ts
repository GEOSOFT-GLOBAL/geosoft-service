import path from "path";
import express, { Router } from "express";

const router = Router();

const publicPath = path.join(process.cwd(), "public");

router.use(
  "/timetablely",
  express.static(path.join(publicPath, "timetablely")),
);
router.use("/docxiq", express.static(path.join(publicPath, "docxiq")));
router.use("/tickly", express.static(path.join(publicPath, "tickly")));
router.use("/linkshyft", express.static(path.join(publicPath, "linkshyft")));
router.use("/quant", express.static(path.join(publicPath, "quant")));
router.use("/jot-note", express.static(path.join(publicPath, "jot-note")));

export default router;
