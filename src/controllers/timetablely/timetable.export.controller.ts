import { Request, Response, NextFunction } from "express";
import puppeteer from "puppeteer";
import AdmZip from "adm-zip";
import APIError from "../../helpers/api.error";
import { BROWSERLESS_TOKEN } from "../../config/constants";

/**
 * Sanitize filename to prevent path traversal and invalid characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9-_. ]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 255);
}

export class TimetableExportController {
  /**
   * Export timetable(s) as PDF
   * Supports single or multiple HTML contents
   * Returns a single PDF or ZIP file with multiple PDFs
   */
  public static async exportTimetablePDF(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { html, filenames } = req.body;

      // Validate input
      if (!html) {
        throw new APIError({
          status: 400,
          message: "HTML content is required",
          isPublic: true,
        });
      }

      // Handle single HTML string or array
      const htmlArray = Array.isArray(html) ? html : [html];
      const filenamesArray = Array.isArray(filenames)
        ? filenames
        : [filenames || "timetable"];

      if (htmlArray.length === 0) {
        throw new APIError({
          status: 400,
          message: "HTML content must be a non-empty array",
          isPublic: true,
        });
      }

      // Validate Browserless token
      if (!BROWSERLESS_TOKEN) {
        throw new APIError({
          status: 500,
          message: "PDF export service is not configured",
          isPublic: true,
        });
      }

      const launchArgs = JSON.stringify({
        headless: true,
        stealth: true,
        timeout: 60000,
      });

      const browser = await puppeteer.connect({
        browserWSEndpoint: `wss://production-sfo.browserless.io/?token=${BROWSERLESS_TOKEN}&launch=${launchArgs}`,
      });

      try {
        // Single PDF export
        if (htmlArray.length === 1) {
          const page = await browser.newPage();
          try {
            await page.setContent(
              htmlArray[0] || "<h1>No HTML content provided</h1>"
            );

            const pdfBuffer = await page.pdf({
              format: "A4",
              margin: {
                top: "20px",
                right: "20px",
                bottom: "20px",
                left: "20px",
              },
              printBackground: true,
            });

            let filename = sanitizeFilename(filenamesArray[0] || "timetable");
            if (!filename.toLowerCase().endsWith(".pdf")) {
              filename += ".pdf";
            }

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
              "Content-Disposition",
              `attachment; filename="${filename}"`
            );
            res.end(pdfBuffer, "binary");
          } finally {
            await page.close();
          }
        } else {
          // Multiple PDFs - create ZIP
          const zip = new AdmZip();

          for (let i = 0; i < htmlArray.length; i++) {
            const page = await browser.newPage();
            try {
              await page.setContent(
                htmlArray[i] || "<h1>No HTML content provided</h1>"
              );

              const pdfBuffer = await page.pdf({
                format: "A4",
                margin: {
                  top: "20px",
                  right: "20px",
                  bottom: "20px",
                  left: "20px",
                },
                printBackground: true,
              });

              let filename = sanitizeFilename(
                filenamesArray[i] || `timetable-${i + 1}`
              );
              if (!filename.toLowerCase().endsWith(".pdf")) {
                filename += ".pdf";
              }

              zip.addFile(filename, Buffer.from(pdfBuffer));
            } finally {
              await page.close();
            }
          }

          const zipBuffer = zip.toBuffer();
          const zipFilename = `timetables-${Date.now()}.zip`;

          res.setHeader("Content-Type", "application/zip");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${zipFilename}"`
          );
          res.end(zipBuffer, "binary");
        }
      } finally {
        await browser.close();
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export single timetable as PDF with custom options
   */
  public static async exportSingleTimetable(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { html, filename, options } = req.body;

      if (!html) {
        throw new APIError({
          status: 400,
          message: "HTML content is required",
          isPublic: true,
        });
      }

      if (!BROWSERLESS_TOKEN) {
        throw new APIError({
          status: 500,
          message: "PDF export service is not configured",
          isPublic: true,
        });
      }

      const launchArgs = JSON.stringify({
        headless: true,
        stealth: true,
        timeout: 60000,
      });

      const browser = await puppeteer.connect({
        browserWSEndpoint: `wss://production-sfo.browserless.io/?token=${BROWSERLESS_TOKEN}&launch=${launchArgs}`,
      });

      try {
        const page = await browser.newPage();
        try {
          await page.setContent(html);

          // Merge custom options with defaults
          const pdfOptions = {
            format: options?.format || "A4",
            margin: {
              top: options?.margin?.top || "20px",
              right: options?.margin?.right || "20px",
              bottom: options?.margin?.bottom || "20px",
              left: options?.margin?.left || "20px",
            },
            printBackground: options?.printBackground ?? true,
            landscape: options?.landscape ?? false,
          };

          const pdfBuffer = await page.pdf(pdfOptions as any);

          let sanitizedFilename = sanitizeFilename(filename || "timetable");
          if (!sanitizedFilename.toLowerCase().endsWith(".pdf")) {
            sanitizedFilename += ".pdf";
          }

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${sanitizedFilename}"`
          );
          res.end(pdfBuffer, "binary");
        } finally {
          await page.close();
        }
      } finally {
        await browser.close();
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch export multiple timetables with individual options
   */
  public static async batchExportTimetables(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { timetables } = req.body;

      if (!Array.isArray(timetables) || timetables.length === 0) {
        throw new APIError({
          status: 400,
          message: "Timetables array is required and must not be empty",
          isPublic: true,
        });
      }

      if (!BROWSERLESS_TOKEN) {
        throw new APIError({
          status: 500,
          message: "PDF export service is not configured",
          isPublic: true,
        });
      }

      const launchArgs = JSON.stringify({
        headless: true,
        stealth: true,
        timeout: 60000,
      });

      const browser = await puppeteer.connect({
        browserWSEndpoint: `wss://production-sfo.browserless.io/?token=${BROWSERLESS_TOKEN}&launch=${launchArgs}`,
      });

      try {
        const zip = new AdmZip();

        for (let i = 0; i < timetables.length; i++) {
          const { html, filename, options } = timetables[i];

          if (!html) {
            continue; // Skip empty entries
          }

          const page = await browser.newPage();
          try {
            await page.setContent(html);

            const pdfOptions = {
              format: options?.format || "A4",
              margin: {
                top: options?.margin?.top || "20px",
                right: options?.margin?.right || "20px",
                bottom: options?.margin?.bottom || "20px",
                left: options?.margin?.left || "20px",
              },
              printBackground: options?.printBackground ?? true,
              landscape: options?.landscape ?? false,
            };

            const pdfBuffer = await page.pdf(pdfOptions as any);

            let sanitizedFilename = sanitizeFilename(
              filename || `timetable-${i + 1}`
            );
            if (!sanitizedFilename.toLowerCase().endsWith(".pdf")) {
              sanitizedFilename += ".pdf";
            }

            zip.addFile(sanitizedFilename, Buffer.from(pdfBuffer));
          } finally {
            await page.close();
          }
        }

        const zipBuffer = zip.toBuffer();
        const zipFilename = `timetables-batch-${Date.now()}.zip`;

        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${zipFilename}"`
        );
        res.end(zipBuffer, "binary");
      } finally {
        await browser.close();
      }
    } catch (error) {
      next(error);
    }
  }
}
