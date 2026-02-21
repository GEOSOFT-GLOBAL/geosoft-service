import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import APIError from "../../helpers/api.error";
import { createResponse } from "../../helpers/response";
import HttpStatus from "http-status";
import {
  Timetable,
  ITimetableDocument,
} from "../../models/timetablely/timetable.model";
import {
  Template,
  ITemplateDocument,
} from "../../models/timetablely/template.model";
import { Tutor, ITutorDocument } from "../../models/timetablely/tutor.model";
import { Course, ICourseDocument } from "../../models/timetablely/courses.model";
import {
  Session,
  ISessionDocument,
} from "../../models/timetablely/session.model";
import {
  SpecialBlock,
  ISpecialBlockDocument,
} from "../../models/timetablely/special-block.model";
import { User } from "../../models/user.model";

// Request body interfaces
interface SyncTimetableBody {
  timetable?: {
    _id?: string;
    sessionId: string;
    name: string;
    columnCount: number;
    defaultSlotDuration: number;
    startTime: string;
    columns: Array<{ index: number; duration: number }>;
    cells: Array<{
      row: number;
      col: number;
      content: string;
      backgroundColor?: string;
      textAlign?: "left" | "center" | "right";
      textOrientation?: "horizontal" | "vertical";
      isMerged?: boolean;
      mergeSpan?: { rows: number; cols: number };
      isHidden?: boolean;
    }>;
    isGenerated: boolean;
    generatedAt?: Date;
    generationType?: "standard" | "ai";
  };
  templates?: Array<{
    _id?: string;
    name: string;
    description?: string;
    columnCount: number;
    defaultSlotDuration: number;
    columns: Array<{ index: number; duration: number }>;
    cells: Array<{
      row: number;
      col: number;
      content: string;
      backgroundColor?: string;
      textAlign?: "left" | "center" | "right";
      textOrientation?: "horizontal" | "vertical";
      isMerged?: boolean;
      mergeSpan?: { rows: number; cols: number };
      isHidden?: boolean;
    }>;
  }>;
  tutors?: Array<{
    _id?: string;
    name: string;
    email?: string;
    maxPeriodsPerDay: number;
    availability: Array<{ day: number; slot: number; available: boolean }>;
    preferredSlots?: number[];
    color?: string;
  }>;
  courses?: Array<{
    _id?: string;
    name: string;
    code?: string;
    tutorId: string;
    periodsPerWeek: number;
    priority: "high" | "medium" | "low";
    color?: string;
    requiresLab?: boolean;
    notes?: string;
  }>;
  sessions?: Array<{
    _id?: string;
    name: string;
    description?: string;
    studentCount?: number;
    room?: string;
  }>;
  specialBlocks?: Array<{
    _id?: string;
    name: string;
    type: "break" | "lunch" | "assembly" | "sports" | "study" | "homeroom" | "custom";
    day?: number;
    slot: number;
    duration: number;
    color?: string;
  }>;
}

interface GetTimetableQuery {
  sessionId?: string;
  timetableId?: string;
}

/**
 * Timetable Sync Controller
 * Handles syncing and retrieving timetable data from/to the backend
 */
