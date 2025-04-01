import fs from "fs";

export const translations: { [key: string]: object } = {};

fs.readdirSync("www/translations/").forEach(file => {
	const [lang, ext] = file.split(".");

	if (ext === "json") {
		translations[lang] = JSON.parse(fs.readFileSync(`www/translations/${file}`, "utf-8"));
	}
});

export default translations;
