CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`pc` integer NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created` integer NOT NULL
);
