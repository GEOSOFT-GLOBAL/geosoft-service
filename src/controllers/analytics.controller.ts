import { NextFunction, Request, Response } from "express";

import APIError from "../helpers/api.error";
import { User } from "../models/user.model";
import { Visit } from "../models/visit.model";
import { AppSource } from "../interfaces/user";
import { createResponse } from "../helpers/response";

export class AnalyticsController {
  public static async trackVisit(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { appSource, path, referrer, sessionId } = req.body;

      if (!appSource || !Object.values(AppSource).includes(appSource)) {
        throw new APIError({
          message: "Valid appSource is required",
          status: 400,
        });
      }

      if (!path) {
        throw new APIError({
          message: "Path is required",
          status: 400,
        });
      }

      const visit = await Visit.create({
        appSource,
        path,
        visitReferrer: referrer || req.get("referer"),
        userAgent: req.get("user-agent"),
        ip: req.ip || req.socket.remoteAddress,
        sessionId,
      });

      res.status(201).json(
        createResponse({
          status: 201,
          success: true,
          message: "Visit tracked",
          data: { id: visit._id },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  public static async getStats(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { appSource } = req.query;
      const { startDate, endDate } = req.query;

      const filter: Record<string, unknown> = {};

      if (
        appSource &&
        Object.values(AppSource).includes(appSource as AppSource)
      ) {
        filter.appSource = appSource;
      }

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          (filter.createdAt as Record<string, Date>).$gte = new Date(
            startDate as string
          );
        }
        if (endDate) {
          (filter.createdAt as Record<string, Date>).$lte = new Date(
            endDate as string
          );
        }
      }

      const [totalVisits, visitsByApp, visitsByPath] = await Promise.all([
        Visit.countDocuments(filter),
        Visit.aggregate([
          { $match: filter },
          { $group: { _id: "$appSource", count: { $sum: 1 } } },
        ]),
        Visit.aggregate([
          { $match: filter },
          {
            $group: {
              _id: { app: "$appSource", path: "$path" },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ]),
      ]);

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Analytics retrieved",
          data: {
            totalVisits,
            visitsByApp,
            visitsByPath,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  public static async getAdminDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        totalVisits,
        activeUsers24h,
        signups7d,
        signups30d,
        visitsByApp,
        usersByApp,
        recentSignups,
        dailyVisits,
      ] = await Promise.all([
        User.countDocuments(),
        Visit.countDocuments(),
        User.countDocuments({ lastLogin: { $gte: last24h } }),
        User.countDocuments({ createdAt: { $gte: last7d } }),
        User.countDocuments({ createdAt: { $gte: last30d } }),
        Visit.aggregate([
          { $group: { _id: "$appSource", count: { $sum: 1 } } },
        ]),
        User.aggregate([
          { $group: { _id: "$appSource", count: { $sum: 1 } } },
        ]),
        User.find()
          .sort({ createdAt: -1 })
          .limit(10)
          .select("email username appSource createdAt"),
        Visit.aggregate([
          { $match: { createdAt: { $gte: last7d } } },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                app: "$appSource",
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.date": 1 } },
        ]),
      ]);

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Admin dashboard data retrieved",
          data: {
            overview: {
              totalUsers,
              totalVisits,
              activeUsers24h,
              signups7d,
              signups30d,
            },
            visitsByApp,
            usersByApp,
            recentSignups,
            dailyVisits,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
