param(
    [string]$BaseUrl = 'http://localhost:5002/api',
    [Parameter(Mandatory = $true)][string]$AdminEmail,
    [Parameter(Mandatory = $true)][string]$AdminPassword
)

$ErrorActionPreference = 'Stop'
$results = [System.Collections.Generic.List[object]]::new()

function Invoke-Test {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Path,
        [object]$Body,
        [int[]]$Expected = @(200),
        [string]$Token
    )
    $headers = @{}
    if ($Token) { $headers.Authorization = "Bearer $Token" }
    try {
        $params = @{
            Uri = "$BaseUrl$Path"
            Method = $Method
            Headers = $headers
            UseBasicParsing = $true
        }
        if ($null -ne $Body) {
            $params.ContentType = 'application/json'
            $params.Body = ($Body | ConvertTo-Json -Depth 12 -Compress)
        }
        try {
            $response = Invoke-WebRequest @params
        } catch {
            $webResponse = $_.Exception.Response
            if ($null -eq $webResponse) { throw }
            $stream = $webResponse.GetResponseStream()
            $reader = [System.IO.StreamReader]::new($stream)
            $content = $reader.ReadToEnd()
            $response = [pscustomobject]@{
                StatusCode = [int]$webResponse.StatusCode
                Content = $content
                Headers = $webResponse.Headers
            }
        }
        $parsed = if ($response.Content) { $response.Content | ConvertFrom-Json } else { $null }
        $passed = $Expected -contains [int]$response.StatusCode
        $results.Add([pscustomobject]@{ Name=$Name; Status=[int]$response.StatusCode; Passed=$passed; Detail=if($passed){''}else{$response.Content} })
        return [pscustomobject]@{ Status=[int]$response.StatusCode; Json=$parsed; Headers=$response.Headers }
    } catch {
        $results.Add([pscustomobject]@{ Name=$Name; Status=0; Passed=$false; Detail=$_.Exception.Message })
        return $null
    }
}

function Add-Assertion {
    param([string]$Name, [bool]$Passed, [string]$Detail = '')
    $results.Add([pscustomobject]@{
        Name = $Name
        Status = if ($Passed) { 200 } else { 0 }
        Passed = $Passed
        Detail = if ($Passed) { '' } else { $Detail }
    })
}

Invoke-Test 'Health check' GET '/health' $null @(200) | Out-Null
$unauth = Invoke-Test 'Auth guard' GET '/dashboard' $null @(401)
$badLogin = Invoke-Test 'Invalid login' POST '/auth/login' @{email=$AdminEmail;password='intentionally-invalid-password'} @(401)
$invalidLogin = Invoke-Test 'Login validation' POST '/auth/login' @{email='not-an-email';password=''} @(400)
$login = Invoke-Test 'Admin login' POST '/auth/login' @{email=$AdminEmail;password=$AdminPassword} @(200)
if (-not $login.Json.data.accessToken) { throw 'Admin login did not return an access token.' }
$token = $login.Json.data.accessToken
$refresh = $login.Json.data.refreshToken

Invoke-Test 'Current user' GET '/auth/me' $null @(200) $token | Out-Null
Invoke-Test 'Refresh token' POST '/auth/refresh' @{refreshToken=$refresh} @(200) | Out-Null
$dashboard = Invoke-Test 'Dashboard' GET '/dashboard' $null @(200) $token
$dashboardFields = @($dashboard.Json.data.PSObject.Properties.Name)
$requiredDashboardFields = @('stats','recentAllocations','assetDistribution','departmentDistribution','latestAssets','monthlyTrend','warrantyTrend')
Add-Assertion 'Dashboard response contract' (($requiredDashboardFields | Where-Object { $_ -notin $dashboardFields }).Count -eq 0) "Missing one or more dashboard collections: $($requiredDashboardFields -join ', ')"
Invoke-Test 'Asset list' GET '/assets?page=1&limit=20' $null @(200) $token | Out-Null

