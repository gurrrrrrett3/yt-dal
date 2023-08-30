import express from "express";
import ffmpegPath from "ffmpeg-static";
import Ffmpeg from "fluent-ffmpeg";
import ytdl from "ytdl-core";
import Stream from "stream";
import path from "path";
import fs from "fs";

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

app.get("/redirect", (req, res) => {
  const { input, ext, i } = req.query;
  if (!input) {
    res.redirect("/");
    return;
  }

  try {
    const id = ytdl.getVideoID(input as string);
    if (!id) {
      res.redirect("/");
      return console.log(`Invalid video: ${input}`);
    }

    res.redirect(`/${id}.${ext}` + (i == "true" ? "?i=true" : ""));
  } catch (err) {
    console.log(err);
    res.redirect("/");
    return;
  }
});

app.get("/:type/:id.:ext", (req, res) => {
  const { type, id, ext } = req.params;
  res.redirect(`/${id}.${ext}`);
});

app.get("/:id.:ext", async (req, res) => {
  const { id, ext } = req.params;
  const { i } = req.query;

  const useDiscordPatch = req.headers["user-agent"]?.includes("Discordbot") || false;

  console.log(
    `[${new Date().toLocaleString()}] ${
      req.headers["x-forwarded-for"] || req.connection.remoteAddress
    } - ${id}.${ext} - ${req.headers["user-agent"]}`
  );

  if (!ytdl.validateID(id)) {
    return res.status(400).json({
      error: "Invalid video ID",
    });
  }

  const audioExt = ["mp3", "wav", "ogg", "flac"];
  const videoExt = ["mp4", "webm"];

  const type = audioExt.includes(ext) ? "a" : videoExt.includes(ext) ? "v" : null;

  if (type === "v") {
    const validExt = ["mp4", "webm"];
    if (!validExt.includes(ext)) {
      return res.status(400).json({
        error: `Invalid extension. Valid extensions are ${validExt.join(", ")}`,
      });
    }

    const video = await ytdl.getBasicInfo(id).catch((err) => {
      res.status(400).json({
        error: "Invalid video ID",
      });
      return;
    });

    if (!video) return;

    const title = video.videoDetails.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    try {
      const formats = video.formats
        .sort((a, b) => {
          return (b.bitrate || 0) - (a.bitrate || 0);
        })
        .filter((format) => {
          return format.hasVideo && format.hasAudio && format.container === ext;
        });

      const stream = ytdl(id, {
        quality: "highestvideo",
        filter: "videoandaudio",
        format: formats[0] || undefined,
      });

      console.log(`[${id}.${ext}] stream started | ${formats[0].bitrate}Kbps`);

      res.setHeader("Content-Type", "video/" + ext);

      if (i == "true") {
        res.setHeader("Content-Disposition", `attachment; filename="${title}.${ext}"`);
      }

      if (useDiscordPatch) {
        // discord's player is broken and doesn't support streams, so we have to download full file before sending it
        const tempPath = path.resolve(`temp/${id}.${ext}`);
        if (!fs.existsSync(tempPath)) {
          console.log(`[${id}.${ext}] discord | downloading`);
          stream.pipe(fs.createWriteStream(tempPath));
        } else {
          console.log(`[${id}.${ext}] discord | already exists}`);
          stream.emit("end");
          stream.destroy();
        }

        stream.on("end", () => {
          console.log(`[${id}.${ext}] discord | sending`);
          res.sendFile(tempPath);

          setTimeout(() => {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            console.log(`[${id}.${ext}] discord | deleted`);
          }, 1000 * 60 * 5);
        });
      } else {
        stream.pipe(res, { end: true });
        console.log(`[${id}.${ext}] normal | streaming`);

        res.on("close", () => {
          console.log(`[${id}.${ext}] normal | closed`);
        });
      }
    } catch (err) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  } else {
    const validExt = ["mp3", "wav", "ogg", "flac"];
    if (!validExt.includes(ext)) {
      return res.status(400).json({
        error: `Invalid extension. Valid extensions are ${validExt.join(", ")}`,
      });
    }

    const video = await ytdl.getBasicInfo(id).catch((err) => {
      res.status(400).json({
        error: "Invalid video ID",
      });
      return;
    });

    if (!video) return;

    const title = video.videoDetails.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    try {
      const stream = ytdl(id, {
        quality: "highestaudio",
        filter: "audioonly",
      });

      process(stream, ext, res, {
        audioBitrate: 192,
        download: i == "true",
        fileName: title,
      });
    } catch (err) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }
});

async function process(
  stream: Stream.Readable,
  ext: string,
  res: express.Response,
  options?: {
    audioBitrate?: number;
    videoBitrate?: number;
    download?: boolean;
    fileName?: string;
  }
) {
  const ffmpeg = Ffmpeg({ source: stream });
  ffmpeg.setFfmpegPath(ffmpegPath as string);
  ffmpeg.format(ext);
  if (options?.audioBitrate) ffmpeg.outputOptions(`-b:a ${options.audioBitrate}K`);
  if (options?.videoBitrate) ffmpeg.outputOptions(`-b:v ${options.videoBitrate}K`);

  ffmpeg.on("error", (err) => {
    console.log(err);
    throw new Error("An error occurred while processing the video");
  });

  ffmpeg.on("end", () => {
    console.log("Processing finished successfully");
  });

  res.setHeader("Content-Type", "audio/" + ext);
  if (options?.download) {
    res.setHeader("Content-Disposition", `attachment; filename="${options.fileName || res.req.path}.${ext}"`);
  }
  ffmpeg.pipe(res, { end: true });
}

app.listen(parseInt(port), () => {
  console.log("Server is running on port " + port);
});
