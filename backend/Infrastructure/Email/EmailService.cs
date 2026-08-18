using System.Net;
using System.Net.Mail;

namespace EFU.Inventory.Services;

public interface IEmailService
{
    bool IsConfigured { get; }
    Task SendPasswordResetAsync(string recipient, string resetToken);
    Task SendAsync(EmailMessage email, CancellationToken cancellationToken = default);
}

public sealed record EmailMessage(string To, string Subject, string HtmlBody, string TextBody, string? Cc = null, string? Bcc = null);

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

    public async Task SendAsync(EmailMessage email, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured) throw new InvalidOperationException("SMTP email is not configured.");
        using var message = new MailMessage
        {
            From = new MailAddress(configuration["SMTP:From"]!, configuration["AssetExpiryReminders:SenderName"] ?? "EFU IT Department"),
            Subject = email.Subject,
            Body = email.HtmlBody,
            IsBodyHtml = true
        };
        message.To.Add(new MailAddress(email.To));
        if (!string.IsNullOrWhiteSpace(email.Cc)) message.CC.Add(new MailAddress(email.Cc));
        if (!string.IsNullOrWhiteSpace(email.Bcc)) message.Bcc.Add(new MailAddress(email.Bcc));
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(email.TextBody, null, "text/plain"));
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(email.HtmlBody, null, "text/html"));
        using var client = new SmtpClient(configuration["SMTP:Host"]!, configuration.GetValue("SMTP:Port", 587))
        {
            EnableSsl = configuration.GetValue("SMTP:EnableSsl", true),
            Timeout = configuration.GetValue("SMTP:TimeoutMilliseconds", 30000)
        };
        var username = configuration["SMTP:Username"];
        if (!string.IsNullOrWhiteSpace(username)) client.Credentials = new NetworkCredential(username, configuration["SMTP:Password"]);
        await client.SendMailAsync(message, cancellationToken);
        logger.LogInformation("SMTP message delivered to {RecipientDomain}", new MailAddress(email.To).Host);
    }
}
