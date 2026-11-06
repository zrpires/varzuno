CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`provider_subject` text,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "accounts_kind_valid" CHECK("accounts"."kind" in ('chatgpt','guest'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_subject_unique` ON `accounts` (`provider_subject`);--> statement-breakpoint
CREATE TABLE `athletes` (
	`league_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`position` text NOT NULL,
	`overall` integer NOT NULL,
	`active` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`league_id`, `id`),
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "athletes_overall_valid" CHECK("athletes"."overall" between 1 and 99),
	CONSTRAINT "athletes_active_valid" CHECK("athletes"."active" in (0,1)),
	CONSTRAINT "athletes_position_valid" CHECK("athletes"."position" in ('GOL','ZAG','LAT','VOL','MEI','ATA'))
);
--> statement-breakpoint
CREATE TABLE `auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `draw_players` (
	`league_id` text NOT NULL,
	`team_slot` integer NOT NULL,
	`player_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	PRIMARY KEY(`league_id`, `player_id`),
	FOREIGN KEY (`league_id`,`team_slot`) REFERENCES `draw_teams`(`league_id`,`slot`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`league_id`,`player_id`) REFERENCES `athletes`(`league_id`,`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `draw_teams` (
	`league_id` text NOT NULL,
	`slot` integer NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	PRIMARY KEY(`league_id`, `slot`),
	FOREIGN KEY (`league_id`) REFERENCES `draws`(`league_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "draw_teams_slot_valid" CHECK("draw_teams"."slot" between 0 and 3)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `draw_teams_identity_unique` ON `draw_teams` (`league_id`,`id`);--> statement-breakpoint
CREATE TABLE `draws` (
	`league_id` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guest_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `guest_sessions_account_idx` ON `guest_sessions` (`account_id`);--> statement-breakpoint
CREATE INDEX `guest_sessions_expires_idx` ON `guest_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `leagues` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`write_token` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`legacy_subject` text,
	FOREIGN KEY (`owner_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "leagues_revision_valid" CHECK("leagues"."revision" >= 0),
	CONSTRAINT "leagues_name_valid" CHECK(length("leagues"."name") between 2 and 60)
);
--> statement-breakpoint
CREATE INDEX `leagues_owner_idx` ON `leagues` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `leagues_legacy_subject_unique` ON `leagues` (`legacy_subject`);--> statement-breakpoint
CREATE TABLE `match_teams` (
	`league_id` text NOT NULL,
	`match_id` text NOT NULL,
	`slot` integer NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	PRIMARY KEY(`league_id`, `match_id`, `slot`),
	FOREIGN KEY (`league_id`,`match_id`) REFERENCES `matches`(`league_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "match_teams_slot_valid" CHECK("match_teams"."slot" in (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `match_teams_identity_unique` ON `match_teams` (`league_id`,`match_id`,`id`);--> statement-breakpoint
CREATE TABLE `matches` (
	`league_id` text NOT NULL,
	`id` text NOT NULL,
	`date` text NOT NULL,
	`location` text NOT NULL,
	`notes` text NOT NULL,
	`extra_a` integer NOT NULL,
	`extra_b` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`league_id`, `id`),
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "matches_extra_valid" CHECK("matches"."extra_a" between 0 and 30 and "matches"."extra_b" between 0 and 30)
);
--> statement-breakpoint
CREATE INDEX `matches_league_date_idx` ON `matches` (`league_id`,`date`);--> statement-breakpoint
CREATE TABLE `performances` (
	`league_id` text NOT NULL,
	`match_id` text NOT NULL,
	`team_slot` integer NOT NULL,
	`player_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`snapshot_name` text NOT NULL,
	`snapshot_position` text NOT NULL,
	`snapshot_overall` integer NOT NULL,
	`played` integer NOT NULL,
	`goals` integer NOT NULL,
	`assists` integer NOT NULL,
	`rating` real,
	PRIMARY KEY(`league_id`, `match_id`, `player_id`),
	FOREIGN KEY (`league_id`,`match_id`,`team_slot`) REFERENCES `match_teams`(`league_id`,`match_id`,`slot`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`league_id`,`player_id`) REFERENCES `athletes`(`league_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "performances_numbers_valid" CHECK("performances"."goals" between 0 and 30 and "performances"."assists" between 0 and 30 and ("performances"."rating" is null or "performances"."rating" between 0 and 10)),
	CONSTRAINT "performances_played_valid" CHECK("performances"."played" in (0,1) and ("performances"."played"=1 or ("performances"."goals"=0 and "performances"."assists"=0 and "performances"."rating" is null)))
);
--> statement-breakpoint
CREATE INDEX `performances_player_idx` ON `performances` (`league_id`,`player_id`);