IF OBJECT_ID(N'[dbo].[PermissionHistory]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PermissionHistory]
    (
        [Id] bigint IDENTITY(1,1) NOT NULL CONSTRAINT [PK_PermissionHistory] PRIMARY KEY,
        [UserId] uniqueidentifier NOT NULL,
        [PermissionId] uniqueidentifier NOT NULL,
        [PreviousValue] bit NOT NULL,
        [NewValue] bit NOT NULL,
        [ChangedByUserId] uniqueidentifier NOT NULL,
        [ChangedAt] datetime2 NOT NULL CONSTRAINT [DF_PermissionHistory_ChangedAt] DEFAULT SYSUTCDATETIME(),
        [CorrelationId] nvarchar(100) NOT NULL,
        CONSTRAINT [FK_PermissionHistory_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_PermissionHistory_Permissions_PermissionId] FOREIGN KEY ([PermissionId]) REFERENCES [dbo].[Permissions]([Id]),
        CONSTRAINT [FK_PermissionHistory_Users_ChangedByUserId] FOREIGN KEY ([ChangedByUserId]) REFERENCES [dbo].[Users]([Id])
    );
    CREATE INDEX [IX_PermissionHistory_UserId_ChangedAt] ON [dbo].[PermissionHistory]([UserId], [ChangedAt] DESC);
END
