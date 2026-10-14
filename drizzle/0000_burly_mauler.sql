CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room` text NOT NULL,
	`sender` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter` text NOT NULL,
	`target` text NOT NULL,
	`reason` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`mode` text DEFAULT 'text' NOT NULL,
	`city` text DEFAULT 'Anywhere in Nigeria' NOT NULL,
	`interest` text DEFAULT 'Anything' NOT NULL,
	`peer` text,
	`room` text,
	`seen` integer NOT NULL,
	`last_sent` integer DEFAULT 0 NOT NULL
);
