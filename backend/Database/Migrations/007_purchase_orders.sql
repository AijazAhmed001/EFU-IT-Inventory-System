SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'PurchaseOrderNumberSequence' AND schema_id = SCHEMA_ID('dbo'))
    EXEC('CREATE SEQUENCE dbo.PurchaseOrderNumberSequence AS bigint START WITH 1150000000 INCREMENT BY 1 CACHE 50');

IF OBJECT_ID('dbo.PurchaseOrders','U') IS NULL CREATE TABLE dbo.PurchaseOrders(
 Id uniqueidentifier NOT NULL CONSTRAINT PK_PurchaseOrders PRIMARY KEY, PoNumber nvarchar(32) NOT NULL, Commodity nvarchar(100) NOT NULL, PoDate datetime2 NOT NULL, PoYear int NOT NULL,
 EfuReference nvarchar(100) NULL, PoFor nvarchar(100) NOT NULL, CurrencyCode char(3) NOT NULL, IsCommercial bit NOT NULL, VendorId uniqueidentifier NOT NULL, VendorEmailSnapshot nvarchar(320) NULL,
 QuotationId nvarchar(100) NULL, QuotationDate datetime2 NULL, TermsAndConditions nvarchar(max) NULL, PaymentTerms nvarchar(100) NULL, ShipmentTime nvarchar(100) NULL, ShipmentTag nvarchar(100) NULL,
 ShipmentDate datetime2 NULL, ShipmentWithin nvarchar(100) NULL, ExpectedDeliveryDate datetime2 NULL, DeliveryLocationId uniqueidentifier NULL, DeliveryAddress nvarchar(500) NULL,
 ContactPerson nvarchar(150) NULL, ContactNumber nvarchar(50) NULL, DeliveryInstructions nvarchar(2000) NULL, InternalNotes nvarchar(4000) NULL, VendorNotes nvarchar(4000) NULL, Remarks nvarchar(2000) NULL,
 Subtotal decimal(18,2) NOT NULL, DiscountTotal decimal(18,2) NOT NULL, TaxTotal decimal(18,2) NOT NULL, OtherCharges decimal(18,2) NOT NULL, GrandTotal decimal(18,2) NOT NULL,
 Status nvarchar(32) NOT NULL, IsLocked bit NOT NULL, Source nvarchar(16) NOT NULL CONSTRAINT DF_PO_Source DEFAULT 'LOCAL', ExternalReference nvarchar(150) NULL, LastSyncedAt datetime2 NULL, LastSyncResult nvarchar(1000) NULL,
 CreatedByUserId uniqueidentifier NOT NULL, ApprovedByUserId uniqueidentifier NULL, ApprovedAt datetime2 NULL, RejectedByUserId uniqueidentifier NULL, RejectedAt datetime2 NULL, RejectionReason nvarchar(2000) NULL,
 CancelledByUserId uniqueidentifier NULL, CancelledAt datetime2 NULL, CancellationReason nvarchar(2000) NULL, ClosedAt datetime2 NULL, RowVersion rowversion NOT NULL,
 CreatedAt datetime2 NOT NULL, UpdatedAt datetime2 NOT NULL, DeletedAt datetime2 NULL, IsDeleted bit NOT NULL,
 CONSTRAINT FK_PO_Vendor FOREIGN KEY(VendorId) REFERENCES dbo.Vendors(Id), CONSTRAINT FK_PO_Location FOREIGN KEY(DeliveryLocationId) REFERENCES dbo.Locations(Id), CONSTRAINT FK_PO_Creator FOREIGN KEY(CreatedByUserId) REFERENCES dbo.Users(Id),
 CONSTRAINT CK_PO_Totals CHECK(Subtotal>=0 AND DiscountTotal>=0 AND TaxTotal>=0 AND OtherCharges>=0 AND GrandTotal>=0), CONSTRAINT CK_PO_Status CHECK(Status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','PARTIALLY_RECEIVED','FULLY_RECEIVED','CANCELLED','CLOSED')));
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_PurchaseOrders_PoNumber') CREATE UNIQUE INDEX UX_PurchaseOrders_PoNumber ON dbo.PurchaseOrders(PoNumber);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_PurchaseOrders_Status_PoDate') CREATE INDEX IX_PurchaseOrders_Status_PoDate ON dbo.PurchaseOrders(Status,PoDate);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_PurchaseOrders_Year_Vendor') CREATE INDEX IX_PurchaseOrders_Year_Vendor ON dbo.PurchaseOrders(PoYear,VendorId);

IF OBJECT_ID('dbo.PurchaseOrderItems','U') IS NULL CREATE TABLE dbo.PurchaseOrderItems(
 Id uniqueidentifier NOT NULL CONSTRAINT PK_PurchaseOrderItems PRIMARY KEY, PurchaseOrderId uniqueidentifier NOT NULL, LineNumber int NOT NULL, ItemCode nvarchar(100) NULL, ItemName nvarchar(200) NOT NULL,
 AssetTypeId uniqueidentifier NULL, AssetMakeId uniqueidentifier NULL, Model nvarchar(200) NULL, QualityType nvarchar(100) NULL, PrinterType nvarchar(100) NULL, ProductName nvarchar(200) NULL, Description nvarchar(2000) NULL,
 UnitPrice decimal(18,2) NOT NULL, Quantity decimal(18,2) NOT NULL, ReceivedQuantity decimal(18,2) NOT NULL, TaxRate decimal(5,2) NOT NULL, DiscountType nvarchar(16) NOT NULL, DiscountValue decimal(18,2) NOT NULL,
 DiscountAmount decimal(18,2) NOT NULL, TaxAmount decimal(18,2) NOT NULL, LineTotal decimal(18,2) NOT NULL, BranchUnitId uniqueidentifier NULL, IntendedUserId uniqueidentifier NULL, Remarks nvarchar(2000) NULL, RowVersion rowversion NOT NULL,
 CreatedAt datetime2 NOT NULL, UpdatedAt datetime2 NOT NULL, DeletedAt datetime2 NULL, IsDeleted bit NOT NULL,
 CONSTRAINT FK_POItems_PO FOREIGN KEY(PurchaseOrderId) REFERENCES dbo.PurchaseOrders(Id), CONSTRAINT FK_POItems_Type FOREIGN KEY(AssetTypeId) REFERENCES dbo.AssetTypes(Id), CONSTRAINT FK_POItems_Make FOREIGN KEY(AssetMakeId) REFERENCES dbo.AssetMakes(Id),
 CONSTRAINT FK_POItems_Location FOREIGN KEY(BranchUnitId) REFERENCES dbo.Locations(Id), CONSTRAINT FK_POItems_User FOREIGN KEY(IntendedUserId) REFERENCES dbo.Users(Id),
 CONSTRAINT CK_POItems_Values CHECK(Quantity>0 AND ReceivedQuantity>=0 AND ReceivedQuantity<=Quantity AND UnitPrice>=0 AND TaxRate>=0 AND TaxRate<=100 AND DiscountValue>=0));
CREATE UNIQUE INDEX UX_PurchaseOrderItems_Line ON dbo.PurchaseOrderItems(PurchaseOrderId,LineNumber);

IF OBJECT_ID('dbo.PurchaseOrderAttachments','U') IS NULL CREATE TABLE dbo.PurchaseOrderAttachments(Id uniqueidentifier NOT NULL PRIMARY KEY,PurchaseOrderId uniqueidentifier NOT NULL,Category nvarchar(32) NOT NULL,OriginalFileName nvarchar(260) NOT NULL,StorageKey nvarchar(100) NOT NULL,MimeType nvarchar(100) NOT NULL,FileSize bigint NOT NULL,UploadedByUserId uniqueidentifier NOT NULL,UploadedAt datetime2 NOT NULL,CreatedAt datetime2 NOT NULL,UpdatedAt datetime2 NOT NULL,DeletedAt datetime2 NULL,IsDeleted bit NOT NULL,CONSTRAINT FK_POAttachments_PO FOREIGN KEY(PurchaseOrderId) REFERENCES dbo.PurchaseOrders(Id));
IF OBJECT_ID('dbo.PurchaseOrderStatusHistory','U') IS NULL CREATE TABLE dbo.PurchaseOrderStatusHistory(Id uniqueidentifier NOT NULL PRIMARY KEY,PurchaseOrderId uniqueidentifier NOT NULL,FromStatus nvarchar(32) NULL,ToStatus nvarchar(32) NOT NULL,Action nvarchar(50) NOT NULL,Comment nvarchar(2000) NULL,PerformedByUserId uniqueidentifier NOT NULL,PerformedAt datetime2 NOT NULL,CreatedAt datetime2 NOT NULL,UpdatedAt datetime2 NOT NULL,DeletedAt datetime2 NULL,IsDeleted bit NOT NULL,CONSTRAINT FK_POHistory_PO FOREIGN KEY(PurchaseOrderId) REFERENCES dbo.PurchaseOrders(Id),CONSTRAINT FK_POHistory_User FOREIGN KEY(PerformedByUserId) REFERENCES dbo.Users(Id));
CREATE INDEX IX_POHistory_PO_Time ON dbo.PurchaseOrderStatusHistory(PurchaseOrderId,PerformedAt);

IF OBJECT_ID('dbo.GoodsReceipts','U') IS NULL CREATE TABLE dbo.GoodsReceipts(Id uniqueidentifier NOT NULL PRIMARY KEY,ReceiptNumber nvarchar(50) NOT NULL,PurchaseOrderId uniqueidentifier NOT NULL,ReceivedDate datetime2 NOT NULL,DeliveryChallanNumber nvarchar(100) NULL,InvoiceNumber nvarchar(100) NULL,ReceivedByUserId uniqueidentifier NOT NULL,LocationId uniqueidentifier NOT NULL,Notes nvarchar(2000) NULL,AttachmentStorageKey nvarchar(100) NULL,RowVersion rowversion NOT NULL,CreatedAt datetime2 NOT NULL,UpdatedAt datetime2 NOT NULL,DeletedAt datetime2 NULL,IsDeleted bit NOT NULL,CONSTRAINT FK_GR_PO FOREIGN KEY(PurchaseOrderId) REFERENCES dbo.PurchaseOrders(Id));
CREATE UNIQUE INDEX UX_GoodsReceipts_Number ON dbo.GoodsReceipts(ReceiptNumber);
IF OBJECT_ID('dbo.GoodsReceiptItems','U') IS NULL CREATE TABLE dbo.GoodsReceiptItems(Id uniqueidentifier NOT NULL PRIMARY KEY,GoodsReceiptId uniqueidentifier NOT NULL,PurchaseOrderItemId uniqueidentifier NOT NULL,QuantityReceived decimal(18,2) NOT NULL,Condition nvarchar(50) NOT NULL,Notes nvarchar(2000) NULL,CreatedAt datetime2 NOT NULL,UpdatedAt datetime2 NOT NULL,DeletedAt datetime2 NULL,IsDeleted bit NOT NULL,CONSTRAINT FK_GRI_GR FOREIGN KEY(GoodsReceiptId) REFERENCES dbo.GoodsReceipts(Id),CONSTRAINT FK_GRI_POItem FOREIGN KEY(PurchaseOrderItemId) REFERENCES dbo.PurchaseOrderItems(Id),CONSTRAINT CK_GRI_Qty CHECK(QuantityReceived>0));
CREATE UNIQUE INDEX UX_GRI_Receipt_Item ON dbo.GoodsReceiptItems(GoodsReceiptId,PurchaseOrderItemId);
IF OBJECT_ID('dbo.GoodsReceiptUnits','U') IS NULL CREATE TABLE dbo.GoodsReceiptUnits(Id uniqueidentifier NOT NULL PRIMARY KEY,GoodsReceiptItemId uniqueidentifier NOT NULL,SerialNumber nvarchar(200) NULL,ManufacturerSerialNumber nvarchar(200) NULL,WarrantyStartDate datetime2 NULL,WarrantyExpiryDate datetime2 NULL,AssetId uniqueidentifier NULL,CreatedAt datetime2 NOT NULL,UpdatedAt datetime2 NOT NULL,DeletedAt datetime2 NULL,IsDeleted bit NOT NULL,CONSTRAINT FK_GRU_GRI FOREIGN KEY(GoodsReceiptItemId) REFERENCES dbo.GoodsReceiptItems(Id),CONSTRAINT FK_GRU_Asset FOREIGN KEY(AssetId) REFERENCES dbo.Assets(Id));
CREATE UNIQUE INDEX UX_GRU_Serial ON dbo.GoodsReceiptUnits(SerialNumber) WHERE SerialNumber IS NOT NULL;
CREATE UNIQUE INDEX UX_GRU_Asset ON dbo.GoodsReceiptUnits(AssetId) WHERE AssetId IS NOT NULL;

IF COL_LENGTH('dbo.Assets','PurchaseOrderId') IS NULL ALTER TABLE dbo.Assets ADD PurchaseOrderId uniqueidentifier NULL,PurchaseOrderItemId uniqueidentifier NULL,GoodsReceiptId uniqueidentifier NULL,GoodsReceiptItemId uniqueidentifier NULL,GoodsReceiptUnitId uniqueidentifier NULL;
-- SQL Server compiles the whole batch before executing ALTER TABLE, so defer
-- compilation of the index until the new column exists.
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Assets_GoodsReceiptUnitId' AND object_id=OBJECT_ID('dbo.Assets'))
    EXEC('CREATE UNIQUE INDEX UX_Assets_GoodsReceiptUnitId ON dbo.Assets(GoodsReceiptUnitId) WHERE GoodsReceiptUnitId IS NOT NULL');

COMMIT TRANSACTION;
