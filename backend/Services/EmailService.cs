using System.Net;
using System.Net.Mail;

namespace EFU.Inventory.Services;

public interface IEmailService
{
    bool IsConfigured { get; }
    Task SendPasswordResetAsync(string recipient, string resetToken);
}

public class SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger) : IEmailService
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(configuration["SMTP:Host"])
        && !string.IsNullOrWhiteSpace(configuration["SMTP:From"]);

    public async Task SendPasswordResetAsync(string recipient, string resetToken)
    {
        if (!IsConfigured) throw new InvalidOperationException("SMTP email is not configured.");
        var frontendUrl = (configuration["FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');
        var link = $"{frontendUrl}/?resetToken={Uri.EscapeDataString(resetToken)}";
        using var message = new MailMessage(configuration["SMTP:From"]!, recipient, "EFU Inventory password reset",
            $"Open this link to choose a new password:\n{link}\n\nThis link expires in 30 minutes.");
        using var client = new SmtpClient(configuration["SMTP:Host"]!, configuration.GetValue("SMTP:Port", 587))
        {
            EnableSsl = configuration.GetValue("SMTP:EnableSsl", true)
        };
        var username = configuration["SMTP:Username"];
        if (!string.IsNullOrWhiteSpace(username))
            client.Credentials = new NetworkCredential(username, configuration["SMTP:Password"]);
        await client.SendMailAsync(message);
        logger.LogInformation("Password reset email sent to {Recipient}", recipient);
    }
}
