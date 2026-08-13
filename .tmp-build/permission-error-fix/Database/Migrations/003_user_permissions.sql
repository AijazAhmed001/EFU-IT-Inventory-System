IF OBJECT_ID(N'[dbo].[UserPermissions]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UserPermissions]
    (
        [UserId] uniqueidentifier NOT NULL,
        [PermissionId] uniqueidentifier NOT NULL,
        [IsGranted] bit NOT NULL CONSTRAINT [DF_UserPermissions_IsGranted] DEFAULT (1),
        [GrantedByUserId] uniqueidentifier NOT NULL,
        [GrantedAt] datetime2 NOT NULL CONSTRAINT [DF_UserPermissions_GrantedAt] DEFAULT SYSUTCDATETIME(),
        [RevokedByUserId] uniqueidentifier NULL,
        [RevokedAt] datetime2 NULL,
        CONSTRAINT [PK_UserPermissions] PRIMARY KEY ([UserId], [PermissionId]),
        CONSTRAINT [FK_UserPermissions_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_UserPermissions_Permissions_PermissionId] FOREIGN KEY ([PermissionId]) REFERENCES [dbo].[Permissions]([Id]) ON DELETE CASCADE
    );
    CREATE INDEX [IX_UserPermissions_PermissionId] ON [dbo].[UserPermissions]([PermissionId]);
END
