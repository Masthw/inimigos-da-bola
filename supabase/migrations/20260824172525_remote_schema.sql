


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."match_status_enum" AS ENUM (
    'open',
    'in_progress',
    'finished',
    'cancelled',
    'voting'
);


ALTER TYPE "public"."match_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."player_status_enum" AS ENUM (
    'confirmed',
    'waitlist',
    'cancelled'
);


ALTER TYPE "public"."player_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."user_role_enum" AS ENUM (
    'admin',
    'member'
);


ALTER TYPE "public"."user_role_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_expired_votings"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  match_record RECORD;
BEGIN
  FOR match_record IN 
    SELECT id FROM matches WHERE status = 'voting' AND voting_ends_at <= now()
  LOOP
    -- Substitua 'SUA_PROJECT_REF' pelo ID do seu projeto Supabase (o que fica na URL)
    PERFORM net.http_post(
      url := 'https://muulctiwnhasitajaamk.supabase.co/functions/v1/tally-match-votes',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dWxjdGl3bmhhc2l0YWphYW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjI1MTEsImV4cCI6MjEwMDczODUxMX0.oV1YQiUgp3mVCpKMaZig7aX1SoDdD4SFUR7n8LLv1Ng'),
      body := jsonb_build_object('matchId', match_record.id)
    );
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."close_expired_votings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, name, email, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Se tentar alterar a role...
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Se a ação vier de um usuário logado no app (auth.uid() não é nulo) E ele não for admin, bloqueia!
    -- Se vier do Table Editor (auth.uid() é nulo), ele ignora esse IF e permite a alteração.
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      NEW.role = OLD.role; 
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lineup_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lineup_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."awards" (
    "id" bigint NOT NULL,
    "sport_id" bigint,
    "game_type_id" bigint,
    "name" "text" NOT NULL,
    "description" "text",
    "is_voting_based" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."awards" OWNER TO "postgres";


ALTER TABLE "public"."awards" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."awards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."game_types" (
    "id" bigint NOT NULL,
    "sport_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "default_max_players" integer NOT NULL,
    "default_max_waitlist" integer NOT NULL
);


ALTER TABLE "public"."game_types" OWNER TO "postgres";


ALTER TABLE "public"."game_types" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."game_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "skill_level" integer,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_seasons" (
    "id" bigint NOT NULL,
    "group_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."group_seasons" OWNER TO "postgres";


ALTER TABLE "public"."group_seasons" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."group_seasons_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lineup_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lineup_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "team" "text" NOT NULL,
    "position" "text" NOT NULL,
    "x" numeric(5,2) NOT NULL,
    "y" numeric(5,2) NOT NULL,
    "is_sub" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lineup_players_team_check" CHECK (("team" = ANY (ARRAY['A'::"text", 'B'::"text"]))),
    CONSTRAINT "lineup_players_x_check" CHECK ((("x" >= (0)::numeric) AND ("x" <= (100)::numeric))),
    CONSTRAINT "lineup_players_y_check" CHECK ((("y" >= (0)::numeric) AND ("y" <= (100)::numeric)))
);


ALTER TABLE "public"."lineup_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lineups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lineups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_awards" (
    "id" bigint NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "award_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."match_awards" OWNER TO "postgres";


ALTER TABLE "public"."match_awards" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."match_awards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."match_players" (
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "team" "text" NOT NULL,
    "goals_scored" integer DEFAULT 0,
    "status" "public"."player_status_enum" DEFAULT 'confirmed'::"public"."player_status_enum" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_name" "text",
    "assists" integer DEFAULT 0,
    "tactical_position" "text",
    "own_goals_scored" integer DEFAULT 0
);


ALTER TABLE "public"."match_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_votes" (
    "id" bigint NOT NULL,
    "match_id" "uuid" NOT NULL,
    "voter_user_id" "uuid" NOT NULL,
    "voted_user_id" "uuid" NOT NULL,
    "award_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_no_self_voting" CHECK (("voter_user_id" <> "voted_user_id"))
);


ALTER TABLE "public"."match_votes" OWNER TO "postgres";


ALTER TABLE "public"."match_votes" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."match_votes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "group_id" "uuid",
    "game_type_id" bigint NOT NULL,
    "date_time" timestamp with time zone NOT NULL,
    "location" "text" NOT NULL,
    "max_players" integer NOT NULL,
    "max_waitlist" integer NOT NULL,
    "status" "public"."match_status_enum" DEFAULT 'open'::"public"."match_status_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "team_a_score" integer,
    "team_b_score" integer,
    "team_a_name" "text" DEFAULT 'Time A'::"text",
    "team_b_name" "text" DEFAULT 'Time B'::"text",
    "team_a_color" "text",
    "team_b_color" "text",
    "voting_ends_at" timestamp with time zone,
    "voting_closed_by" "uuid"
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" bigint NOT NULL,
    "game_type_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL
);