$masterTypes = @('asset-type','asset-make','motherboard','memory','storage','operating-system','vendor','province','city','location','department','office','employee','lifecycle-policy')
$masterContractFields = @{
    'asset-type'='name'; 'asset-make'='name'; 'motherboard'='name'; 'memory'='size';
    'storage'='capacity'; 'operating-system'='name'; 'vendor'='name'; 'province'='name';
    'city'='name'; 'location'='name'; 'department'='name'; 'office'='name';
    'employee'='name'; 'lifecycle-policy'='assetTypeId'
}
$masterData = @{}
foreach ($type in $masterTypes) {
    $r = Invoke-Test "Master list: $type" GET "/master/$type`?limit=100" $null @(200) $token
    $masterData[$type] = @($r.Json.data)
    $items = @($r.Json.data)
    $contractOk = $items.Count -eq 0 -or ($items[0].PSObject.Properties.Name -contains $masterContractFields[$type])
    Add-Assertion "Master payload: $type" $contractOk "The '$($masterContractFields[$type])' field was not serialized."
}

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$createdMaster = Invoke-Test 'Master create' POST '/master/asset-type' @{name="Smoke Type $suffix";prefix="SMK$suffix";description='Smoke test'} @(201) $token
Add-Assertion 'Master create response contract' ($createdMaster.Json.data.name -eq "Smoke Type $suffix") 'Created master response omitted its derived fields.'
$masterId = $createdMaster.Json.data.id
Invoke-Test 'Master update' PUT "/master/asset-type/$masterId" @{name="Smoke Type Updated $suffix";prefix="SMK$suffix";description='Updated'} @(200) $token | Out-Null
Invoke-Test 'Master delete' DELETE "/master/asset-type/$masterId" $null @(204) $token | Out-Null
Invoke-Test 'Unknown master route' GET '/master/not-real' $null @(404) $token | Out-Null

$userEmail = "smoke-$suffix@example.com"
$user = Invoke-Test 'User create' POST '/users' @{name='Smoke User';email=$userEmail;password='SmokePass@123';role='VIEWER'} @(201) $token
Add-Assertion 'User response excludes password hash' (-not ($user.Json.data.PSObject.Properties.Name -contains 'passwordHash')) 'User response exposed passwordHash.'
$userId = $user.Json.data.id
$userList = Invoke-Test 'User list' GET '/users' $null @(200) $token
$listLeaksPassword = @($userList.Json.data | Where-Object { $_.PSObject.Properties.Name -contains 'passwordHash' }).Count -gt 0
Add-Assertion 'User list excludes password hashes' (-not $listLeaksPassword) 'User list exposed passwordHash.'
Invoke-Test 'User update' PATCH "/users/$userId" @{name='Smoke User Updated';status='ACTIVE';role='VIEWER'} @(200) $token | Out-Null
Invoke-Test 'User validation' POST '/users' @{name='Bad';email='bad';password='short';role='INVALID'} @(400) $token | Out-Null
$viewerLogin = Invoke-Test 'Created user login' POST '/auth/login' @{email=$userEmail;password='SmokePass@123'} @(200)
$viewerToken = $viewerLogin.Json.data.accessToken
Invoke-Test 'Role authorization' DELETE "/master/asset-type/$masterId" $null @(403) $viewerToken | Out-Null

$forgot = Invoke-Test 'Forgot password' POST '/auth/forgot-password' @{email=$userEmail} @(200)
$resetToken = $forgot.Json.data.resetToken
if ($resetToken) {
    Invoke-Test 'Reset password' POST '/auth/reset-password' @{token=$resetToken;newPassword='SmokePass@456'} @(200) | Out-Null
    $viewerLogin2 = Invoke-Test 'Login after reset' POST '/auth/login' @{email=$userEmail;password='SmokePass@456'} @(200)
    $viewerToken = $viewerLogin2.Json.data.accessToken
}

$employee = Invoke-Test 'Employee create' POST '/master/employee' @{name='Smoke Employee';employeeId="EMP-$suffix";email="employee-$suffix@example.com";status='ACTIVE'} @(201) $token
Add-Assertion 'Employee create response contract' ($employee.Json.data.name -eq 'Smoke Employee') 'Created employee response omitted its derived fields.'
$employeeId = $employee.Json.data.id
$assetTypeId = $masterData['asset-type'][0].id
$assetBody = @{
    assetTypeId=$assetTypeId; model='Smoke Model'; serialNumber="SER-$suffix";
    purchaseDate=(Get-Date).ToUniversalTime().ToString('o'); purchaseCost=1000;
    condition='NEW'
}
$asset = Invoke-Test 'Asset create' POST '/assets' $assetBody @(201) $token
$assetId = $asset.Json.data.id
Invoke-Test 'Asset list/read' GET "/assets/$assetId" $null @(200) $token | Out-Null
$assetBody.model = 'Smoke Model Updated'
Invoke-Test 'Asset update' PUT "/assets/$assetId" $assetBody @(200) $token | Out-Null
Invoke-Test 'Duplicate asset validation' POST '/assets' $assetBody @(409) $token | Out-Null
Invoke-Test 'Invalid asset validation' POST '/assets' @{model='Missing fields'} @(400) $token | Out-Null

