import { Router } from "express";
import { NgTaxAuthRouter } from "./auth.route";
import { NgTaxOtpRouter } from "./otp.route";
import { NgTaxTaxRouter } from "./tax.route";

const router = Router();

router.use("/auth", NgTaxAuthRouter);
router.use("/otp", NgTaxOtpRouter);
router.use("/tax-data", NgTaxTaxRouter);

export { router as NgTaxRouter };
