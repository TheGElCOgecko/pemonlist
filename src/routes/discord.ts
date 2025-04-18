import { randomBytes } from "crypto";
import DiscordOauth2 from "discord-oauth2";
import { isNullOrUndefined } from "src/util";

import app from "../app";
import db from "../db";

const discordOauth2 = new DiscordOauth2({
	clientId: process.env.DISCORD_OAUTH2_CLIENT_ID,
	clientSecret: process.env.DISCORD_OAUTH2_CLIENT_SECRET
});

export async function getDiscordAuth(redirect: string, code: string): Promise<Record<string, unknown> | null> {
	const token = await discordOauth2.tokenRequest({
		code,
		grantType: "authorization_code",
		redirectUri: redirect,
		scope: "identify email"
	}).catch(() => undefined);
	if (isNullOrUndefined(token)) return null;

	const user = await discordOauth2.getUser(token!.access_token).catch(() => undefined);
	if (isNullOrUndefined(user)) return null;

	return {
		user_id: user!.id,
		username: user!.username,
		global_name: user!.global_name ?? user!.username,
		avatar: user!.avatar ?? "",
		accent_color: Number(user!.accent_color ?? "0")
						.toString(16)
						.toUpperCase()
						.padStart(6, "0"),
		banner: user!.banner ?? "",
		email: user!.email
	};
}

app.get("/api/auth/discord", async (req, res) => {
	if (req.account) {
		return res.redirect("/login");
	}

	const hostname = req.get("host")
	const redirect = (hostname === "pemonlist.com") ? `https://${hostname}/api/auth/discord`
		: `${req.protocol}://${hostname}/api/auth/discord`;
	const authUrl = discordOauth2.generateAuthUrl({
		scope: "identify email",
		redirectUri: redirect,
		responseType: "code"
	});

	if (isNullOrUndefined(req.query.code))
		return res.redirect(authUrl);

	const discordUser = await getDiscordAuth(redirect, req.query.code as string);
	if (discordUser === null) return res.redirect(authUrl);


	const randomToken = randomBytes(100)
		.toString("base64")
		.replace(/\+|\/|=/g, "")
		.substring(0, 64);

	await db.execute(`
		with acc := (
			with disc := (
				with disc := (
					select Discord { id } filter .user_id = <str>$user_id limit 1
				) select disc if count(disc) > 0 else (insert Discord {
					user_id := <str>$user_id,
					username := <str>$username,
					global_name := <str>$global_name,
					avatar := <str>$avatar,
					accent_color := <str>$accent_color,
					banner := <str>$banner
				})
			) select (update Account filter .email = <str>$email set {
				discord := disc
			}) if (select count(Account filter .email = <str>$email) > 0) else (insert Account {
				email :=  <str>$email,
				oauth2 :=  <str>$oauth,
				player := <default::Player>{},
				discord := disc
			})
		) insert AuthToken {
		    token := <str>$token,
		    account := acc
		};
	`, {
		oauth: req.query.code,
		token: randomToken,
		...discordUser
	});

	res.cookie("token", randomToken, {
		maxAge: 1000 * 60 * 60 * 24 * 7,
		httpOnly: true
	});

	res.redirect("/account");
});