$now = (Get-Date).ToUniversalTime().ToString('o')
Invoke-Test 'Allocate asset' POST '/transactions/allocate' @{assetId=$assetId;employeeId=$employeeId;allocationDate=$now;remarks='Smoke'} @(201) $token | Out-Null
Invoke-Test 'Allocate conflict' POST '/transactions/allocate' @{assetId=$assetId;employeeId=$employeeId;allocationDate=$now} @(409) $token | Out-Null
Invoke-Test 'Revoke asset' POST '/transactions/revoke' @{assetId=$assetId;reason='Smoke return';condition='GOOD';revocationDate=$now} @(201) $token | Out-Null
Invoke-Test 'Revoke conflict' POST '/transactions/revoke' @{assetId=$assetId;reason='Again';revocationDate=$now} @(409) $token | Out-Null
Invoke-Test 'Retire asset' POST '/transactions/retire' @{assetId=$assetId;reason='Smoke retirement';endOfLifeAction='DISPOSE';expirationDate=$now} @(201) $token | Out-Null
Invoke-Test 'Retire conflict' POST '/transactions/retire' @{assetId=$assetId;reason='Again';endOfLifeAction='DISPOSE';expirationDate=$now} @(409) $token | Out-Null

Invoke-Test 'Asset history report' GET "/reports/asset-history/$assetId" $null @(200) $token | Out-Null
Invoke-Test 'Inventory report' GET '/reports/inventory' $null @(200) $token | Out-Null
Invoke-Test 'Audit report' GET '/reports/audit?page=1&limit=10' $null @(200) $token | Out-Null
Invoke-Test 'Settings read' GET '/settings' $null @(200) $token | Out-Null
Invoke-Test 'Settings update' PUT '/settings' @{smokeTest=$suffix} @(200) $token | Out-Null
Invoke-Test 'Notifications list' GET '/notifications' $null @(200) $token | Out-Null
Invoke-Test 'Notifications read all' PATCH '/notifications/read-all' @{} @(200) $token | Out-Null
Invoke-Test 'Notification not found' PATCH '/notifications/00000000-0000-0000-0000-000000000001/read' @{} @(404) $token | Out-Null

$profile = Invoke-Test 'Profile update' PATCH '/auth/me' @{phone='+92-000-0000000'} @(200) $viewerToken
Invoke-Test 'Change password validation' POST '/auth/change-password' @{currentPassword='wrong';newPassword='Another@123'} @(400) $viewerToken | Out-Null
Invoke-Test 'Change password' POST '/auth/change-password' @{currentPassword='SmokePass@456';newPassword='SmokePass@789'} @(200) $viewerToken | Out-Null
Invoke-Test 'Login after password change' POST '/auth/login' @{email=$userEmail;password='SmokePass@789'} @(200) | Out-Null
Invoke-Test 'Self-delete validation' DELETE "/users/$($login.Json.data.user.id)" $null @(400) $token | Out-Null
Invoke-Test 'User delete' DELETE "/users/$userId" $null @(204) $token | Out-Null
Invoke-Test 'Logout' POST '/auth/logout' @{refreshToken=$refresh} @(200) $token | Out-Null
Invoke-Test 'Asset delete' DELETE "/assets/$assetId" $null @(204) $token | Out-Null
Invoke-Test 'Employee delete' DELETE "/master/employee/$employeeId" $null @(204) $token | Out-Null

$corsHeaders = @{ Origin='http://localhost:5175'; 'Access-Control-Request-Method'='POST'; 'Access-Control-Request-Headers'='content-type,authorization' }
$cors = Invoke-WebRequest -Uri "$BaseUrl/auth/login" -Method OPTIONS -Headers $corsHeaders -UseBasicParsing
$corsPassed = $cors.Headers['Access-Control-Allow-Origin'] -contains 'http://localhost:5175'
$results.Add([pscustomobject]@{Name='CORS preflight';Status=[int]$cors.StatusCode;Passed=$corsPassed;Detail=($cors.Headers | Out-String)})

$results | Format-Table Name,Status,Passed -AutoSize
$failed = @($results | Where-Object { -not $_.Passed })
Write-Output "TOTAL=$($results.Count) PASSED=$($results.Count-$failed.Count) FAILED=$($failed.Count)"
if ($failed.Count) {
    $failed | Format-List Name,Status,Detail
    exit 1
}
