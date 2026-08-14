import { createApp } from "./server.js";

const PORT = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(PORT, () => {
  console.log(`DiceMaster API listening on http://localhost:${PORT}`);
});
