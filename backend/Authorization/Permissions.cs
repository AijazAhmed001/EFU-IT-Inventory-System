namespace EFU.Inventory.Authorization;

public sealed record PermissionDefinition(string Code, string Name, string Group, string? Requires = null, bool Sensitive = false);

public static class Permissions
{
    // Internal dynamic policy keys; these are not grantable catalog entries.
    public const string MasterViewPolicy = "master.$route.view";
    public const string MasterManagePolicy = "master.$route.manage";
    public const string DashboardView = "dashboard.view";
    public const string AssetsView = "assets.view";
    public const string AssetsCreate = "assets.create";
    public const string AssetsUpdate = "assets.update";
    public const string AssetsDelete = "assets.delete";
    public const string AttachmentsDownload = "assets.attachments.download";
    public const string AttachmentsUpload = "assets.attachments.upload";
    public const string AttachmentsDelete = "assets.attachments.delete";
    public const string AllocationsView = "allocations.view";
    public const string AllocationsCreate = "allocations.create";
    public const string AllocationsRevoke = "allocations.revoke";
    public const string AssetsRetire = "assets.retire";
    public const string ReportsInventoryView = "reports.inventory.view";
    public const string ReportsAssetHistoryView = "reports.asset-history.view";
    public const string ReportsAuditView = "reports.audit.view";
    public const string ReportsExportPdf = "reports.export.pdf";
    public const string ReportsExportCsv = "reports.export.csv";
    public const string ReportsExportXlsx = "reports.export.xlsx";
    public const string NotificationsView = "notifications.view";
    public const string NotificationsManage = "notifications.manage";
    public const string UsersView = "users.view";
    public const string UsersCreate = "users.create";
    public const string UsersUpdate = "users.update";
    public const string UsersDeactivate = "users.deactivate";
    public const string UsersDelete = "users.delete";
    public const string UserPermissionsManage = "users.permissions.manage";
    public const string SettingsView = "settings.view";
    public const string SettingsUpdate = "settings.update";
    public const string AuditView = "audit.view";
    public const string SessionsManage = "sessions.manage";
    public const string BackupsView = "backups.view";
    public const string BackupsManage = "backups.manage";

    public static readonly IReadOnlyList<string> MasterKinds =
    ["asset-types", "asset-makes", "motherboards", "memory", "storage", "operating-systems", "vendors", "provinces", "cities", "locations", "departments", "offices", "employees", "lifecycle-policies"];

    public static string MasterView(string kind) => $"master.{kind}.view";
    public static string MasterManage(string kind) => $"master.{kind}.manage";

    public static string? MasterKindFromRoute(string? routeType) => routeType switch
    {
        "asset-type" => "asset-types", "asset-make" => "asset-makes", "motherboard" => "motherboards",
        "memory" => "memory", "storage" => "storage", "operating-system" => "operating-systems",
        "vendor" => "vendors", "province" => "provinces", "city" => "cities", "location" => "locations",
        "department" => "departments", "office" => "offices", "employee" => "employees",
        "lifecycle-policy" => "lifecycle-policies", _ => null
    };

    public static readonly IReadOnlyList<PermissionDefinition> Catalog = BuildCatalog();
    public static readonly IReadOnlyList<string> All = Catalog.Select(x => x.Code).ToArray();
    public static readonly IReadOnlySet<string> AllSet = All.ToHashSet(StringComparer.Ordinal);
    public static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> AdditionalDependencies =
        new Dictionary<string, IReadOnlyList<string>>(StringComparer.Ordinal)
        { [AllocationsCreate] = [AssetsView] };

    private static IReadOnlyList<PermissionDefinition> BuildCatalog()
    {
        var items = new List<PermissionDefinition>
        {
            new(DashboardView, "View Dashboard", "Dashboard"),
            new(AssetsView, "View Assets", "Assets"),
            new(AssetsCreate, "Create Assets", "Assets", AssetsView),
            new(AssetsUpdate, "Edit Assets", "Assets", AssetsView),
            new(AssetsDelete, "Delete Assets", "Assets", AssetsView, true),
            new(AttachmentsDownload, "View / Download Attachments", "Asset Attachments", AssetsView),
            new(AttachmentsUpload, "Upload Attachments", "Asset Attachments", AssetsView),
            new(AttachmentsDelete, "Delete Attachments", "Asset Attachments", AttachmentsDownload, true),
            new(AllocationsView, "View Allocations", "Allocations"),
            new(AllocationsCreate, "Allocate Assets", "Allocations", AllocationsView),
            new(AllocationsRevoke, "Return / Revoke Assets", "Returns / Revocations", AllocationsView, true),
            new(AssetsRetire, "Retire Assets", "Asset Retirement", AssetsView, true),
        };
        foreach (var kind in MasterKinds)
        {
            var label = string.Join(' ', kind.Split('-').Select(word => char.ToUpperInvariant(word[0]) + word[1..]));
            items.Add(new(MasterView(kind), $"View {label}", "Master Data"));
            items.Add(new(MasterManage(kind), $"Manage {label}", "Master Data", MasterView(kind)));
        }
        items.AddRange([
            new(ReportsInventoryView, "View Inventory Reports", "Reports"),
            new(ReportsAssetHistoryView, "View Asset History", "Reports"),
            new(ReportsAuditView, "View Audit Reports", "Reports", AuditView),
            new(ReportsExportPdf, "Export PDF", "Reports", ReportsInventoryView),
            new(ReportsExportCsv, "Export CSV", "Reports", ReportsInventoryView),
            new(ReportsExportXlsx, "Export Excel", "Reports", ReportsInventoryView),
            new(NotificationsView, "View Notifications", "Notifications"),
            new(NotificationsManage, "Manage Notifications", "Notifications", NotificationsView),
            new(UsersView, "View Users", "Users", null, true),
            new(UsersCreate, "Create Users", "Users", UsersView, true),
            new(UsersUpdate, "Edit Users", "Users", UsersView, true),
            new(UsersDeactivate, "Deactivate Users", "Users", UsersView, true),
            new(UsersDelete, "Delete Users", "Users", UsersView, true),
            new(UserPermissionsManage, "Manage User Permissions", "Users", UsersView, true),
            new(SettingsView, "View Settings", "Settings"),
            new(SettingsUpdate, "Update Settings", "Settings", SettingsView, true),
            new(AuditView, "View Audit Trail", "Audit", null, true),
            new(SessionsManage, "Manage Sessions", "Sessions", null, true),
            new(BackupsView, "View Backups", "Backups", null, true),
            new(BackupsManage, "Manage Backups", "Backups", BackupsView, true)
        ]);
        return items;
    }
}
