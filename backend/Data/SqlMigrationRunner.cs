using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.SqlClient;

namespace EFU.Inventory.Data;

public class SqlMigrationRunner(IConfiguration configuration, IWebHostEnvironment environment, ILogger<SqlMigrationRunner> logger)
{
    public async Task MigrateAsync(CancellationToken cancellationToken = default)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");

        await EnsureDatabaseExistsAsync(connectionString, cancellationToken);

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        const string createHistory = """
IF OBJECT_ID(N'[dbo].[__DatabaseMigrations]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[__DatabaseMigrations](
        [Version] nvarchar(200) NOT NULL CONSTRAINT [PK___DatabaseMigrations] PRIMARY KEY,
        [Checksum] nvarchar(64) NOT NULL,
        [AppliedAt] datetime2 NOT NULL CONSTRAINT [DF___DatabaseMigrations_AppliedAt] DEFAULT SYSUTCDATETIME()
    );
END
""";
        await using (var cmd = new SqlCommand(createHistory, connection))
            await cmd.ExecuteNonQueryAsync(cancellationToken);

        var migrationDir = Path.Combine(environment.ContentRootPath, "Database", "Migrations");
        if (!Directory.Exists(migrationDir))
            throw new DirectoryNotFoundException($"Database migration directory not found: {migrationDir}");

        foreach (var file in Directory.GetFiles(migrationDir, "*.sql").OrderBy(Path.GetFileName))
        {
            var version = Path.GetFileName(file);
            var sql = await File.ReadAllTextAsync(file, cancellationToken);
            var normalizedSql = NormalizeLineEndings(sql);
            var checksum = CalculateChecksum(normalizedSql);
            var compatibleChecksums = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                checksum,
                CalculateChecksum(normalizedSql.Replace("\n", "\r\n", StringComparison.Ordinal))
            };

            await using var check = new SqlCommand("SELECT [Checksum] FROM [dbo].[__DatabaseMigrations] WHERE [Version]=@v", connection);
            check.Parameters.AddWithValue("@v", version);
            var existing = (string?)await check.ExecuteScalarAsync(cancellationToken);
            if (existing is not null)
            {
                if (!compatibleChecksums.Contains(existing))
                    throw new InvalidOperationException($"Migration '{version}' was modified after being applied. Create a new migration instead.");
                continue;
            }

            logger.LogInformation("Applying database migration {Migration}", version);
            await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);
            try
            {
                foreach (var batch in SplitBatches(sql))
                {
                    if (string.IsNullOrWhiteSpace(batch)) continue;
                    await using var command = new SqlCommand(batch, connection, transaction) { CommandTimeout = 120 };
                    await command.ExecuteNonQueryAsync(cancellationToken);
                }

                await using var insert = new SqlCommand(
                    "INSERT INTO [dbo].[__DatabaseMigrations]([Version],[Checksum]) VALUES(@v,@c)", connection, transaction);
                insert.Parameters.AddWithValue("@v", version);
                insert.Parameters.AddWithValue("@c", checksum);
                await insert.ExecuteNonQueryAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }

    private static IEnumerable<string> SplitBatches(string sql) =>
        System.Text.RegularExpressions.Regex.Split(sql, @"^\s*GO\s*;?\s*$",
            System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);

    private static string NormalizeLineEndings(string sql) =>
        sql.Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace("\r", "\n", StringComparison.Ordinal);

    private static string CalculateChecksum(string sql) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(sql)));

    private static async Task EnsureDatabaseExistsAsync(string connectionString, CancellationToken cancellationToken)
    {
        var builder = new SqlConnectionStringBuilder(connectionString);
        var database = builder.InitialCatalog;
        if (string.IsNullOrWhiteSpace(database)) return;

        var master = new SqlConnectionStringBuilder(connectionString) { InitialCatalog = "master" };
        await using var connection = new SqlConnection(master.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        var safeDb = database.Replace("]", "]]", StringComparison.Ordinal);
        var sql = $"IF DB_ID(@db) IS NULL EXEC('CREATE DATABASE [{safeDb}]')";
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@db", database);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
