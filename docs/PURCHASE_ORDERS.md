# Purchase Orders

The Purchase Order module provides draft creation, approval, locking, receiving, receipt-unit asset creation, attachments, audit history, and server-side PDF output. Create and edit use a single responsive page with collapsible sections.

## Configuration

Migration `007_purchase_orders.sql` creates a SQL Server sequence starting at `1150000000`. Before production rollout, confirm this range does not overlap legacy Oracle PO numbers. Change the start through a controlled deployment migration, never by editing an already-applied migration.

Attachments are stored below `backend/App_Data/purchase-orders`. Production deployments must mount durable private storage for this directory and restrict direct web access. Allowed types are PDF, JPEG, and PNG, up to 10 MB.

Oracle synchronization is intentionally disabled. `IOraclePurchaseOrderGateway` is the integration boundary. Implementation requires the approved Oracle API/schema, identifier mapping, authentication method, number ownership/range, retry rules, and reconciliation contract.

## Manual flow

1. Grant the required `purchase_orders.*` permissions to test IT administrators.
2. Create a PO, select an existing vendor/location, add multiple lines, and save the draft.
3. Submit as the creator, then approve as a different authorized user.
4. Receive part of the order, then the remainder. Serialized receipt lines require one serial record per unit through the API.
5. Call `POST /api/goods-receipts/{receiptId}/create-assets`; repeat it to confirm no duplicate assets are created.
6. Download the authorized PDF, then close the fully received PO.
7. Verify denied actions as VIEWER and a minimally permissioned IT_ADMIN.

## API notes

All persisted totals are recalculated by the server using `decimal`. The API rejects invalid state transitions, edits after approval/receipt, over-receiving, self-approval, duplicate serials, stale row versions, and duplicate receipt/asset creation through validation and database constraints.
