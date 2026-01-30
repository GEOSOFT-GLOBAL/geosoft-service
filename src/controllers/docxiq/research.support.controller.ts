import { Request, Response, NextFunction } from "express";
import APIError from "../../helpers/api.error";
import { createResponse } from "../../helpers/response";
import { search } from "../../services/gemini.service";
import { getAppApiKey, AppType } from "../../helpers/prompt";

export class ResearchSupportController {
  // Citation Generation
  public static async generateCitation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { sourceType, citationStyle, sourceInfo, useAI } = req.body;

      if (!sourceType || !citationStyle || !sourceInfo) {
        throw new APIError({
          status: 400,
          message: "sourceType, citationStyle, and sourceInfo are required",
          isPublic: true,
        });
      }

      if (!useAI) {
        throw new APIError({
          status: 400,
          message: "Manual citation formatting should be done on the client side",
          isPublic: true,
        });
      }

      const styleNames: Record<string, string> = {
        apa: "APA (7th edition)",
        mla: "MLA (9th edition)",
        chicago: "Chicago (17th edition)",
        harvard: "Harvard",
        ieee: "IEEE",
      };

      const prompt = `Generate a citation in ${styleNames[citationStyle] || citationStyle} format for the following source:

Source Type: ${sourceType}
${sourceInfo}

Please provide ONLY the formatted citation, nothing else. Follow ${styleNames[citationStyle] || citationStyle} guidelines exactly.`;

      const apiKey = getAppApiKey(AppType.DOCXIQ);
      const response = await search({ prompt, apiKey });

