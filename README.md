<<<<<<< HEAD
# EFU IT Hardware Inventory System

Enterprise hardware inventory application with a React, TypeScript, Vite and Tailwind frontend and an ASP.NET Core, Entity Framework Core and SQL Server backend.

## Requirements

- Node.js 20 or newer
- .NET SDK 10
- SQL Server or SQL Server LocalDB

## Backend

Copy `backend/.env.example` values into environment variables or a secure development-secret store. A new database requires `BootstrapAdmin__Email`, `BootstrapAdmin__Password`, `Jwt__Secret`, and `ConnectionStrings__DefaultConnection`.

```powershell
cd backend
dotnet restore EFU.Inventory.csproj
dotnet run --project EFU.Inventory.csproj
```

Development URL: `http://localhost:5002`

## Frontend

Copy `frontend/.env.development.example` to `frontend/.env.development` and adjust the API URL if necessary.

```powershell
cd frontend
npm install
npm run dev
```

Development URL: `http://localhost:5175`

Production validation:

```powershell
npx tsc --noEmit
npm run build
```

## Configuration

Frontend:

- `VITE_API_URL` — complete API base URL including `/api`
- `VITE_PORT` — Vite development or preview port

Backend:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Secret`, `Jwt__Issuer`, `Jwt__Audience`
- `Jwt__AccessTokenMinutes`, `Jwt__RefreshTokenDays`
- `FrontendUrl`
- `BootstrapAdmin__Email`, `BootstrapAdmin__Password` for a new database
- `SMTP__Host`, `SMTP__Port`, `SMTP__Username`, `SMTP__Password`, `SMTP__From`

Never commit production passwords, JWT secrets, SMTP credentials, or production connection strings.
=======
<!-- ======================================================================= -->

<!--                                                                         -->

<!--                    EFU IT HARDWARE INVENTORY SYSTEM                     -->

<!--                                                                         -->

<!-- ======================================================================= -->

<div align="center">

<img
width="100%"
src="https://capsule-render.vercel.app/api?type=venom&height=320&color=0:09090B,35:1E1B4B,70:512BD4,100:06B6D4&text=EFU%20IT%20HARDWARE%20INVENTORY%20SYSTEM&fontSize=39&fontColor=FFFFFF&fontAlignY=42&animation=fadeIn&desc=ENTERPRISE%20ASSET%20MANAGEMENT%20CORE&descSize=15&descAlignY=63"
/>

<br/>

<img
src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=21&duration=900&pause=180&color=7C3AED&center=true&vCenter=true&width=1150&lines=%24+namespace+EFU.Inventory.System;%24+await+EnterpriseKernel.BootAsync();;%24+await+Security.InitializeAsync();;%24+await+Inventory.InitializeAsync();;%24+await+Database.ConnectAsync();;%24+return+SystemStatus.Ready;"
/>

<br/><br/>

<a href="#runtime">
<img src="https://img.shields.io/badge/%3E_01-RUNTIME-111827?style=for-the-badge&labelColor=512BD4"/>
</a>

<a href="#modules">
<img src="https://img.shields.io/badge/%3E_02-MODULES-111827?style=for-the-badge&labelColor=512BD4"/>
</a>

<a href="#architecture">
<img src="https://img.shields.io/badge/%3E_03-ARCHITECTURE-111827?style=for-the-badge&labelColor=512BD4"/>
</a>

<a href="#security">
<img src="https://img.shields.io/badge/%3E_04-SECURITY-111827?style=for-the-badge&labelColor=512BD4"/>
</a>

<a href="#setup">
<img src="https://img.shields.io/badge/%3E_05-EXECUTE-111827?style=for-the-badge&labelColor=512BD4"/>
</a>

</div>

---

```csharp
namespace EFU.Inventory
{
    public sealed class EnterprisePlatform
    {
        public string Name =>
            "EFU IT Hardware Inventory System";

        public string[] Frontend =>
        [
            "React",
            "TypeScript",
            "Vite",
            "Tailwind CSS"
        ];

        public string[] Backend =>
        [
            "ASP.NET Core",
            ".NET 10",
            "Entity Framework Core",
            "REST API"
        ];

        public string Database =>
            "SQL Server";

        public string[] Security =>
        [
            "JWT Authentication",
            "Role Based Authorization",
            "Protected API Routes",
            "Audit Logging",
            "Environment Secret Management"
        ];

