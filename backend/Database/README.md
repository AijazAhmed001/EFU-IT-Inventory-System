# Database setup
Default provider: SQL Server via Entity Framework Core.
The project auto-creates the database for first-run development. For production, generate and commit EF Core migrations with:
`dotnet ef migrations add InitialCreate` then `dotnet ef database update`.
All major lookup fields have unique indexes and all lifecycle records use foreign keys through EF conventions. Business records use soft deletion through `IsDeleted` query filters.