      return res.status(200).json(
        createResponse({
          status: 200,
          success: true,
          message: "Citation generated successfully",
          data: {
            citation: response.text || "",
            sourceType,
            citationStyle,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  // Generate Citation from Document
  public static async generateCitationFromDocument(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { documentContent, documentName, citationStyle, pdfMetadata } =
        req.body;

      if (!documentName || !citationStyle) {
        throw new APIError({
          status: 400,
          message: "documentName and citationStyle are required",
          isPublic: true,
        });
      }

      const styleNames: Record<string, string> = {
        apa: "APA (7th edition)",
        mla: "MLA (9th edition)",
        chicago: "Chicago (17th edition)",
        harvard: "Harvard",
        ieee: "IEEE",
      };

      let prompt = `Based on the following document information, extract metadata and generate a citation in ${styleNames[citationStyle] || citationStyle} format.

Document Name: ${documentName}`;

      if (pdfMetadata) {
        prompt += `\n\nPDF Metadata:`;
        if (pdfMetadata.title) prompt += `\nTitle: ${pdfMetadata.title}`;
        if (pdfMetadata.author) prompt += `\nAuthor: ${pdfMetadata.author}`;
        if (pdfMetadata.creationDate)
          prompt += `\nCreation Date: ${pdfMetadata.creationDate}`;
        if (pdfMetadata.subject) prompt += `\nSubject: ${pdfMetadata.subject}`;
        if (pdfMetadata.keywords) prompt += `\nKeywords: ${pdfMetadata.keywords}`;
        if (pdfMetadata.doi) prompt += `\nDOI: ${pdfMetadata.doi}`;
        if (pdfMetadata.isbn) prompt += `\nISBN: ${pdfMetadata.isbn}`;
        if (pdfMetadata.pageCount)
          prompt += `\nPage Count: ${pdfMetadata.pageCount}`;
      }

      if (documentContent) {
        prompt += `\n\nDocument Content (excerpt):\n${documentContent.slice(0, 3000)}`;
      }

      prompt += `\n\nPlease:
1. Extract or infer: Author(s), Title, Year, Publisher (if applicable)
2. Determine the source type (book, article, report, etc.)
3. Generate a properly formatted ${styleNames[citationStyle] || citationStyle} citation

If information is missing, make reasonable inferences from the content or use [Unknown] placeholders.

Output ONLY the formatted citation, nothing else.`;

      const apiKey = getAppApiKey(AppType.DOCXIQ);
      const response = await search({ prompt, apiKey });

      return res.status(200).json(
        createResponse({
          status: 200,
          success: true,
          message: "Citation generated from document successfully",
          data: {
            citation: response.text || "",
            citationStyle,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  // Generate Citation from URL
  public static async generateCitationFromURL(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { url, citationStyle } = req.body;

      if (!url || !citationStyle) {
        throw new APIError({
          status: 400,
          message: "url and citationStyle are required",
          isPublic: true,
        });
      }

      const styleNames: Record<string, string> = {
        apa: "APA (7th edition)",
        mla: "MLA (9th edition)",
        chicago: "Chicago (17th edition)",
        harvard: "Harvard",
        ieee: "IEEE",
      };

      const prompt = `Generate a citation in ${styleNames[citationStyle] || citationStyle} format for the following URL:

URL: ${url}

Please:
1. Infer the source type (website, online article, video, etc.)
2. Extract or infer: Author/Organization, Title, Website Name, Publication Date
3. Include the access date as today's date
4. Generate a properly formatted ${styleNames[citationStyle] || citationStyle} citation

Output ONLY the formatted citation, nothing else.`;

      const apiKey = getAppApiKey(AppType.DOCXIQ);
      const response = await search({ prompt, apiKey });

      return res.status(200).json(
        createResponse({
          status: 200,
          success: true,
          message: "Citation generated from URL successfully",
          data: {
            citation: response.text || "",
            citationStyle,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  // Convert Citations Between Formats
  public static async convertCitations(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { citations, sourceStyle, targetStyle } = req.body;

      if (!citations || !sourceStyle || !targetStyle) {
        throw new APIError({
          status: 400,
          message: "citations, sourceStyle, and targetStyle are required",
          isPublic: true,
        });
      }

      if (sourceStyle === targetStyle) {
        throw new APIError({
          status: 400,
          message: "Source and target styles must be different",
          isPublic: true,
        });
      }

      const styleNames: Record<string, string> = {
        apa: "APA (7th edition)",
        mla: "MLA (9th edition)",
        chicago: "Chicago (17th edition)",
        harvard: "Harvard",
        ieee: "IEEE",
      };

      const prompt = `Convert the following citations from ${styleNames[sourceStyle] || sourceStyle} format to ${styleNames[targetStyle] || targetStyle} format.

Input Citations (${styleNames[sourceStyle] || sourceStyle}):
${citations}

Please convert each citation to ${styleNames[targetStyle] || targetStyle} format. Maintain the same order. Output ONLY the converted citations, one per line, with no additional text or explanations.`;

      const apiKey = getAppApiKey(AppType.DOCXIQ);
      const response = await search({ prompt, apiKey });

      return res.status(200).json(
        createResponse({
          status: 200,
          success: true,
          message: "Citations converted successfully",
          data: {
            convertedCitations: response.text || "",
            sourceStyle,
            targetStyle,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  // Keyword Extraction
  public static async extractKeywords(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { text, topN = 20 } = req.body;

      if (!text || !text.trim()) {
        throw new APIError({
          status: 400,
          message: "text is required",
          isPublic: true,
        });
      }

      const prompt = `Extract the top ${topN} most important keywords from the following text. For each keyword, provide:
1. The keyword/phrase
2. Its relevance score (0-100)
3. Brief context of why it's important

Text:
${text}

Format your response as a JSON array with objects containing: keyword, score, context`;

      const apiKey = getAppApiKey(AppType.DOCXIQ);
      const response = await search({ prompt, apiKey });

      return res.status(200).json(
        createResponse({
          status: 200,
          success: true,
          message: "Keywords extracted successfully",
          data: {
            keywords: response.text || "",
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  // SEO Keyword Suggestions
  public static async getSEOSuggestions(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { text, currentKeywords } = req.body;

      if (!text || !text.trim()) {
        throw new APIError({
          status: 400,
          message: "text is required",
          isPublic: true,
        });
      }

      const prompt = `Analyze the following text for SEO keyword optimization:

Text: "${text}"

${currentKeywords ? `Current Top Keywords: ${currentKeywords}` : ""}

Please provide:
1. SEO keyword analysis and recommendations
2. Suggested primary keywords (1-3 main keywords)
3. Suggested secondary keywords (5-10 supporting keywords)
4. Long-tail keyword opportunities
5. Related terms and semantic keywords to include
6. Keyword density recommendations
7. Content gaps or topics to expand on
8. Competitor keyword ideas for this topic

Format your response in a clear, actionable way with specific keyword suggestions.`;

      const apiKey = getAppApiKey(AppType.DOCXIQ);
      const response = await search({ prompt, apiKey });

      return res.status(200).json(
        createResponse({
          status: 200,
          success: true,
          message: "SEO suggestions generated successfully",
          data: {
            suggestions: response.text || "",
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  // Text Summarization
  public static async summarizeText(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const {
        text,
        summaryLength = "medium",
        summaryFormat = "paragraph",
        detailLevel = 50,
      } = req.body;

      if (!text || !text.trim()) {
        throw new APIError({
          status: 400,
          message: "text is required",
          isPublic: true,
        });
      }

      const lengthInstructions: Record<string, string> = {
        short: "in 2-3 sentences",
        medium: "in 1-2 paragraphs",
        long: "in 3-4 paragraphs with detailed coverage",
      };

      const formatInstructions: Record<string, string> = {
        paragraph: "as a cohesive paragraph",
        bullets: "as bullet points",
        "key-points": "as numbered key points with brief explanations",
      };

      const prompt = `Summarize the following text ${lengthInstructions[summaryLength] || lengthInstructions.medium} ${formatInstructions[summaryFormat] || formatInstructions.paragraph}. Detail level: ${detailLevel}% (where 0% is extremely brief and 100% is comprehensive).

Text to summarize:

${text}`;

      const apiKey = getAppApiKey(AppType.DOCXIQ);
      const response = await search({ prompt, apiKey });

      return res.status(200).json(
        createResponse({
          status: 200,
          success: true,
          message: "Text summarized successfully",
          data: {
            summary: response.text || "",
            summaryLength,
            summaryFormat,
            detailLevel,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  }
}