        public async Task<SystemStatus> BootAsync()
        {
            await Frontend.InitializeAsync();
            await Api.InitializeAsync();
            await SecurityLayer.InitializeAsync();
            await InventoryService.InitializeAsync();
            await Database.ConnectAsync();

            return SystemStatus.Ready;
        }
    }
}
```

<div align="center">

<img
src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=16&duration=650&pause=100&color=06B6D4&center=true&vCenter=true&width=1150&lines=const+system+%3D+await+EFU.boot();;system.authenticate();;system.authorize();;system.inventory.load();;system.dashboard.render();;system.audit.start();;system.status+%3D+%22READY%22;"
/>

</div>

---

<a id="runtime"></a>

# `01 // RUNTIME.BOOT()`

```powershell
PS EFU:\Inventory> ./boot.ps1

> Import-Module EFU.Inventory
> Initialize-EnterpriseKernel
> Initialize-FrontendRuntime
> Initialize-ApiGateway
> Initialize-SecurityLayer
> Initialize-InventoryModule
> Initialize-AuditPipeline
> Connect-Database
> Start-System

[██████████████████████████████████████████████████] 100%

EFU.Inventory::Runtime
{
    Frontend       = "READY"
    Backend        = "READY"
    Api            = "READY"
    Authentication = "ENABLED"
    Authorization  = "ENABLED"
    Database       = "CONFIGURED"
    Audit          = "ENABLED"
}
```

```typescript
type SystemRuntime = {
    frontend: "React";
    language: "TypeScript";
    api: "ASP.NET Core";
    orm: "Entity Framework Core";
    database: "SQL Server";

    authentication: {
        strategy: "JWT";
        state: "enabled";
    };

    authorization: {
        strategy: "RBAC";
        state: "enabled";
    };
};

const runtime: SystemRuntime = {
    frontend: "React",
    language: "TypeScript",
    api: "ASP.NET Core",
    orm: "Entity Framework Core",
    database: "SQL Server",

    authentication: {
        strategy: "JWT",
        state: "enabled"
    },

    authorization: {
        strategy: "RBAC",
        state: "enabled"
    }
};
```

<div align="center">

<img
width="100%"
src="https://capsule-render.vercel.app/api?type=rect&height=5&color=0:06B6D4,50:512BD4,100:7C3AED"
/>

</div>

---

<a id="modules"></a>

# `02 // MODULES.LOAD()`

```javascript
const inventory = await system.load({
    modules: {
        assets: {
            create: true,
            update: true,
            inspect: true,
            history: true
        },

        allocations: {
            assign: true,
            transfer: true,
            returnAsset: true,
            history: true
        },

        dashboard: {
            inventory: true,
            allocations: true,
            status: true,
            reporting: true
        },

        security: {
            authentication: true,
            authorization: true,
            auditing: true
        }
    }
});
```

```typescript
interface AssetRuntime {
    assetTag: string;
    serialNumber: string;
    status: string;
    assignedTo?: string;
    department?: string;
    office?: string;
}

async function executeAssetLifecycle(asset: AssetRuntime) {

    await inventory.assets.register(asset);

    await inventory.assets.validate(asset);

    await inventory.allocations.assign(asset);

    await inventory.history.record(asset);

    await audit.write({
        action: "ASSET_LIFECYCLE_EXECUTED",
        assetTag: asset.assetTag
    });

    return asset;
}
```

```csharp
public sealed class InventoryService
{
    private readonly AppDbContext _db;
    private readonly AuditService _audit;

    public InventoryService(
        AppDbContext db,
        AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task ExecuteAsync()
    {
        await LoadAssetsAsync();
        await LoadAllocationsAsync();
        await LoadHistoryAsync();
        await _audit.WriteAsync();
    }
}
```

---

# `03 // PIPELINE.EXECUTE()`

```mermaid
flowchart LR

    A["asset.create()"]
    B["asset.validate()"]
    C["inventory.store()"]
    D["allocation.assign()"]
    E["history.record()"]
    F["audit.write()"]
    G["dashboard.refresh()"]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
```

```javascript
await asset.create();

await asset.validate();

await inventory.store(asset);

await allocation.assign(asset);

await history.record(asset);

await audit.write(asset);

await dashboard.refresh();
```

<div align="center">

<img
src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=16&duration=750&pause=120&color=8B5CF6&center=true&vCenter=true&width=1100&lines=asset.create()+%E2%86%92+asset.validate()+%E2%86%92+inventory.store();;inventory.store()+%E2%86%92+allocation.assign()+%E2%86%92+history.record();;history.record()+%E2%86%92+audit.write()+%E2%86%92+dashboard.refresh();"
/>

</div>

---

# `04 // FRONTEND.RENDER()`

```tsx
export default function InventoryApplication() {
    return (
        <ApplicationShell>

            <Sidebar />

            <MainRuntime>

                <Dashboard />

                <AssetInventory />

                <AssetAllocation />

                <Reports />

                <Administration />

            </MainRuntime>

        </ApplicationShell>
    );
}
```

