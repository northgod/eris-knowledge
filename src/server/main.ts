import { createApp } from "./app";
import { config } from "./config";
import { openDatabase } from "./db/database";

const db = openDatabase(config.databasePath);
const app = createApp({ db, scarletRoot: config.scarletRoot });

app.listen(config.port, "127.0.0.1", () => {
  console.log(`eris-knowledge API listening on http://127.0.0.1:${config.port}`);
});
