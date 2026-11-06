import {sqliteTable,text,integer,real,primaryKey,foreignKey,index,uniqueIndex,check} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';

// Existing migration and legacy data remain immutable and recoverable.
export const peladas=sqliteTable('peladas',{ownerId:text('owner_id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(0)});
export const accounts=sqliteTable('accounts',{
 id:text('id').primaryKey(),kind:text('kind').notNull(),providerSubject:text('provider_subject'),displayName:text('display_name').notNull(),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('accounts_provider_subject_unique').on(t.providerSubject),check('accounts_kind_valid',sql`${t.kind} in ('chatgpt','guest')`)]);
export const guestSessions=sqliteTable('guest_sessions',{
 tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),createdAt:text('created_at').notNull(),expiresAt:text('expires_at').notNull(),
},t=>[index('guest_sessions_account_idx').on(t.accountId),index('guest_sessions_expires_idx').on(t.expiresAt)]);
export const authLimits=sqliteTable('auth_limits',{key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:text('expires_at').notNull()});
export const leagues=sqliteTable('leagues',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),name:text('name').notNull(),revision:integer('revision').notNull().default(0),writeToken:text('write_token').notNull().default(''),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),legacySubject:text('legacy_subject'),
},t=>[index('leagues_owner_idx').on(t.ownerId),uniqueIndex('leagues_legacy_subject_unique').on(t.legacySubject),check('leagues_revision_valid',sql`${t.revision} >= 0`),check('leagues_name_valid',sql`length(${t.name}) between 2 and 60`)]);
export const athletes=sqliteTable('athletes',{
 leagueId:text('league_id').notNull().references(()=>leagues.id,{onDelete:'cascade'}),id:text('id').notNull(),name:text('name').notNull(),position:text('position').notNull(),overall:integer('overall').notNull(),active:integer('active').notNull(),createdAt:text('created_at').notNull(),
},t=>[primaryKey({columns:[t.leagueId,t.id]}),check('athletes_overall_valid',sql`${t.overall} between 1 and 99`),check('athletes_active_valid',sql`${t.active} in (0,1)`),check('athletes_position_valid',sql`${t.position} in ('GOL','ZAG','LAT','VOL','MEI','ATA')`)]);
export const matches=sqliteTable('matches',{
 leagueId:text('league_id').notNull().references(()=>leagues.id,{onDelete:'cascade'}),id:text('id').notNull(),date:text('date').notNull(),location:text('location').notNull(),notes:text('notes').notNull(),extraA:integer('extra_a').notNull(),extraB:integer('extra_b').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.leagueId,t.id]}),index('matches_league_date_idx').on(t.leagueId,t.date),check('matches_extra_valid',sql`${t.extraA} between 0 and 30 and ${t.extraB} between 0 and 30`)]);
export const matchTeams=sqliteTable('match_teams',{
 leagueId:text('league_id').notNull(),matchId:text('match_id').notNull(),slot:integer('slot').notNull(),id:text('id').notNull(),name:text('name').notNull(),color:text('color').notNull(),
},t=>[primaryKey({columns:[t.leagueId,t.matchId,t.slot]}),foreignKey({columns:[t.leagueId,t.matchId],foreignColumns:[matches.leagueId,matches.id]}).onDelete('cascade'),uniqueIndex('match_teams_identity_unique').on(t.leagueId,t.matchId,t.id),check('match_teams_slot_valid',sql`${t.slot} in (0,1)`)]);
export const performances=sqliteTable('performances',{
 leagueId:text('league_id').notNull(),matchId:text('match_id').notNull(),teamSlot:integer('team_slot').notNull(),playerId:text('player_id').notNull(),ordinal:integer('ordinal').notNull(),name:text('snapshot_name').notNull(),position:text('snapshot_position').notNull(),overall:integer('snapshot_overall').notNull(),played:integer('played').notNull(),goals:integer('goals').notNull(),assists:integer('assists').notNull(),rating:real('rating'),
},t=>[primaryKey({columns:[t.leagueId,t.matchId,t.playerId]}),foreignKey({columns:[t.leagueId,t.matchId,t.teamSlot],foreignColumns:[matchTeams.leagueId,matchTeams.matchId,matchTeams.slot]}).onDelete('cascade'),foreignKey({columns:[t.leagueId,t.playerId],foreignColumns:[athletes.leagueId,athletes.id]}).onDelete('cascade'),index('performances_player_idx').on(t.leagueId,t.playerId),check('performances_numbers_valid',sql`${t.goals} between 0 and 30 and ${t.assists} between 0 and 30 and (${t.rating} is null or ${t.rating} between 0 and 10)`),check('performances_played_valid',sql`${t.played} in (0,1) and (${t.played}=1 or (${t.goals}=0 and ${t.assists}=0 and ${t.rating} is null))`)]);
export const draws=sqliteTable('draws',{
 leagueId:text('league_id').primaryKey().references(()=>leagues.id,{onDelete:'cascade'}),id:text('id').notNull(),createdAt:text('created_at').notNull(),
});
export const drawTeams=sqliteTable('draw_teams',{
 leagueId:text('league_id').notNull().references(()=>draws.leagueId,{onDelete:'cascade'}),slot:integer('slot').notNull(),id:text('id').notNull(),name:text('name').notNull(),color:text('color').notNull(),
},t=>[primaryKey({columns:[t.leagueId,t.slot]}),uniqueIndex('draw_teams_identity_unique').on(t.leagueId,t.id),check('draw_teams_slot_valid',sql`${t.slot} between 0 and 3`)]);
export const drawPlayers=sqliteTable('draw_players',{
 leagueId:text('league_id').notNull(),teamSlot:integer('team_slot').notNull(),playerId:text('player_id').notNull(),ordinal:integer('ordinal').notNull(),
},t=>[primaryKey({columns:[t.leagueId,t.playerId]}),foreignKey({columns:[t.leagueId,t.teamSlot],foreignColumns:[drawTeams.leagueId,drawTeams.slot]}).onDelete('cascade'),foreignKey({columns:[t.leagueId,t.playerId],foreignColumns:[athletes.leagueId,athletes.id]}).onDelete('cascade')]);