```typescript
const frontend = defineApplication({

    engine: "React",

    language: "TypeScript",

    compiler: "Vite",

    styling: "Tailwind CSS",

    api: {
        baseUrl: import.meta.env.VITE_API_URL
    },

    runtime: {
        dashboard: true,
        assets: true,
        allocations: true,
        reports: true
    }

});
```

```mermaid
flowchart TD

    A["<ApplicationShell />"]

    A --> B["<Sidebar />"]
    A --> C["<MainRuntime />"]

    C --> D["<Dashboard />"]
    C --> E["<AssetInventory />"]
    C --> F["<AssetAllocation />"]
    C --> G["<Reports />"]
    C --> H["<Administration />"]
```

---

# `05 // API.REQUEST()`

```http
GET /api/assets HTTP/1.1
Host: localhost:5002
Authorization: Bearer <access-token>
Accept: application/json
```

```javascript
const response = await fetch(
    `${API_URL}/assets`,
    {
        method: "GET",

        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
        }
    }
);

const assets = await response.json();
```

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class AssetsController : ControllerBase
{
    private readonly AssetService _assets;

    public AssetsController(AssetService assets)
    {
        _assets = assets;
    }

    [HttpGet]
    public async Task<IActionResult> GetAsync()
    {
        var result =
            await _assets.GetAsync();

        return Ok(result);
    }
}
```

```mermaid
sequenceDiagram

    participant UI as React
    participant API as ASP.NET_Core
    participant AUTH as JWT
    participant SVC as AssetService
    participant EF as EF_Core
    participant DB as SQL_Server

    UI->>API: GET /api/assets
    API->>AUTH: validate(token)
    AUTH-->>API: authorized
    API->>SVC: GetAsync()
    SVC->>EF: Query()
    EF->>DB: SELECT
    DB-->>EF: rows
    EF-->>SVC: entities
    SVC-->>API: DTO[]
    API-->>UI: 200 JSON
```

---

<a id="architecture"></a>

# `06 // ARCHITECTURE.COMPILE()`

```mermaid
flowchart TB

    USER(("USER"))

    subgraph CLIENT["frontend.runtime"]
        REACT["React"]
        TS["TypeScript"]
        VITE["Vite"]
        TAILWIND["Tailwind CSS"]
    end

    subgraph SERVER["backend.runtime"]
        API["ASP.NET Core"]
        AUTH["JWT / RBAC"]
        SERVICES["Application Services"]
        AUDIT["Audit Pipeline"]
    end

    subgraph DATA["data.runtime"]
        EF["Entity Framework Core"]
        SQL[("SQL Server")]
    end

    USER --> REACT

    REACT --> TS
    TS --> VITE
    VITE --> API

    API --> AUTH
    AUTH --> SERVICES

    SERVICES --> AUDIT
    SERVICES --> EF

    EF --> SQL

    SQL --> EF
    EF --> SERVICES
    SERVICES --> API
    API --> REACT
```

```csharp
namespace EFU.Inventory.Architecture
{
    public static class DependencyGraph
    {
        public static readonly string[] Runtime =
        [
            "User",
            "React",
            "TypeScript",
            "REST API",
            "ASP.NET Core",
            "Authentication",
            "Authorization",
            "Application Services",
            "Entity Framework Core",
            "SQL Server"
        ];
    }
}
```

<div align="center">

<img
src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=15&duration=600&pause=100&color=06B6D4&center=true&vCenter=true&width=1150&lines=USER+%3E%3E+REACT+%3E%3E+API+%3E%3E+AUTH+%3E%3E+SERVICE+%3E%3E+EF_CORE+%3E%3E+SQL_SERVER;SQL_SERVER+%3E%3E+EF_CORE+%3E%3E+SERVICE+%3E%3E+API+%3E%3E+REACT"
/>

</div>

---

# `07 // DATABASE.QUERY()`

```sql
SELECT
    AssetTag,
    SerialNumber,
    Status
FROM Assets;
```

```sql
SELECT
    a.AssetTag,
    a.SerialNumber,
    a.Status
FROM Assets AS a
WHERE a.IsActive = 1
ORDER BY a.AssetTag;
```

```csharp
var assets =
    await _db.Assets
        .AsNoTracking()
        .Where(asset => asset.IsActive)
        .OrderBy(asset => asset.AssetTag)
        .ToListAsync();
```

