CREATE TABLE [dbo].[AssetExpiryReminderLogs](
    [Id] uniqueidentifier NOT NULL CONSTRAINT [PK_AssetExpiryReminderLogs] PRIMARY KEY,
    [AssetId] uniqueidentifier NOT NULL,
    [AllocationId] uniqueidentifier NULL,
    [EmployeeId] uniqueidentifier NULL,
    [RecipientName] nvarchar(200) NOT NULL,
    [RecipientEmail] nvarchar(320) NOT NULL,
    [RecipientKey] nvarchar(320) NOT NULL,
    [ExpiryType] nvarchar(80) NOT NULL,
    [ExpiryDate] date NOT NULL,
    [ReminderDate] date NOT NULL,
    [DaysRemaining] int NOT NULL,
    [Subject] nvarchar(300) NOT NULL,
    [Status] nvarchar(20) NOT NULL,
    [AttemptCount] int NOT NULL CONSTRAINT [DF_AssetExpiryReminderLogs_AttemptCount] DEFAULT 0,
    [ProviderMessageId] nvarchar(300) NULL,
    [ErrorMessage] nvarchar(1000) NULL,
    [SentAtUtc] datetime2 NULL,
    [CorrelationId] nvarchar(100) NOT NULL,
    [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_AssetExpiryReminderLogs_CreatedAt] DEFAULT SYSUTCDATETIME(),
    [UpdatedAt] datetime2 NOT NULL CONSTRAINT [DF_AssetExpiryReminderLogs_UpdatedAt] DEFAULT SYSUTCDATETIME(),
    [DeletedAt] datetime2 NULL,
    [IsDeleted] bit NOT NULL CONSTRAINT [DF_AssetExpiryReminderLogs_IsDeleted] DEFAULT 0,
    CONSTRAINT [FK_AssetExpiryReminderLogs_Assets_AssetId] FOREIGN KEY ([AssetId]) REFERENCES [dbo].[Assets]([Id]),
    CONSTRAINT [FK_AssetExpiryReminderLogs_Allocations_AllocationId] FOREIGN KEY ([AllocationId]) REFERENCES [dbo].[Allocations]([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_AssetExpiryReminderLogs_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [dbo].[Employees]([Id]) ON DELETE SET NULL,
    CONSTRAINT [CK_AssetExpiryReminderLogs_Status] CHECK ([Status] IN ('PENDING','PROCESSING','SENT','FAILED','SKIPPED'))
);
CREATE UNIQUE INDEX [UX_AssetExpiryReminderLogs_Dedup] ON [dbo].[AssetExpiryReminderLogs]([AssetId],[ExpiryType],[ExpiryDate],[RecipientKey],[DaysRemaining]);
CREATE INDEX [IX_AssetExpiryReminderLogs_ReminderDate_Status] ON [dbo].[AssetExpiryReminderLogs]([ReminderDate],[Status]);
CREATE INDEX [IX_AssetExpiryReminderLogs_RecipientEmail_CreatedAt] ON [dbo].[AssetExpiryReminderLogs]([RecipientEmail],[CreatedAt] DESC);
CREATE INDEX [IX_Assets_ExpiryReminderScan] ON [dbo].[Assets]([Status],[WarrantyExpiryDate],[ExpectedExpiryDate]) INCLUDE ([AssetCode],[Model],[AssetTypeId],[LocationId],[SerialNumber]);
