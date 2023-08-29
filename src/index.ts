import express from "express";
import ffmpegPath from "ffmpeg-static";
import Ffmpeg from "fluent-ffmpeg";
import ytdl from "ytdl-core";
import Stream from "stream";
import path from "path";
import fs from "fs";

const port = fs.readFileSync("port.txt", "utf-8") || "3000"

const app = express();

if (!ffmpegPath) {
  throw new Error("ffmpeg not found");
}

app.get("/", (req, res) => {
    res.sendFile(path.resolve("static/index.html"));
});

app.get("/:type/:id.:ext", async (req, res) => {
  const { type, id, ext } = req.params;

  if (type !== "v" && type !== "a") {
    return res.status(400).json({
      error: "Invalid type. Valid types are v (video) and a (audio)",
    });
  }

  if (!ytdl.validateID(id)) {
    return res.status(400).json({
      error: "Invalid video ID",
    });
  }

  if (type === "v") {
    const validExt = ["mp4", "webm"];
    if (!validExt.includes(ext)) {
      return res.status(400).json({
        error: `Invalid extension. Valid extensions are ${validExt.join(", ")}`,
      });
    }

    const video = await ytdl.getBasicInfo(id);

    video.formats
      .sort((a, b) => {
        return (b.bitrate || 0) - (a.bitrate || 0);
      })
      .filter((format) => {
        return format.hasVideo && format.hasAudio && format.container === ext;
      });

    const stream = ytdl(id, {
      quality: "highestvideo",
      filter: "videoandaudio",
    });

    res.setHeader("Content-Type", "video/mp4");
    stream.pipe(res, { end: true });
  } else {
    const validExt = ["mp3", "wav", "ogg", "flac"];
    if (!validExt.includes(ext)) {
      return res.status(400).json({
        error: `Invalid extension. Valid extensions are ${validExt.join(", ")}`,
      });
    }

    const stream = ytdl(id, {
      quality: "highestaudio",
      filter: "audioonly",
    });

    process(stream, ext, res, {
      audioBitrate: 192,
    });
  }
});

async function process(
  stream: Stream.Readable,
  ext: string,
  res: express.Response,
  options?: {
    audioBitrate?: number;
    videoBitrate?: number;
  }
) {
  const ffmpeg = Ffmpeg({ source: stream });
  ffmpeg.setFfmpegPath(ffmpegPath as string);
  ffmpeg.format(ext);
  if (options?.audioBitrate) ffmpeg.outputOptions(`-b:a ${options.audioBitrate}K`);
  if (options?.videoBitrate) ffmpeg.outputOptions(`-b:v ${options.videoBitrate}K`);

  ffmpeg.on("error", (err) => {
    console.log(err);
  });

  ffmpeg.on("end", () => {
    console.log("Processing finished successfully");
  });

  res.setHeader("Content-Type", "audio/mpeg");

  ffmpeg.pipe(res, { end: true });
}

app.listen(parseInt(port), () => {
  console.log("Server is running on port " + port);
});
