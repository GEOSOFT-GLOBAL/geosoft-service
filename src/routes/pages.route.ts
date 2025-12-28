import path from "path";
import express, { Router } from "express";

const router = Router();

const publicPath = path.join(process.cwd(), "public");

router.use("/docxiq", express.static(path.join(publicPath, "docxiq")));
router.use("/timetablely", express.static(path.join(publicPath, "timetablely")));
router.use("/linkshyft", express.static(path.join(publicPath, "linkshyft")));
router.use("/tickly", express.static(path.join(publicPath, "tickly")));

export default router;
