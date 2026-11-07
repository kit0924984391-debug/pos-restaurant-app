CREATE TABLE `Category` (
	`id` text PRIMARY KEY NOT NULL,
	`storeId` text NOT NULL,
	`name` text NOT NULL,
	`sortOrder` integer DEFAULT 0,
	FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Category_storeId_idx` ON `Category` (`storeId`);--> statement-breakpoint
CREATE TABLE `IdempotencyKey` (
	`key` text PRIMARY KEY NOT NULL,
	`statusCode` integer NOT NULL,
	`responseBody` text NOT NULL,
	`createdAt` integer,
	`expiresAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `IdempotencyKey_expiresAt_idx` ON `IdempotencyKey` (`expiresAt`);--> statement-breakpoint
CREATE TABLE `MenuItem` (
	`id` text PRIMARY KEY NOT NULL,
	`storeId` text NOT NULL,
	`categoryId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`basePrice` real DEFAULT 50 NOT NULL,
	`imageUrl` text,
	`isAvailable` integer DEFAULT true NOT NULL,
	`sortOrder` integer DEFAULT 0,
	FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MenuItem_storeId_idx` ON `MenuItem` (`storeId`);--> statement-breakpoint
CREATE INDEX `MenuItem_categoryId_idx` ON `MenuItem` (`categoryId`);--> statement-breakpoint
CREATE TABLE `OrderItem` (
	`id` text PRIMARY KEY NOT NULL,
	`orderId` text NOT NULL,
	`menuItemId` text,
	`name` text NOT NULL,
	`price` real NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`selectedOptions` text,
	`specialNote` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `OrderItem_orderId_idx` ON `OrderItem` (`orderId`);--> statement-breakpoint
CREATE TABLE `Order` (
	`id` text PRIMARY KEY NOT NULL,
	`storeId` text NOT NULL,
	`tableId` text,
	`tableNo` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`orderType` text DEFAULT 'DINE_IN' NOT NULL,
	`orderChannel` text DEFAULT 'DINE_IN' NOT NULL,
	`deliveryOrderId` text,
	`riderName` text,
	`riderPhone` text,
	`totalAmount` real DEFAULT 0 NOT NULL,
	`discountAmount` real DEFAULT 0 NOT NULL,
	`netAmount` real DEFAULT 0 NOT NULL,
	`gpPercent` real DEFAULT 0,
	`gpAmount` real DEFAULT 0,
	`netRevenue` real DEFAULT 0,
	`paymentMethod` text,
	`paymentStatus` text DEFAULT 'UNPAID' NOT NULL,
	`slipUrl` text,
	`slipRef` text,
	`slipAmount` real,
	`customerName` text,
	`note` text,
	`createdAt` integer,
	`updatedAt` integer,
	`paidAt` integer,
	FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tableId`) REFERENCES `Table`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Order_storeId_idx` ON `Order` (`storeId`);--> statement-breakpoint
CREATE INDEX `Order_tableId_idx` ON `Order` (`tableId`);--> statement-breakpoint
CREATE INDEX `Order_status_idx` ON `Order` (`status`);--> statement-breakpoint
CREATE INDEX `Order_createdAt_idx` ON `Order` (`createdAt`);--> statement-breakpoint
CREATE TABLE `Store` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'TRIAL' NOT NULL,
	`trialEndsAt` integer NOT NULL,
	`subscriptionEnd` integer NOT NULL,
	`planId` text,
	`promptPayId` text DEFAULT '',
	`promptPayName` text DEFAULT '',
	`bankName` text DEFAULT '',
	`bankAccountNo` text DEFAULT '',
	`bankAccountName` text DEFAULT '',
	`phone` text,
	`address` text,
	`receiptFooter` text DEFAULT 'ขอบคุณที่อุดหนุนครับ/ค่ะ โอกาสหน้าเชิญใหม่',
	`tableCount` integer DEFAULT 10,
	`pointsRate` real DEFAULT 25,
	`pointValue` real DEFAULT 1,
	`linemanGp` real DEFAULT 30,
	`grabGp` real DEFAULT 30,
	`shopeeGp` real DEFAULT 30,
	`robinhoodGp` real DEFAULT 20,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Store_slug_unique` ON `Store` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `Store_slug_key` ON `Store` (`slug`);--> statement-breakpoint
CREATE TABLE `Table` (
	`id` text PRIMARY KEY NOT NULL,
	`storeId` text NOT NULL,
	`tableNo` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'AVAILABLE' NOT NULL,
	`currentSessionId` text,
	`updatedAt` integer,
	FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Table_storeId_tableNo_key` ON `Table` (`storeId`,`tableNo`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`passwordHash` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`role` text DEFAULT 'STORE_OWNER' NOT NULL,
	`storeId` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_key` ON `User` (`email`);--> statement-breakpoint
CREATE INDEX `User_storeId_idx` ON `User` (`storeId`);