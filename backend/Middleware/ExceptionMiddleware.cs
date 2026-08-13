using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Middleware;

public sealed class InactiveLookupException(string message) : Exception(message);
public sealed class DuplicateRecordException(string message) : Exception(message);

/// <summary>
/// Converts unhandled exceptions into a consistent JSON API response.
/// </summary>
public class ExceptionMiddleware(
    RequestDelegate next,
    ILogger<ExceptionMiddleware> logger)
{
    public async Task Invoke(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            var (statusCode, message) = GetErrorResponse(exception);

            if (statusCode >= 500)
            {
                logger.LogError(exception, "Unhandled server error");
            }
            else
            {
                logger.LogInformation(
                    exception,
                    "Request failed with status {StatusCode}",
                    statusCode);
            }

            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json";

            var response = new
            {
                success = false,
<<<<<<< HEAD
                message,
                correlationId = context.TraceIdentifier
=======
                message
>>>>>>> 7e0ad1c9984c5f686e241c1ad1dd4bc2f24f14e7
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }

    private static (int StatusCode, string Message) GetErrorResponse(Exception exception)
    {
        return exception switch
        {
            KeyNotFoundException => (StatusCodes.Status404NotFound, exception.Message),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, exception.Message),
            InactiveLookupException => (StatusCodes.Status400BadRequest, exception.Message),
            DuplicateRecordException => (StatusCodes.Status409Conflict, exception.Message),
            DbUpdateException =>
                (StatusCodes.Status409Conflict,
                 "Database constraint violation or duplicate record."),
            ArgumentException => (StatusCodes.Status400BadRequest, exception.Message),
            _ =>
                (StatusCodes.Status500InternalServerError,
                 "An unexpected server error occurred.")
        };
    }
}
