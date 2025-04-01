import type { Request } from "express";

import type { Device, MigrationRequest, Player, ProfileShape } from "../../dbschema/interfaces";
import app, { type Cookies } from "../app";
import db from "../db";
import { isNullOrUndefined, requireLogin } from "../util";
import { getDiscordAuth } from "./discord";

app.get("/login", async (req, res) => {
	if (req.account)
		return res.redirect("/account");

	res.renderPage("/login");
});

app.get("/account", requireLogin, async (req, res) => {
	if (req.account!.status === "None")
		return res.redirect("/account/setup");

	const migration = await db.querySingle<MigrationRequest>(`
		select MigrationRequest {
		    id,
		    requested := (select to_str(.created_at, "FMDD FMMonth, HH24:MI")),
		    discord: { global_name, user_id, username, avatar, accent_color, banner }
		} filter .account.id = <uuid><str>$id limit 1
	`, { id: req.account!.id });

	res.renderPage("/account/account", { migration });
});

export interface AccountUpdate {
	method: "deleterecord",
	id?: string
}

app.post("/account", requireLogin, async (req: Request<unknown, unknown, AccountUpdate>, res) => {
	switch (req.body.method) {
		case "deleterecord":
			await db.execute("delete <Entry><uuid><str>$entry_id", { entry_id: req.body.id });
			break;
	}

	res.redirect("/account");
});

app.get("/account/migrate", requireLogin, async (req, res) => {
	if (req.account!.status !== "None")
		return res.redirect("/account");

	const players = await db.query<Player>("select Player { name } order by .name");
	res.renderPage("/account/migrate", { players });
});

export interface MigrateInfo {
	username: string,
	device: Device,
	discord?: string
}

app.post("/account/migrate", requireLogin, async (req: Request<unknown, unknown, MigrateInfo>, res) => {
	req.body.device = req.body.device.toCapital() as Device;

	let discord;

	if (!isNullOrUndefined(req.body.discord)) {
		const redirect = `${req.protocol}://${req.get("host")}/api/auth/discord`;
		discord = await getDiscordAuth(redirect, req.body.discord!);

		if (isNullOrUndefined(discord)) return res.redirect("/account/migrate");
	}

	await db.execute(`
		insert MigrationRequest {
		    discord := ((insert Discord {
		    	user_id := <str>$user_id,
		    	username := <str>$discord_username,
		    	global_name := <str>$global_name,
		    	avatar := <str>$avatar,
		    	accent_color := <str>$accent_color,
		    	banner := <str>$banner
		    }) if <bool>$has_discord else (<Discord><uuid><str>$prior_discord)),

		    account := <Account><uuid><str>$account_id,
		    player := (select Player filter .name = <str>$username)
		};

		update <Account><uuid><str>$account_id set {
		    status := AccountStatus.Migrating
		};

		update Player filter .name = <str>$username set {
		    device := <Device><str>$device
		}
	`, {
		account_id: req.account!.id,
		username: req.body.username,
		device: req.body.device,
		prior_discord: req.account!.discord?.id,
		has_discord: discord !== undefined,
		user_id: discord?.user_id ?? "",

		discord_username: discord?.username ?? "",
		global_name: discord?.global_name ?? "",
		avatar: discord?.avatar ?? "",
		accent_color: discord?.accent_color ?? "",
		banner: discord?.banner ?? ""
	});

	res.redirect("/account");
});

app.get("/account/settings", requireLogin, async (req, res) => {
	if (req.account!.status !== "Done")
		return res.redirect("/account");

	res.renderPage("/account/settings");
});

export interface AccountSettings {
	method: "logout" | "delete" | "update",
	name?: string,
	device?: Device,
	profileshape?: ProfileShape
}

app.post("/account/settings", requireLogin, async (req: Request<unknown, unknown, AccountSettings>, res) => {
	if (!isNullOrUndefined(req.body.device)) req.body.device = req.body.device!.toCapital() as Device;
	if (!isNullOrUndefined(req.body.profileshape)) req.body.profileshape = req.body.profileshape!.toCapital() as ProfileShape;

	const { token } = req.cookies as Cookies;

	switch (req.body.method) {
		case "logout":
			await db.execute("delete AuthToken filter .token = <str>$token", { token });

			res.redirect("/");
			break;

		case "delete":
			await db.execute(`
				delete AuthToken filter .account.id = <uuid><str>$account_id;
				delete MigrationRequest filter .account.id = <uuid><str>$account_id;
				delete Account filter .id = <uuid><str>$account_id;
			`, { account_id: req.account!.id });

			res.redirect("/");
			break;

		case "update": {
			const name = (req.body.name ?? "").trim();

			if (name.length === 0 || name.length > 25)
				return res.redirect("/account/settings");

			await db.execute(`
                update Player filter .id = <uuid><str>$player_id set {
                    name := <str>$username,
                    device := <Device><str>$device
                };
                update Account filter .id = <uuid><str>$account_id set {
                    profile_shape := <ProfileShape><str>$profile_shape
                }
			`, {
				account_id: req.account!.id,
				player_id: req.account!.player!.id,
				username: name,
				device: req.body.device?.replace(/(.)(?=.+)/, a=>a.toUpperCase()),
				profile_shape: req.body.profileshape
			});

			res.redirect("/account/settings");
			break;
		}

		default:
			res.redirect("/account/settings");
			break;
	}
});

app.get("/account/setup", requireLogin, async (req, res) => {
	if (req.account!.status !== "None")
		return res.redirect("/account");

	res.renderPage("/account/setup");
});

export interface SetupInfo {
	username: string,
	device: Device
}

app.post("/account/setup", requireLogin, async (req: Request<unknown, unknown, SetupInfo>, res) => {
	req.body.device = req.body.device.toCapital() as Device;

	const name = req.body.username.trim();
	if (name.length === 0 || name.length > 25) {
		return res.redirect("/account/setup");
	}

	const goSetup = await db.querySingle<boolean>(`
		select true if exists (select Player { id } filter .name = <str>$username) else (select (
			false,
            (update Account filter .id = <uuid><str>$account_id set {
                status := AccountStatus.Done,
                player := (insert Player {
		            name := <str>$username,
		            device := <Device><str>$device
		        })
            })
		).0)
	`, {
		account_id: req.account!.id,
		username: name,
		device: req.body.device
	});

	if (typeof goSetup !== "boolean")
		return res.redirect("/account/setup");

	res.redirect(goSetup ? `/account/migrate?username=${name}&device=${req.body.device}` : "/account");
});
