CREATE SCHEMA IF NOT EXISTS varzuno;
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.schema_migrations(version integer PRIMARY KEY, applied_at text NOT NULL);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.accounts(id uuid PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 2 AND 50), email text NOT NULL UNIQUE CHECK(email=lower(email)), phone text NOT NULL, position text NOT NULL CHECK(position IN ('GOL','ZAG','LAT','VOL','MEI','ATA')), password_hash text NOT NULL, created_at text NOT NULL);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.sessions(token_hash text PRIMARY KEY,account_id uuid NOT NULL REFERENCES varzuno.accounts(id) ON DELETE CASCADE,expires_at bigint NOT NULL);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_account_idx ON varzuno.sessions(account_id);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON varzuno.sessions(expires_at);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.auth_limits(key text PRIMARY KEY,attempts integer NOT NULL,expires_at bigint NOT NULL);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.leagues(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES varzuno.accounts(id) ON DELETE CASCADE,name text NOT NULL CHECK(length(name) BETWEEN 2 AND 60),revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),write_token text NOT NULL DEFAULT '',created_at text NOT NULL,updated_at text NOT NULL);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS leagues_owner_idx ON varzuno.leagues(owner_id);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.athletes(league_id uuid NOT NULL REFERENCES varzuno.leagues(id) ON DELETE CASCADE,id text NOT NULL,name text NOT NULL,position text NOT NULL CHECK(position IN ('GOL','ZAG','LAT','VOL','MEI','ATA')),overall integer NOT NULL CHECK(overall BETWEEN 1 AND 99),active boolean NOT NULL,created_at text NOT NULL,PRIMARY KEY(league_id,id));
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.matches(league_id uuid NOT NULL REFERENCES varzuno.leagues(id) ON DELETE CASCADE,id text NOT NULL,date text NOT NULL,location text NOT NULL,notes text NOT NULL,extra_a integer NOT NULL CHECK(extra_a BETWEEN 0 AND 30),extra_b integer NOT NULL CHECK(extra_b BETWEEN 0 AND 30),created_at text NOT NULL,updated_at text NOT NULL,PRIMARY KEY(league_id,id));
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS matches_date_idx ON varzuno.matches(league_id,date);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.match_teams(league_id uuid NOT NULL,match_id text NOT NULL,slot integer NOT NULL CHECK(slot IN (0,1)),id text NOT NULL,name text NOT NULL,color text NOT NULL,PRIMARY KEY(league_id,match_id,slot),UNIQUE(league_id,match_id,id),FOREIGN KEY(league_id,match_id) REFERENCES varzuno.matches(league_id,id) ON DELETE CASCADE);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.performances(league_id uuid NOT NULL,match_id text NOT NULL,team_slot integer NOT NULL,player_id text NOT NULL,ordinal integer NOT NULL,snapshot_name text NOT NULL,snapshot_position text NOT NULL,snapshot_overall integer NOT NULL,played boolean NOT NULL,goals integer NOT NULL CHECK(goals BETWEEN 0 AND 30),assists integer NOT NULL CHECK(assists BETWEEN 0 AND 30),rating double precision CHECK(rating IS NULL OR rating BETWEEN 0 AND 10),PRIMARY KEY(league_id,match_id,player_id),FOREIGN KEY(league_id,match_id,team_slot) REFERENCES varzuno.match_teams(league_id,match_id,slot) ON DELETE CASCADE,FOREIGN KEY(league_id,player_id) REFERENCES varzuno.athletes(league_id,id) ON DELETE CASCADE,CHECK(played OR(goals=0 AND assists=0 AND rating IS NULL)));
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS performances_player_idx ON varzuno.performances(league_id,player_id);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.draws(league_id uuid PRIMARY KEY REFERENCES varzuno.leagues(id) ON DELETE CASCADE,id text NOT NULL,created_at text NOT NULL);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.draw_teams(league_id uuid NOT NULL REFERENCES varzuno.draws(league_id) ON DELETE CASCADE,slot integer NOT NULL CHECK(slot BETWEEN 0 AND 3),id text NOT NULL,name text NOT NULL,color text NOT NULL,PRIMARY KEY(league_id,slot),UNIQUE(league_id,id));
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS varzuno.draw_players(league_id uuid NOT NULL,team_slot integer NOT NULL,player_id text NOT NULL,ordinal integer NOT NULL,PRIMARY KEY(league_id,player_id),FOREIGN KEY(league_id,team_slot) REFERENCES varzuno.draw_teams(league_id,slot) ON DELETE CASCADE,FOREIGN KEY(league_id,player_id) REFERENCES varzuno.athletes(league_id,id) ON DELETE CASCADE);