ALTER TABLE "public"."positions" OWNER TO "postgres";


ALTER TABLE "public"."positions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."positions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."season_awards" (
    "id" bigint NOT NULL,
    "season_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "award_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."season_awards" OWNER TO "postgres";


ALTER TABLE "public"."season_awards" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."season_awards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."season_leaderboards" (
    "id" bigint NOT NULL,
    "season_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points" integer DEFAULT 0,
    "matches_played" integer DEFAULT 0,
    "wins" integer DEFAULT 0,
    "draws" integer DEFAULT 0,
    "losses" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."season_leaderboards" OWNER TO "postgres";


ALTER TABLE "public"."season_leaderboards" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."season_leaderboards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sports" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."sports" OWNER TO "postgres";


ALTER TABLE "public"."sports" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."sports_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_favorite_positions" (
    "user_id" "uuid" NOT NULL,
    "position_id" bigint NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."user_favorite_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "role" "public"."user_role_enum" DEFAULT 'member'::"public"."user_role_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."awards"
    ADD CONSTRAINT "awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_types"
    ADD CONSTRAINT "game_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_id", "user_id");



ALTER TABLE ONLY "public"."group_seasons"
    ADD CONSTRAINT "group_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lineup_players"
    ADD CONSTRAINT "lineup_players_lineup_id_user_id_key" UNIQUE ("lineup_id", "user_id");



ALTER TABLE ONLY "public"."lineup_players"
    ADD CONSTRAINT "lineup_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lineups"
    ADD CONSTRAINT "lineups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_awards"
    ADD CONSTRAINT "match_awards_match_user_award_unique" UNIQUE ("match_id", "user_id", "award_id");



ALTER TABLE ONLY "public"."match_awards"
    ADD CONSTRAINT "match_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "match_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_votes"
    ADD CONSTRAINT "match_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_leaderboards"
    ADD CONSTRAINT "season_leaderboards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_leaderboards"
    ADD CONSTRAINT "season_leaderboards_season_user_unique" UNIQUE ("season_id", "user_id");



ALTER TABLE ONLY "public"."season_leaderboards"
    ADD CONSTRAINT "season_leaderboards_unique_user_season" UNIQUE ("season_id", "user_id");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "unique_match_user" UNIQUE ("match_id", "user_id");



ALTER TABLE ONLY "public"."user_favorite_positions"
    ADD CONSTRAINT "user_favorite_positions_pkey" PRIMARY KEY ("user_id", "position_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_awards_game_type_id" ON "public"."awards" USING "btree" ("game_type_id");



CREATE INDEX "idx_awards_sport_id" ON "public"."awards" USING "btree" ("sport_id");



CREATE INDEX "idx_game_types_sport_id" ON "public"."game_types" USING "btree" ("sport_id");



CREATE INDEX "idx_group_members_group_id" ON "public"."group_members" USING "btree" ("group_id");



CREATE INDEX "idx_group_members_user_id" ON "public"."group_members" USING "btree" ("user_id");



CREATE INDEX "idx_group_seasons_group_id" ON "public"."group_seasons" USING "btree" ("group_id");



CREATE INDEX "idx_match_awards_award_id" ON "public"."match_awards" USING "btree" ("award_id");



CREATE INDEX "idx_match_awards_match_id" ON "public"."match_awards" USING "btree" ("match_id");



CREATE INDEX "idx_match_awards_user_id" ON "public"."match_awards" USING "btree" ("user_id");



CREATE INDEX "idx_match_players_match_id" ON "public"."match_players" USING "btree" ("match_id");



CREATE INDEX "idx_match_players_user_id" ON "public"."match_players" USING "btree" ("user_id");



CREATE INDEX "idx_match_votes_award_id" ON "public"."match_votes" USING "btree" ("award_id");



CREATE INDEX "idx_match_votes_match_id" ON "public"."match_votes" USING "btree" ("match_id");



CREATE INDEX "idx_match_votes_voted_user_id" ON "public"."match_votes" USING "btree" ("voted_user_id");



CREATE INDEX "idx_match_votes_voter_user_id" ON "public"."match_votes" USING "btree" ("voter_user_id");



CREATE INDEX "idx_matches_game_type_id" ON "public"."matches" USING "btree" ("game_type_id");



CREATE INDEX "idx_matches_group_id" ON "public"."matches" USING "btree" ("group_id");



CREATE INDEX "idx_matches_organizer_id" ON "public"."matches" USING "btree" ("organizer_id");



CREATE INDEX "idx_matches_voting_status" ON "public"."matches" USING "btree" ("status") WHERE ("status" = 'voting'::"public"."match_status_enum");



CREATE INDEX "idx_positions_game_type_id" ON "public"."positions" USING "btree" ("game_type_id");



CREATE INDEX "idx_season_awards_award_id" ON "public"."season_awards" USING "btree" ("award_id");



CREATE INDEX "idx_season_awards_season_id" ON "public"."season_awards" USING "btree" ("season_id");



CREATE INDEX "idx_season_awards_user_id" ON "public"."season_awards" USING "btree" ("user_id");



CREATE INDEX "idx_ufp_position_id" ON "public"."user_favorite_positions" USING "btree" ("position_id");



CREATE INDEX "idx_ufp_user_id" ON "public"."user_favorite_positions" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "lineup_updated_at" BEFORE UPDATE ON "public"."lineups" FOR EACH ROW EXECUTE FUNCTION "public"."update_lineup_updated_at"();



CREATE OR REPLACE TRIGGER "prevent_role_escalation" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."protect_user_role"();



ALTER TABLE ONLY "public"."awards"
    ADD CONSTRAINT "awards_game_type_id_fkey" FOREIGN KEY ("game_type_id") REFERENCES "public"."game_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."awards"
    ADD CONSTRAINT "awards_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_types"
    ADD CONSTRAINT "game_types_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_seasons"
    ADD CONSTRAINT "group_seasons_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lineup_players"
    ADD CONSTRAINT "lineup_players_lineup_id_fkey" FOREIGN KEY ("lineup_id") REFERENCES "public"."lineups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lineup_players"
    ADD CONSTRAINT "lineup_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lineups"
    ADD CONSTRAINT "lineups_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_awards"
    ADD CONSTRAINT "match_awards_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "public"."awards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_awards"
    ADD CONSTRAINT "match_awards_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_awards"
    ADD CONSTRAINT "match_awards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "match_players_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "match_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_votes"
    ADD CONSTRAINT "match_votes_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "public"."awards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_votes"
    ADD CONSTRAINT "match_votes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_votes"
    ADD CONSTRAINT "match_votes_voted_user_id_fkey" FOREIGN KEY ("voted_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."match_votes"
    ADD CONSTRAINT "match_votes_voter_user_id_fkey" FOREIGN KEY ("voter_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_game_type_id_fkey" FOREIGN KEY ("game_type_id") REFERENCES "public"."game_types"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_voting_closed_by_fkey" FOREIGN KEY ("voting_closed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_game_type_id_fkey" FOREIGN KEY ("game_type_id") REFERENCES "public"."game_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "public"."awards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."group_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_leaderboards"
    ADD CONSTRAINT "season_leaderboards_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."group_seasons"("id");



ALTER TABLE ONLY "public"."season_leaderboards"
    ADD CONSTRAINT "season_leaderboards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_favorite_positions"
    ADD CONSTRAINT "user_favorite_positions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorite_positions"
    ADD CONSTRAINT "user_favorite_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins alteram grupos" ON "public"."groups" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins atualizam esportes" ON "public"."sports" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins atualizam membros" ON "public"."group_members" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins atualizam posições" ON "public"."positions" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins atualizam prêmios" ON "public"."awards" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins atualizam prêmios de partida" ON "public"."match_awards" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins atualizam prêmios de temporada" ON "public"."season_awards" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins atualizam temporadas" ON "public"."group_seasons" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins atualizam tipos de jogo" ON "public"."game_types" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins criam esportes" ON "public"."sports" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins criam grupos" ON "public"."groups" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins criam posições" ON "public"."positions" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins criam prêmios" ON "public"."awards" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins criam tipos de jogo" ON "public"."game_types" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins deletam esportes" ON "public"."sports" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins deletam grupos" ON "public"."groups" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins deletam membros" ON "public"."group_members" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins deletam posições" ON "public"."positions" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins deletam prêmios" ON "public"."awards" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins deletam prêmios de partida" ON "public"."match_awards" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins deletam prêmios de temporada" ON "public"."season_awards" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins deletam temporadas" ON "public"."group_seasons" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins deletam tipos de jogo" ON "public"."game_types" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins inserem membros" ON "public"."group_members" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins inserem prêmios de partida" ON "public"."match_awards" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins inserem prêmios de temporada" ON "public"."season_awards" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins inserem temporadas" ON "public"."group_seasons" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Apenas admins atualizam partidas" ON "public"."matches" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Apenas admins criam partidas" ON "public"."matches" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Apenas admins deletam partidas" ON "public"."matches" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Atualização de estatísticas" ON "public"."match_players" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Grupos visíveis para todos" ON "public"."groups" FOR SELECT USING (true);



CREATE POLICY "Inscrição na partida" ON "public"."match_players" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Leaderboard viewable by everyone" ON "public"."season_leaderboards" FOR SELECT USING (true);



CREATE POLICY "Leitura pública para esportes" ON "public"."sports" FOR SELECT USING (true);



CREATE POLICY "Leitura pública para posições" ON "public"."positions" FOR SELECT USING (true);



CREATE POLICY "Leitura pública para prêmios" ON "public"."awards" FOR SELECT USING (true);



CREATE POLICY "Leitura pública para tipos de jogo" ON "public"."game_types" FOR SELECT USING (true);



CREATE POLICY "Lista de presença visível para todos" ON "public"."match_players" FOR SELECT USING (true);



CREATE POLICY "Membros visíveis para todos" ON "public"."group_members" FOR SELECT USING (true);



CREATE POLICY "Partidas visíveis para todos" ON "public"."matches" FOR SELECT USING (true);



CREATE POLICY "Perfis visíveis para todos" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Posições visíveis para todos" ON "public"."user_favorite_positions" FOR SELECT USING (true);



CREATE POLICY "Prêmios de partida visíveis para todos" ON "public"."match_awards" FOR SELECT USING (true);



CREATE POLICY "Prêmios de temporada visíveis para todos" ON "public"."season_awards" FOR SELECT USING (true);



CREATE POLICY "Saída da partida" ON "public"."match_players" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Temporadas visíveis para todos" ON "public"."group_seasons" FOR SELECT USING (true);



CREATE POLICY "Usuário atualiza o próprio perfil" ON "public"."users" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Usuário atualiza próprias posições" ON "public"."user_favorite_positions" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Usuário deleta próprias posições" ON "public"."user_favorite_positions" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Usuário insere próprias posições" ON "public"."user_favorite_positions" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Usuário vota apenas como si mesmo" ON "public"."match_votes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "voter_user_id"));



CREATE POLICY "Votos visíveis para todos" ON "public"."match_votes" FOR SELECT USING (true);



ALTER TABLE "public"."awards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lineup_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lineups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_awards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."season_awards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."season_leaderboards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_favorite_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."lineup_players";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."lineups";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_players";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_votes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."matches";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."close_expired_votings"() TO "anon";
GRANT ALL ON FUNCTION "public"."close_expired_votings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_expired_votings"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lineup_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lineup_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lineup_updated_at"() TO "service_role";
























GRANT ALL ON TABLE "public"."awards" TO "anon";
GRANT ALL ON TABLE "public"."awards" TO "authenticated";
GRANT ALL ON TABLE "public"."awards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."awards_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."awards_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."awards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."game_types" TO "anon";
GRANT ALL ON TABLE "public"."game_types" TO "authenticated";
GRANT ALL ON TABLE "public"."game_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."game_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."game_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."game_types_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."group_seasons" TO "anon";
GRANT ALL ON TABLE "public"."group_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."group_seasons" TO "service_role";



GRANT ALL ON SEQUENCE "public"."group_seasons_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."group_seasons_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."group_seasons_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."lineup_players" TO "anon";
GRANT ALL ON TABLE "public"."lineup_players" TO "authenticated";
GRANT ALL ON TABLE "public"."lineup_players" TO "service_role";



GRANT ALL ON TABLE "public"."lineups" TO "anon";
GRANT ALL ON TABLE "public"."lineups" TO "authenticated";
GRANT ALL ON TABLE "public"."lineups" TO "service_role";



GRANT ALL ON TABLE "public"."match_awards" TO "anon";
GRANT ALL ON TABLE "public"."match_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."match_awards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."match_awards_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."match_awards_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."match_awards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."match_players" TO "anon";
GRANT ALL ON TABLE "public"."match_players" TO "authenticated";
GRANT ALL ON TABLE "public"."match_players" TO "service_role";



GRANT ALL ON TABLE "public"."match_votes" TO "anon";
GRANT ALL ON TABLE "public"."match_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."match_votes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."match_votes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."match_votes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."match_votes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."positions" TO "anon";
GRANT ALL ON TABLE "public"."positions" TO "authenticated";
GRANT ALL ON TABLE "public"."positions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."positions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."positions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."positions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."season_awards" TO "anon";
GRANT ALL ON TABLE "public"."season_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."season_awards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."season_awards_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."season_awards_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."season_awards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."season_leaderboards" TO "anon";
GRANT ALL ON TABLE "public"."season_leaderboards" TO "authenticated";
GRANT ALL ON TABLE "public"."season_leaderboards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."season_leaderboards_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."season_leaderboards_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."season_leaderboards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports" TO "anon";
GRANT ALL ON TABLE "public"."sports" TO "authenticated";
GRANT ALL ON TABLE "public"."sports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorite_positions" TO "anon";
GRANT ALL ON TABLE "public"."user_favorite_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_favorite_positions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


