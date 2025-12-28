import path from "path";
import express, { Router } from "express";

const router = Router();

router.use("/docxiq", express.static(path.join(__dirname, "../public/docxiq")));
router.use(
  "/timetablely",
  express.static(path.join(__dirname, "../public/timetablely"))
);
router.use(
  "/linkshyft",
  express.static(path.join(__dirname, "../public/linkshyft"))
);
router.use("/tickly", express.static(path.join(__dirname, "../public/tickly")));

export default router;
