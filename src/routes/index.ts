import { STATUS_CODES } from "http";

import type { Level, Player } from "../../dbschema/interfaces";
import app from "../app";
import db, { schema } from "../db";

app.get("/", async (req, res) => {
	const levels = await db.cachedQuery<Level>(`
		select Level {
            name,
            creator,
            video_id,
            level_id,
            record := (select .entries {
                name := (select .player.name),
                time_format := (select to_str(.time, "FMHH24:MI:SS")),
                time_ms := (select to_str(.time, "MS"))
            } filter .status = Status.Approved  order by .time limit 1),
            placement
        } order by .placement
	`, null, { serveStaleContent: true });

	res.renderPage("/index", {
		levels: levels.slice(0, 75),
		extended: levels.slice(75, 150),
		legacy: levels.slice(150),
	});
});

app.get("/leaderboard", async (req, res) => {
    const players = await db.cachedQuery<schema.Player>(`
        with ranked := enumerate((
            select Player {
                id,
                points
            } filter (select count(.entries)) != 0 order by .points desc
        )) select ranked.1 {
            *,
            rank := <int32>(ranked.0 + 1)
        } order by .points desc
    `, null, { serveStaleContent: true });

    res.renderPage("/leaderboard", { players });
});

app.get("/level/:id", async (req, res) => {
    const level = await db.cachedQuerySingle<Level>(`
        select Level {
            name,
            creator,
            video_id,
            verifier: { name },
            placement,
            points,
            level_id,
            records := (select .entries {
                name := .player.name,
                time_format := (select to_str(.time, "FMHH24:MI:SS")),
                time_ms := (select to_str(.time, "MS")),
                video_id,
                mobile,
                rank
            } filter .status = Status.Approved order by .time)
        } filter .level_id = <int64>$id
    `, { id: Number(req.params.id) }, { serveStaleContent: true });

    if (level === null) {
        res.status(404).renderPage("/fallback", { status: `404: ${STATUS_CODES[404]}` });
        return;
    }

    res.renderPage("/level", { level });
});

app.get("/player/:username", async (req, res) => {
    if (req.params.username === req.account?.player?.name) {
        res.redirect("/account");
        return;
    }

    const player = await db.cachedQuerySingle<Player>(`
        select Player {
            id,
            name,
            points,
            verifications: { name, level_id, placement, video_id },
            records := (select .entries {
                level: { name, level_id, placement },
                time_format := (select to_str(.time, "FMHH24:MI:SS")),
                time_ms := (select to_str(.time, "MS")),
                video_id,
                rank
            } order by .level.placement),
            rank,
            device
        } filter .name = <str>$name
    `, { name: req.params.username }, { serveStaleContent: true });

    if (player === null) {
        res.status(404).renderPage("/fallback", { status: `404: ${STATUS_CODES[404]}` });
        return;
    }

    res.renderPage("/player", { player });
});
