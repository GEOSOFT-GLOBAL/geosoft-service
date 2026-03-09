import { Request, Response, NextFunction } from "express";
import {
  AppType,
  buildPrompt,
  getAppApiKey,
  getAppContext,
  getAppInstructions,
  getAppCapabilities,
} from "../helpers/prompt";
import APIError from "../helpers/api.error";
import { search } from "../services/gemini.service";
import { createResponse } from "../helpers/response";

interface GeneratePromptRequest {
  appType: AppType;
  userPrompt: string;
  additionalContext?: string;
  includeCapabilities?: boolean;
}

export const generatePrompt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      appType,
      userPrompt,
      includeCapabilities,
      additionalContext,
    }: GeneratePromptRequest = req.body;

    if (!appType || !userPrompt) {
      throw new APIError({
        status: 400,
        message: "appType and userPrompt are required",
        isPublic: true,
      });
    }

    if (!Object.values(AppType).includes(appType)) {
      throw new APIError({
        status: 400,
        message: `Invalid appType. Must be one of: ${Object.values(AppType).join(", ")}`,
        isPublic: true,
      });
    }

    const fullPrompt = buildPrompt({
      appType,
      userPrompt,
      includeCapabilities,
      additionalContext,
    });

    const apiKey = getAppApiKey(appType);

    // Make request to Gemini
    const geminiResponse = await search({
      prompt: fullPrompt,
      apiKey,
    });

    return res.status(200).json(
      createResponse({
        status: 200,
        success: true,
        message: "AI response generated successfully",
        data: {
          response: geminiResponse,
          appType,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getAppInfo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { appType } = req.params;

    if (!appType || !Object.values(AppType).includes(appType as AppType)) {
      throw new APIError({
        status: 400,
        message: `Invalid appType. Must be one of: ${Object.values(AppType).join(", ")}`,
        isPublic: true,
      });
    }

    const instructions = getAppInstructions(appType as AppType);
    const context = getAppContext(appType as AppType);
    const capabilities = getAppCapabilities(appType as AppType);

    return res.status(200).json(
      createResponse({
        status: 200,
        success: true,
        message: "App information retrieved successfully",
        data: {
          appType,
          instructions,
          context,
          capabilities,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};