```mermaid
erDiagram

    ASSET ||--o{ ALLOCATION : has
    ASSET ||--o{ ASSET_HISTORY : records
    USER ||--o{ ALLOCATION : receives
    USER ||--o{ AUDIT_LOG : generates

    ASSET {
        int Id
        string AssetTag
        string SerialNumber
        string Status
    }

    ALLOCATION {
        int Id
        int AssetId
        int UserId
        datetime AssignedAt
    }

    ASSET_HISTORY {
        int Id
        int AssetId
        string EventType
        datetime CreatedAt
    }

    USER {
        int Id
        string Name
        string Email
    }

    AUDIT_LOG {
        int Id
        int UserId
        string Action
        datetime CreatedAt
    }
```

---

<a id="security"></a>

# `08 // SECURITY.ENFORCE()`

```csharp
services
    .AddAuthentication()
    .AddJwtBearer();

services.AddAuthorization();
```

```csharp
[Authorize]
public async Task<IActionResult> SecureOperation()
{
    var identity =
        User.Identity;

    if (identity?.IsAuthenticated != true)
        return Unauthorized();

    await _audit.WriteAsync();

    return Ok();
}
```

```typescript
async function secureRequest<T>(
    endpoint: string
): Promise<T> {

    const token =
        sessionStorage.getItem("accessToken");

    const response =
        await fetch(endpoint, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

    if (!response.ok)
        throw new Error(
            `HTTP_${response.status}`
        );

    return response.json();
}
```

```mermaid
flowchart LR

    LOGIN["login()"]

    TOKEN["jwt.issue()"]

    REQUEST["request()"]

    AUTHN["authenticate()"]

    AUTHZ["authorize()"]

    EXECUTE["execute()"]

    AUDIT["audit.write()"]

    RESPONSE["response()"]

    LOGIN --> TOKEN
    TOKEN --> REQUEST
    REQUEST --> AUTHN
    AUTHN --> AUTHZ
    AUTHZ --> EXECUTE
    EXECUTE --> AUDIT
    AUDIT --> RESPONSE
```

```diff
- Production passwords
- JWT secrets
- SMTP credentials
- Production connection strings
- Bootstrap administrator passwords
- Private environment files

+ Environment variables
+ .NET User Secrets
+ Protected CI/CD secrets
+ Secret managers
+ .gitignore
```

---

# `09 // RBAC.RESOLVE()`

```typescript
type Role =
    | "SuperAdmin"
    | "ItAdmin"
    | "Viewer";

type Permission =
    | "asset.read"
    | "asset.write"
    | "allocation.read"
    | "allocation.write"
    | "report.read"
    | "audit.read";
```

```mermaid
flowchart TD

    SYSTEM["EFU.Inventory"]

    SYSTEM --> SUPER["SuperAdmin"]
    SYSTEM --> ADMIN["ItAdmin"]
    SYSTEM --> VIEWER["Viewer"]

    SUPER --> P1["permissions.resolve()"]
    ADMIN --> P2["permissions.resolve()"]
    VIEWER --> P3["permissions.resolve()"]

    P1 --> RESOURCE["authorized.resource"]
    P2 --> RESOURCE
    P3 --> RESOURCE
```

---

# `10 // AUDIT.WRITE()`

```csharp
public async Task WriteAuditAsync(
    string action,
    string entity,
    string entityId)
{
    var entry = new AuditLog
    {
        Action = action,
        Entity = entity,
        EntityId = entityId,
        CreatedAt = DateTime.UtcNow
    };

    _db.AuditLogs.Add(entry);

    await _db.SaveChangesAsync();
}
```

```json
{
  "event": "ASSET_UPDATED",
  "entity": "Asset",
  "entityId": "<asset-id>",
  "timestamp": "<utc-time>"
}
```

---

# `11 // REPORT.EXPORT()`

```typescript
async function exportAssetReport(
    assetId: string
) {
    const asset =
        await api.assets.get(assetId);

    const history =
        await api.assets.history(assetId);

    return generateReport({
        asset,
        history
    });
}
```

```javascript
const report = {
    type: "INDIVIDUAL_ASSET_REPORT",

    source: {
        asset,
        allocationHistory,
        auditHistory
    },

    output: "PDF"
};
```

---

# `12 // BUILD.PIPELINE()`

```mermaid
flowchart LR

    CODE["source.commit()"]

    TYPE["tsc.validate()"]

    FRONTEND["vite.build()"]

    BACKEND["dotnet.build()"]

    VERIFY["runtime.verify()"]

    READY["release.ready()"]

    CODE --> TYPE
    TYPE --> FRONTEND
    FRONTEND --> BACKEND
    BACKEND --> VERIFY
    VERIFY --> READY
```

