import { Router } from "express";
import { ResearchSupportController } from "../../controllers/docxiq/research.support.controller";

const router = Router();

// Citation endpoints
router.post("/citation/generate", ResearchSupportController.generateCitation);
router.post("/citation/from-document", ResearchSupportController.generateCitationFromDocument);
router.post("/citation/from-url", ResearchSupportController.generateCitationFromURL);
router.post("/citation/convert", ResearchSupportController.convertCitations);

// Keyword endpoints
router.post("/keywords/extract", ResearchSupportController.extractKeywords);
router.post("/keywords/seo-suggestions", ResearchSupportController.getSEOSuggestions);

// Summarization endpoint
router.post("/summarize", ResearchSupportController.summarizeText);

export { router as ResearchSupportRouter };
