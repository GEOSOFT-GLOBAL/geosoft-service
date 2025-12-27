import { IResponse } from "../interfaces/params";

/**
 * Creates a standardized API response.
 * @param {number} status - HTTP status code (e.g., 200, 400).
 * @param {boolean} success - Indicates if the operation was successful.
 * @param {string} message - Descriptive message for the response.
 * @param {any} [data] - Optional data to include.
 * @returns {Object} Standardized response object.
 */


export function createResponse({ status, success, message, data = null }: IResponse): object {
    return {
        status,
        success,
        message,
        data,
    };
}