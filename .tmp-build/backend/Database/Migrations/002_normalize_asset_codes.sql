/*
   Normalize every existing asset identifier to EFU-{ASSET_TYPE_PREFIX}-{SEQUENCE}.
   Relationships are preserved because allocations, history and reports reference Asset.Id.
*/
IF OBJECT_ID(N'[dbo].[Assets]', N'U') IS NOT NULL
   AND OBJECT_ID(N'[dbo].[AssetTypes]', N'U') IS NOT NULL
BEGIN
    -- Temporary unique values avoid collisions while canonical identifiers are reassigned.
    UPDATE [dbo].[Assets]
    SET [AssetCode] = CONCAT('MIG-', REPLACE(CONVERT(nvarchar(36), [Id]), '-', ''));

    ;WITH [NumberedAssets] AS
    (
        SELECT
            [asset].[Id],
            UPPER(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([type].[Prefix])), 'EFU-', ''), ' ', ''), '-', '')) AS [CleanPrefix],
            ROW_NUMBER() OVER
            (
                PARTITION BY [asset].[AssetTypeId]
                ORDER BY [asset].[CreatedAt], [asset].[Id]
            ) AS [Sequence]
        FROM [dbo].[Assets] AS [asset]
        INNER JOIN [dbo].[AssetTypes] AS [type] ON [type].[Id] = [asset].[AssetTypeId]
    )
    UPDATE [asset]
    SET [AssetCode] = CONCAT(
        'EFU-',
        [numbered].[CleanPrefix],
        '-',
        CASE
            WHEN [numbered].[Sequence] < 10000
                THEN RIGHT(CONCAT('0000', CONVERT(varchar(20), [numbered].[Sequence])), 4)
            ELSE CONVERT(varchar(20), [numbered].[Sequence])
        END)
    FROM [dbo].[Assets] AS [asset]
    INNER JOIN [NumberedAssets] AS [numbered] ON [numbered].[Id] = [asset].[Id];
END
