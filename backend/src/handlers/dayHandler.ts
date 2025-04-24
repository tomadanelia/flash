import { incrementCurrentDay } from "@db/dayService";
import { Request,Response } from "express";
/**
 * Handles the HTTP request to advance the practice day.
 *
 * @param {Request} req - The Express request object. Expected to have no relevant body or parameters for this endpoint.
 * @param {Response} res - The Express response object used to send the HTTP response.
 * @returns {Promise<void>} A promise that resolves when the response has been sent, or rejects if an unhandled error occurs (though errors should be caught and sent as HTTP responses).
 *
 * @description
 * It calls the `incrementCurrentDay` service function to perform the database update.
 * On successful update, it sends a 200 OK response containing a success message and the new current day number.
 * If the database operation fails, it logs the error and sends a 500 Internal Server Error response with a generic error message.
 
 */
export async function handleNextDay(req: Request,res: Response): Promise<void> {
    try {
        const newDay=await incrementCurrentDay();
        res.status(200).json(  {
            "message": "Day incremented successfully",
            "currentDay": newDay
           });
    } catch (error) {
        res.status(500).json({
                  "error": "Failed to advance day"
              });
    
    }


}