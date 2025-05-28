
import type { Request } from "express";

import type { Device, Entry, Level, MigrationRequest, Player, Status } from "../../dbschema/interfaces";
import app from "../app";
import db from "../db";
import { isNullOrUndefined, requireMod } from "../util";

app.get("/mod", requireMod, (req, res) => {
    res.renderPage("/mod/mod");
});

app.get("/mod/levels", requireMod, async (req, res) => {
    const data = await db.cachedQuerySingle<{ players: Player[], levels: Level[] }>(`
        select {
            players := (select Player {
                id,
                name
            } order by .name),
            levels := (select Level {
                id,
                name,
                placement,
                video_id,
                level_id,
                creator,
                verifier: { name }
            } order by .placement)
        }
    `, null, { serveStaleContent: true });

    if (isNullOrUndefined(data)) return res.redirect("/mod");

    res.renderPage("/mod/levels", data!);
});

export interface LevelData {
    creator: string,
    id: string,
    levelid: number,
    name: string,
    placement: number,
    verifiername: string,
    videoid: string
}

app.post("/mod/addlevel", requireMod, async (req: Request<unknown, unknown, LevelData>, res) => {
    req.body.levelid = Number(req.body.levelid);
    req.body.placement = Number(req.body.placement);

    await db.execute(`
        update Level filter .placement >= <int32>$placement set {
            placement := .placement + 1
        };

        insert Level {
            creator := <str>$creator,
            level_id := <int32>$level_id,
            name := <str>$level_name,
            placement := <int32>$placement,
            verifier := (
                insert Player {
                    name := <str>$verifier
                } unless conflict on .name else (select Player)
            ),
            video_id := <str>$video_id
        }
    `, {
        verifier: req.body.verifiername,
        creator: req.body.creator,
        level_id: req.body.levelid,
        level_name: req.body.name,
        placement: req.body.placement,
        video_id: req.body.videoid
    });

    res.redirect("/mod/levels");
});
app.post("/mod/editlevel", requireMod, async (req: Request<unknown, unknown, LevelData>, res) => {
    req.body.levelid = Number(req.body.levelid);
    req.body.placement = Number(req.body.placement);

    await db.execute(`
        with
            level := (select (<Level><uuid>$id) { placement }),
            old_placement := level.placement
        select (
            with
                new_level := (select (update level set {
                    creator := <str>$creator,
                    level_id := <int32>$level_id,
                    name := <str>$level_name,
                    verifier := (
                        insert Player {
                            name := <str>$verifier
                        } unless conflict on .name else (select Player)
                    ),
                    video_id := <str>$video_id,
                    placement := <int32>$placement
                }) { placement }),
                new_placement := new_level.placement
            select (
                (update Level filter .id != level.id 
                                 and .placement > level.placement
                                 and .placement <= new_level.placement set {
                    placement := .placement - 1
                }) if old_placement < new_placement else
                ((update Level filter .id != level.id 
                                 and .placement < level.placement
                                 and .placement >= new_level.placement set {
                    placement := .placement + 1
                }) if old_placement > new_placement else {})
            )
        )
    `, {
        id: req.body.id,
        verifier: req.body.verifiername,
        creator: req.body.creator,
        level_id: req.body.levelid,
        level_name: req.body.name,
        video_id: req.body.videoid,
        placement: req.body.placement
    });

    res.redirect("/mod/levels");
});

