import { Router } from "express";
import {
  generateCitation,
  generateCitationFromDocument,
  generateCitationFromURL,
  convertCitations,
  extractKeywords,
  getSEOSuggestions,
  summarizeText,
} from "../../controllers/docxiq/research.support.controller";

const router = Router();

// Citation endpoints
router.post("/citation/generate", generateCitation);
router.post("/citation/from-document", generateCitationFromDocument);
router.post("/citation/from-url", generateCitationFromURL);
router.post("/citation/convert", convertCitations);

// Keyword endpoints
router.post("/keywords/extract", extractKeywords);
router.post("/keywords/seo-suggestions", getSEOSuggestions);

// Summarization endpoint
router.post("/summarize", summarizeText);

export { router as ResearchSupportRouter };