export class TimetableSyncController {
  /**
   * Sync timetable data from frontend to backend
   * Creates or updates timetables, templates, tutors, courses, sessions, and special blocks
   */
  public static async syncTimetable(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const body: SyncTimetableBody = req.body;
      const results: {
        timetable?: { id: string; action: string };
        templates: Array<{ id: string; action: string }>;
        tutors: Array<{ id: string; action: string }>;
        courses: Array<{ id: string; action: string }>;
        sessions: Array<{ id: string; action: string }>;
        specialBlocks: Array<{ id: string; action: string }>;
      } = {
        templates: [],
        tutors: [],
        courses: [],
        sessions: [],
        specialBlocks: [],
      };

      // Sync sessions first (they are referenced by timetable)
      if (body.sessions && body.sessions.length > 0) {
        for (const session of body.sessions) {
          if (session._id) {
            // Update existing session
            const updated = await Session.findOneAndUpdate(
              { _id: session._id, userId },
              { $set: session },
              { new: true, upsert: true }
            );
            results.sessions.push({ id: updated._id.toString(), action: "updated" });
          } else {
            // Create new session
            const created = await Session.findOneAndUpdate(
              { name: session.name, userId },
              { ...session, userId },
              { new: true, upsert: true }
            );
            results.sessions.push({ id: created._id.toString(), action: created ? "updated" : "created" });
          }
        }
      }

      // Sync tutors
      if (body.tutors && body.tutors.length > 0) {
        for (const tutor of body.tutors) {
          if (tutor._id) {
            const updated = await Tutor.findOneAndUpdate(
              { _id: tutor._id, userId },
              { $set: tutor },
              { new: true, upsert: true }
            );
            results.tutors.push({ id: updated._id.toString(), action: "updated" });
          } else {
            const created = await Tutor.findOneAndUpdate(
              { name: tutor.name, userId },
              { ...tutor, userId },
              { new: true, upsert: true }
            );
            results.tutors.push({ id: created._id.toString(), action: "created" });
          }
        }
      }

      // Sync courses
      if (body.courses && body.courses.length > 0) {
        for (const course of body.courses) {
          if (course._id) {
            const updated = await Course.findOneAndUpdate(
              { _id: course._id, userId },
              { $set: course },
              { new: true, upsert: true }
            );
            results.courses.push({ id: updated._id.toString(), action: "updated" });
          } else {
            const created = await Course.findOneAndUpdate(
              { name: course.name, userId },
              { ...course, userId },
              { new: true, upsert: true }
            );
            results.courses.push({ id: created._id.toString(), action: "created" });
          }
        }
      }

      // Sync special blocks
      if (body.specialBlocks && body.specialBlocks.length > 0) {
        for (const block of body.specialBlocks) {
          if (block._id) {
            const updated = await SpecialBlock.findOneAndUpdate(
              { _id: block._id, userId },
              { $set: block },
              { new: true, upsert: true }
            );
            results.specialBlocks.push({ id: updated._id.toString(), action: "updated" });
          } else {
            const created = await SpecialBlock.findOneAndUpdate(
              { name: block.name, userId, slot: block.slot },
              { ...block, userId },
              { new: true, upsert: true }
            );
            results.specialBlocks.push({ id: created._id.toString(), action: "created" });
          }
        }
      }

      // Sync templates
      if (body.templates && body.templates.length > 0) {
        for (const template of body.templates) {
          if (template._id) {
            const updated = await Template.findOneAndUpdate(
              { _id: template._id, userId },
              { $set: template },
              { new: true, upsert: true }
            );
            results.templates.push({ id: updated._id.toString(), action: "updated" });
          } else {
            const created = await Template.findOneAndUpdate(
              { name: template.name, userId },
              { ...template, userId },
              { new: true, upsert: true }
            );
            results.templates.push({ id: created._id.toString(), action: "created" });
          }
        }
      }

      // Sync main timetable
      if (body.timetable) {
        const timetableData = body.timetable;
        
        // Find the session by name or use the provided ID
        let sessionId = timetableData.sessionId;
        if (!Types.ObjectId.isValid(sessionId)) {
          const session = await Session.findOne({ name: sessionId, userId });
          if (session) {
            sessionId = session._id.toString();
          }
        }

        if (timetableData._id) {
          // Update existing timetable
          const updated = await Timetable.findOneAndUpdate(
            { _id: timetableData._id, userId },
            {
              $set: {
                sessionId: new Types.ObjectId(sessionId),
                name: timetableData.name,
                columnCount: timetableData.columnCount,
                defaultSlotDuration: timetableData.defaultSlotDuration,
                startTime: timetableData.startTime,
                columns: timetableData.columns,
                cells: timetableData.cells,
                isGenerated: timetableData.isGenerated,
                generatedAt: timetableData.generatedAt,
                generationType: timetableData.generationType,
              },
            },
            { new: true, upsert: true }
          );
          results.timetable = { id: updated._id.toString(), action: "updated" };
        } else {
          // Create or update by name and session
          const created = await Timetable.findOneAndUpdate(
            { name: timetableData.name, userId, sessionId: new Types.ObjectId(sessionId) },
            {
              userId,
              sessionId: new Types.ObjectId(sessionId),
              name: timetableData.name,
              columnCount: timetableData.columnCount,
              defaultSlotDuration: timetableData.defaultSlotDuration,
              startTime: timetableData.startTime,
              columns: timetableData.columns,
              cells: timetableData.cells,
              isGenerated: timetableData.isGenerated,
              generatedAt: timetableData.generatedAt,
              generationType: timetableData.generationType,
            },
            { new: true, upsert: true }
          );
          results.timetable = { id: created._id.toString(), action: created ? "updated" : "created" };
        }
      }

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Timetable data synced successfully",
          data: results,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all timetable data for the authenticated user
   * Includes timetables, templates, tutors, courses, sessions, and special blocks
   */
  public static async getTimetableData(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const { sessionId, timetableId } = req.query as GetTimetableQuery;

      // Build query
      const timetableQuery: Record<string, unknown> = { userId };
      if (timetableId) {
        timetableQuery._id = timetableId;
      }
      if (sessionId) {
        if (Types.ObjectId.isValid(sessionId)) {
          timetableQuery.sessionId = new Types.ObjectId(sessionId);
        } else {
          // If not valid ObjectId, treat as name
          const session = await Session.findOne({ name: sessionId, userId });
          if (session) {
            timetableQuery.sessionId = session._id;
          }
        }
      }

      // Fetch all related data
      const [timetables, templates, tutors, courses, sessions, specialBlocks] =
        await Promise.all([
          Timetable.find(timetableQuery).populate("sessionId").lean(),
          Template.find({ userId }).lean(),
          Tutor.find({ userId }).lean(),
          Course.find({ userId })
            .populate("tutorId")
            .lean(),
          Session.find({ userId }).lean(),
          SpecialBlock.find({ userId }).lean(),
        ]);

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Timetable data retrieved successfully",
          data: {
            timetables,
            templates,
            tutors,
            courses,
            sessions,
            specialBlocks,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific timetable by ID
   */
  public static async getTimetableById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const { id } = req.params;

      const timetable = await Timetable.findOne({
        _id: id,
        userId,
      }).populate("sessionId");

      if (!timetable) {
        throw new APIError({
          message: "Timetable not found",
          status: HttpStatus.NOT_FOUND,
          isPublic: true,
        });
      }

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Timetable retrieved successfully",
          data: timetable,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a specific timetable by ID
   */
  public static async deleteTimetable(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const { id } = req.params;

      const timetable = await Timetable.findOneAndDelete({
        _id: id,
        userId,
      });

      if (!timetable) {
        throw new APIError({
          message: "Timetable not found",
          status: HttpStatus.NOT_FOUND,
          isPublic: true,
        });
      }

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Timetable deleted successfully",
          data: { id },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all templates for the authenticated user
   */
  public static async getTemplates(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const templates = await Template.find({ userId }).lean();

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Templates retrieved successfully",
          data: templates,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a specific template by ID
   */
  public static async deleteTemplate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const { id } = req.params;

      const template = await Template.findOneAndDelete({
        _id: id,
        userId,
      });

      if (!template) {
        throw new APIError({
          message: "Template not found",
          status: HttpStatus.NOT_FOUND,
          isPublic: true,
        });
      }

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Template deleted successfully",
          data: { id },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all tutors for the authenticated user
   */
  public static async getTutors(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const tutors = await Tutor.find({ userId }).lean();

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Tutors retrieved successfully",
          data: tutors,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a specific tutor by ID
   */
  public static async deleteTutor(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const { id } = req.params;

      const tutor = await Tutor.findOneAndDelete({
        _id: id,
        userId,
      });

      if (!tutor) {
        throw new APIError({
          message: "Tutor not found",
          status: HttpStatus.NOT_FOUND,
          isPublic: true,
        });
      }

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Tutor deleted successfully",
          data: { id },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all courses for the authenticated user
   */
  public static async getCourses(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const courses = await Course.find({ userId })
        .populate("tutorId")
        .lean();

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Courses retrieved successfully",
          data: courses,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a specific course by ID
   */
  public static async deleteCourse(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const { id } = req.params;

      const course = await Course.findOneAndDelete({
        _id: id,
        userId,
      });

      if (!course) {
        throw new APIError({
          message: "Course not found",
          status: HttpStatus.NOT_FOUND,
          isPublic: true,
        });
      }

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Course deleted successfully",
          data: { id },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all sessions for the authenticated user
   */
  public static async getSessions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const sessions = await Session.find({ userId }).lean();

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Sessions retrieved successfully",
          data: sessions,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a specific session by ID
   */
  public static async deleteSession(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const { id } = req.params;

      const session = await Session.findOneAndDelete({
        _id: id,
        userId,
      });

      if (!session) {
        throw new APIError({
          message: "Session not found",
          status: HttpStatus.NOT_FOUND,
          isPublic: true,
        });
      }

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Session deleted successfully",
          data: { id },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all special blocks for the authenticated user
   */
  public static async getSpecialBlocks(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const specialBlocks = await SpecialBlock.find({ userId }).lean();

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Special blocks retrieved successfully",
          data: specialBlocks,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a specific special block by ID
   */
  public static async deleteSpecialBlock(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new APIError({
          message: "User not authenticated",
          status: HttpStatus.UNAUTHORIZED,
          isPublic: true,
        });
      }

      const { id } = req.params;

      const specialBlock = await SpecialBlock.findOneAndDelete({
        _id: id,
        userId,
      });

      if (!specialBlock) {
        throw new APIError({
          message: "Special block not found",
          status: HttpStatus.NOT_FOUND,
          isPublic: true,
        });
      }

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Special block deleted successfully",
          data: { id },
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
