using EFU.Inventory.Models;
using Microsoft.EntityFrameworkCore;
using OperatingSystemEntity = EFU.Inventory.Models.OperatingSystem;

namespace EFU.Inventory.Data;

public static class VolumeTestSeeder
{
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (await db.AssetTypes.AnyAsync(x => x.Name.StartsWith("Volume Type "), ct)) return;
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var types = new List<AssetType>(); var makes = new List<AssetMake>();
        var boards = new List<Motherboard>(); var memories = new List<Memory>();
        var storages = new List<Storage>(); var systems = new List<OperatingSystemEntity>();
        var vendors = new List<Vendor>(); var provinces = new List<Province>();
        var departments = new List<Department>();
        for (var i = 1; i <= 55; i++)
        {
            types.Add(new AssetType { Name = $"Volume Type {i:00}", Prefix = $"V{i:00}", Description = "Development volume-test category" });
            makes.Add(new AssetMake { Name = $"Volume Make {i:00}" });
            boards.Add(new Motherboard { Name = $"Volume Processor {i:00}", Generation = $"Gen {i}" });
            memories.Add(new Memory { Size = $"{i + 3} GB", Type = "VOLUME DDR4" });
            storages.Add(new Storage { Type = $"Volume SSD {i:00}", Capacity = $"{i * 64} GB" });
            systems.Add(new OperatingSystemEntity { Name = $"Volume OS {i:00}", Version = "1.0" });
            vendors.Add(new Vendor { Name = $"Volume Vendor {i:00}", Contact = $"Contact {i:00}", Phone = $"0300{i:0000000}", Email = $"volume.vendor{i:00}@example.test", Ntn = $"VOL-NTN-{i:0000}" });
            provinces.Add(new Province { Name = $"Volume Province {i:00}" });
            departments.Add(new Department { Name = $"Volume Department {i:00}" });
        }
        db.AddRange(types); db.AddRange(makes); db.AddRange(boards); db.AddRange(memories);
        db.AddRange(storages); db.AddRange(systems); db.AddRange(vendors); db.AddRange(provinces); db.AddRange(departments);
        await db.SaveChangesAsync(ct);

        var cities = provinces.Select((province, index) => new City { Name = $"Volume City {index + 1:00}", ProvinceId = province.Id }).ToList();
        db.Cities.AddRange(cities); await db.SaveChangesAsync(ct);
        var locations = cities.Select((city, index) => new Location { Name = $"Volume Location {index + 1:00}", ProvinceId = provinces[index].Id, CityId = city.Id }).ToList();
        db.Locations.AddRange(locations); await db.SaveChangesAsync(ct);
        var offices = locations.Select((location, index) => new Office { Name = $"Volume Office {index + 1:00}", LocationId = location.Id }).ToList();
        db.Offices.AddRange(offices); await db.SaveChangesAsync(ct);

        var employees = Enumerable.Range(1, 55).Select(i => new Employee
        {
            Name = $"Volume Employee {i:00}", EmployeeId = $"EFU-VOL-{i:0000}", Email = $"volume.employee{i:00}@example.test",
            Phone = $"0311{i:0000000}", DepartmentId = departments[i - 1].Id, LocationId = locations[i - 1].Id, OfficeId = offices[i - 1].Id
        }).ToList();
        db.Employees.AddRange(employees);
        db.LifecyclePolicies.AddRange(types.Select(type => new LifecyclePolicy { AssetTypeId = type.Id, ExpectedLifespanYears = 5, WarrantyPeriodYears = 3 }));
        await db.SaveChangesAsync(ct);

        var today = DateTime.UtcNow.Date;
        var assets = Enumerable.Range(1, 55).Select(i => new Asset
        {
            AssetCode = $"EFU-V{i:00}-0001", AssetTag = $"EFU-VOL-TAG-{i:0000}", SerialNumber = $"VOL-SERIAL-{i:0000}", Model = $"Volume Test Asset {i:00}",
            AssetTypeId = types[i - 1].Id, AssetMakeId = makes[i - 1].Id, MotherboardId = boards[i - 1].Id, MemoryId = memories[i - 1].Id,
            StorageId = storages[i - 1].Id, OperatingSystemId = systems[i - 1].Id, VendorId = vendors[i - 1].Id, LocationId = locations[i - 1].Id,
            PurchaseDate = today.AddDays(-i * 5), AddingDate = today.AddDays(-i), PurchaseCost = 50000 + i * 2500,
            WarrantyExpiryDate = today.AddMonths((i % 6) + 1), ExpectedExpiryDate = today.AddYears(5), Condition = "New",
            Status = i <= 35 ? AssetStatuses.Allocated : AssetStatuses.InStock
        }).ToList();
        db.Assets.AddRange(assets);
        db.AssetStatusHistories.AddRange(assets.Select(asset => new AssetStatusHistory { AssetId = asset.Id, FromStatus = "NEW", ToStatus = AssetStatuses.InStock, EventType = "CREATED", EffectiveAt = asset.AddingDate }));
        await db.SaveChangesAsync(ct);

        db.Allocations.AddRange(Enumerable.Range(1, 50).Select(i => new Allocation
        {
            AssetId = assets[i - 1].Id, EmployeeId = employees[i - 1].Id, LocationId = locations[i - 1].Id,
            AllocationDate = today.AddDays(-i), ReturnedAt = i > 35 ? today.AddDays(-(i - 35)) : null,
            Remarks = "Development volume-test allocation"
        }));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
