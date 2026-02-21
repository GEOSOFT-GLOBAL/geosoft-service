import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { createResponse } from "../../helpers/response";
import APIError from "../../helpers/api.error";
import { TaxData } from "../../models/ng-tax/tax-data.model";
import { ITaxData } from "../../interfaces/tax-data";

export class TaxController {
  /**
   * GET /ng-tax/tax-data
   * Returns all tax records for the authenticated user.
   */
  public static async getAll(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = new Types.ObjectId(req.user!.id);

      const records = await TaxData.find({ userId }).sort({ taxYear: -1 });

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Tax records retrieved successfully",
          data: records,
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ng-tax/tax-data/:taxYear
   * Returns the tax record for the authenticated user for a specific year.
   */
  public static async getByYear(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = new Types.ObjectId(req.user!.id);
      const taxYear = parseInt(req.params.taxYear, 10);

      if (isNaN(taxYear)) {
        throw new APIError({ message: "Invalid tax year", status: 400 });
      }

      const record = await TaxData.findOne({ userId, taxYear });

      if (!record) {
        throw new APIError({
          message: `No tax record found for year ${taxYear}`,
          status: 404,
        });
      }

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Tax record retrieved successfully",
          data: record,
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ng-tax/tax-data
   * Creates a new tax record for the authenticated user.
   */
  public static async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = new Types.ObjectId(req.user!.id);
      const body: Partial<ITaxData> = req.body;

      if (!body.taxYear) {
        throw new APIError({ message: "taxYear is required", status: 400 });
      }

      const existing = await TaxData.findOne({ userId, taxYear: body.taxYear });
      if (existing) {
        throw new APIError({
          message: `A tax record for year ${body.taxYear} already exists. Use PUT to update it.`,
          status: 409,
        });
      }

      const record = await TaxData.create({ ...body, userId });

      res.status(201).json(
        createResponse({
          status: 201,
          success: true,
          message: "Tax record created successfully",
          data: record,
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /ng-tax/tax-data/:taxYear
   * Updates (or upserts) the tax record for the authenticated user for a specific year.
   */
  public static async upsert(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = new Types.ObjectId(req.user!.id);
      const taxYear = parseInt(req.params.taxYear, 10);

      if (isNaN(taxYear)) {
        throw new APIError({ message: "Invalid tax year", status: 400 });
      }

      const body: Partial<ITaxData> = req.body;

      // Prevent overriding userId or taxYear from body
      delete (body as any).userId;
      delete (body as any).taxYear;

      const record = await TaxData.findOneAndUpdate(
        { userId, taxYear },
        { $set: body },
        { new: true, upsert: true, runValidators: true },
      );

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Tax record saved successfully",
          data: record,
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /ng-tax/tax-data/:taxYear
   * Deletes the tax record for the authenticated user for a specific year.
   */
  public static async deleteByYear(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = new Types.ObjectId(req.user!.id);
      const taxYear = parseInt(req.params.taxYear, 10);

      if (isNaN(taxYear)) {
        throw new APIError({ message: "Invalid tax year", status: 400 });
      }

      const record = await TaxData.findOneAndDelete({ userId, taxYear });

      if (!record) {
        throw new APIError({
          message: `No tax record found for year ${taxYear}`,
          status: 404,
        });
      }

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Tax record deleted successfully",
          data: null,
        }),
      );
    } catch (error) {
      next(error);
    }
  }
}