app.get("/mod/records", requireMod, async (req, res) => {
    const records = await db.query<Entry>(`
        select Entry {
            id,
            video_id,
            raw_video,
            time_format := (select to_str(.time, "FMHH24:MI:SS")),
            time_ms := (select to_str(.time, "MS")),
            status,
            mobile,
            player: {
                name,
                account := (select .<player[is Account] {
                    image,
                    profile_shape,
                    discord: { global_name, user_id, username, avatar }
                } limit 1)
            },
            level: { name, placement, video_id, level_id },
            notes
        } filter .status != Status.Approved and .status != Status.Denied order by .created_at asc
    `);

    const pageLimit = 10;
    const maxPage = Math.ceil(records.length / pageLimit);
    const page = Math.max(1, Math.min(req.page, maxPage));

    res.renderPage("/mod/records", {
        page,
        records: records.slice((page - 1) * pageLimit, page * pageLimit),
        elapsed: Math.round((Date.now() - req.timestamp) / 10) / 100,
        stats: {
            page,
            prev_page: Math.max(1, page - 1),
            next_page: Math.min(maxPage, page + 1),
            last_page: maxPage,
            total: records.length
        }
    });
});

export interface EntryEdit {
    entryid: string,
    time: string,
    device: Device,
    status: Status,
    reason: string
}

app.post("/mod/records", requireMod, async (req: Request<unknown, unknown, EntryEdit>, res) => {
    req.body.device = req.body.device.toCapital() as Device;
    req.body.status = req.body.status.toCapital() as Status;
    await db.execute(`
        update Entry filter .id = <uuid><str>$entry_id set {
            time := <duration><str>$time,
            status := <Status><str>$status,
            mobile := <bool>$mobile,
            mod := <Account><uuid><str>$mod,
            reason := <str>$reason,
        };

        update Account filter .id = <uuid><str>$mod set {
            num_mod_records := coalesce(.num_mod_records, 0) + 1
        };

        with entry := (select Entry { level, player } filter .id = <uuid><str>$entry_id)
        delete Entry filter
            .level = entry.level and
            .player = entry.player and
            .status = Status.Approved and
            .status = <Status><str>$status and
            .id != <uuid><str>$entry_id;
    `, {
        time: req.body.time,
        status: req.body.status.replace(/(.)(?=.+)/, a=>a.toUpperCase()),
        mobile: req.body.device === "Mobile",
        mod: req.account!.id,
        reason: req.body.reason,
        entry_id: req.body.entryid,
    });

    res.redirect("/mod/records");
});


app.get("/mod/users", requireMod, async (req, res) => {
    const requests = await db.query<MigrationRequest>(`
        select MigrationRequest {
            id,
            account: {
                profile_shape,
                image
            },
            player: {
                name
            },
            discord: {
                global_name,
                user_id,
                avatar,
                username
            }
        } filter .account.status = AccountStatus.Migrating order by .created_at asc
    `);

    res.renderPage("/mod/users", {
        requests,
        elapsed: Math.round((Date.now() - req.timestamp) / 10) / 100,
    });
});

export interface UserEdit {
    migrationid: string,
    status: "accept" | "deny"
}

app.post("/mod/users", requireMod, async (req: Request<unknown, unknown, UserEdit>, res) => {
    switch (req.body.status) {
        case "accept":
            await db.execute(`
                with migration := (select (<MigrationRequest><uuid><str>$migration_id) { account, discord, player })
                select (
                    (update (select migration.account) set {
                        discord := migration.discord,
                        player := migration.player,
                        status := AccountStatus.Done
                    }),
                    (delete migration)
                )
            `, {
                migration_id: req.body.migrationid
            });
            break;
        case "deny": {
            const migration = await db.querySingle<MigrationRequest>(`
                select (<MigrationRequest><uuid><str>$migration_id) { id, account, discord }
            `, {
                migration_id: req.body.migrationid
            });

            if (isNullOrUndefined(migration)) {
                res.redirect("/mod/users");
                return;
            }

            await db.execute(`
                delete AuthToken filter .account = <Account><uuid><str>$account_id;
                delete MigrationRequest filter .id = <uuid><str>$migration_id;
                delete Account filter .id = <uuid><str>$account_id;
                delete Discord filter .id = <uuid><str>$discord_id;
            `, {
                migration_id: migration!.id,
                account_id: migration!.account.id,
                discord_id: migration!.discord.id
            });
            break;
        }
    }

    res.redirect("/mod/users");
});
