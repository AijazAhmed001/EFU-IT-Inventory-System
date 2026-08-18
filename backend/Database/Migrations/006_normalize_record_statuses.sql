-- Normalize legacy mixed-case values so API and in-process business rules agree.
UPDATE [dbo].[Employees]
SET [Status] = UPPER(LTRIM(RTRIM([Status])))
WHERE [Status] <> UPPER(LTRIM(RTRIM([Status]))) COLLATE Latin1_General_100_BIN2
   OR [Status] <> LTRIM(RTRIM([Status]));

UPDATE [dbo].[Locations]
SET [Status] = UPPER(LTRIM(RTRIM([Status])))
WHERE [Status] <> UPPER(LTRIM(RTRIM([Status]))) COLLATE Latin1_General_100_BIN2
   OR [Status] <> LTRIM(RTRIM([Status]));