```powershell
PS EFU:\Inventory\frontend> npx tsc --noEmit

PS EFU:\Inventory\frontend> npm run build

PS EFU:\Inventory\backend> dotnet build EFU.Inventory.csproj
```

---

<a id="setup"></a>

# `13 // ENVIRONMENT.INSTALL()`

```powershell
node --version

dotnet --version
```

```text
Node.js >= 20
.NET SDK = 10
SQL Server = supported
SQL Server LocalDB = supported
```

```powershell
cd backend

dotnet restore EFU.Inventory.csproj

dotnet run --project EFU.Inventory.csproj
```

```typescript
const backend = {
    url: "http://localhost:5002"
};
```

```powershell
cd frontend

npm install

npm run dev
```

```typescript
const frontend = {
    url: "http://localhost:5173"
};
```

---

# `14 // ENVIRONMENT.CONFIGURE()`

```env
VITE_API_URL=http://localhost:5002/api
VITE_PORT=5173
```

```env
ConnectionStrings__DefaultConnection=

Jwt__Secret=
Jwt__Issuer=
Jwt__Audience=

Jwt__AccessTokenMinutes=
Jwt__RefreshTokenDays=

FrontendUrl=

BootstrapAdmin__Email=
BootstrapAdmin__Password=

SMTP__Host=
SMTP__Port=
SMTP__Username=
SMTP__Password=
SMTP__From=
```

---

# `15 // DIRECTORY.TRAVERSE()`

```text
EFU-Inventory-System
│
├── frontend
│   ├── src
│   ├── public
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.development
│
├── backend
│   ├── Controllers
│   ├── Data
│   ├── DTOs
│   ├── Models
│   ├── Services
│   ├── Middleware
│   ├── EFU.Inventory.csproj
│   └── appsettings.json
│
├── README.md
│
└── .gitignore
```

---

# `16 // RUNTIME.LOOP()`

```typescript
async function runtime() {

    while (system.running) {

        await authentication.validate();

        await inventory.synchronize();

        await allocation.observe();

        await dashboard.refresh();

        await audit.flush();

        await system.wait();
    }
}

runtime();
```

```csharp
while (!cancellationToken.IsCancellationRequested)
{
    await inventory.ProcessAsync(
        cancellationToken
    );

    await audit.FlushAsync(
        cancellationToken
    );
}
```

```python
while system.running:

    authenticate()

    authorize()

    process_inventory()

    record_audit()

    refresh_runtime()
```

```sql
BEGIN TRANSACTION;

SELECT *
FROM Assets;

COMMIT;
```

<div align="center">

<img
src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=16&duration=500&pause=80&color=7C3AED&center=true&vCenter=true&width=1150&lines=while(system.running)+await+runtime.tick();;authenticate()+%3E+authorize()+%3E+execute()+%3E+audit();;inventory.read()+%3E+service.process()+%3E+database.query();;git.add()+%3E+git.commit()+%3E+git.push();"
/>

</div>

---

# `17 // SYSTEM.STATUS()`

```json
{
  "application": "EFU IT Hardware Inventory System",

  "runtime": {
    "frontend": "React + TypeScript",
    "backend": "ASP.NET Core",
    "database": "SQL Server"
  },

  "security": {
    "authentication": "JWT",
    "authorization": "RBAC",
    "audit": true
  },

  "development": {
    "frontend": "http://localhost:5173",
    "backend": "http://localhost:5002"
  }
}
```

```mermaid
stateDiagram-v2

    [*] --> Initialize

    Initialize --> Authenticate

    Authenticate --> Authorize

    Authorize --> Inventory

    Inventory --> Process

    Process --> Audit

    Audit --> Ready

    Ready --> Inventory
```

---

<div align="center">

<img
src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=24&duration=1100&pause=250&color=06B6D4&center=true&vCenter=true&width=1150&lines=namespace+EFU.Inventory;;class+EnterpriseSystem;;await+system.ExecuteAsync();;return+SystemStatus.READY;"
/>

<br/><br/>

```console
EFU.Inventory@enterprise:~$ system.status()

{
    process     : "RUNNING",
    environment : "ENTERPRISE",
    runtime     : "READY"
}

EFU.Inventory@enterprise:~$ _
```

<br/>

<img
width="100%"
src="https://capsule-render.vercel.app/api?type=waving&height=190&section=footer&color=0:09090B,40:1E1B4B,70:512BD4,100:06B6D4&text=EFU%20IT%20HARDWARE%20INVENTORY&fontSize=25&fontColor=FFFFFF&animation=fadeIn"
/>

</div>
>>>>>>> 7e0ad1c9984c5f686e241c1ad1dd4bc2f24f14e7
