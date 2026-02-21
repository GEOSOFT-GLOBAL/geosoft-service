import { Router } from "express";
import { TaxController } from "../../controllers/ng-tax/tax.controller";
import { authenticateUser } from "../../middlewares/auth.middleware";

const router = Router();

// All tax-data routes require an authenticated user
router.use(authenticateUser);

router.get("/", TaxController.getAll);
router.get("/:taxYear", TaxController.getByYear);
router.post("/", TaxController.create);
router.put("/:taxYear", TaxController.upsert);
router.delete("/:taxYear", TaxController.deleteByYear);

export { router as NgTaxTaxRouter };
