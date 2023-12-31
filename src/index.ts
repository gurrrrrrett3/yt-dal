import express from "express";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs";

import mainRouter from "./routers/mainRouter";


const port = fs.readFileSync("port.txt", "utf-8") || "3000";

const app = express();

if (!ffmpegPath) {
  throw new Error("ffmpeg not found");
}

if (!fs.existsSync("temp")) {
  fs.mkdirSync("temp");
}

app.get("/", (req, res) => {
  res.sendFile(path.resolve("static/index.html"));
});

app.use("/", mainRouter)


app.use("/", express.static("dist/build"));

app.listen(parseInt(port), () => {
  console.log("Server is running on port " + port);
});
