import { Router } from "express";
import ytdl from "ytdl-core";
import Processor from "../processor";
import getVideoInfo from "../util/getVideoInfo";

const router = Router();

router.get("/:id.:ext", async (req, res) => {
  const { id, ext } = req.params;
  const { i } = req.query;

  const useDiscordPatch = req.headers["user-agent"]?.includes("Discordbot") || false;

  if (!ytdl.validateID(id)) {
    return res.status(400).json({
      error: "Invalid video ID",
    });
  }

  const audioExt = ["mp3", "wav", "ogg", "flac", "fastestaudio"];
  const videoExt = ["mp4", "webm", "fastest", "fastestvideo"];

  const type = audioExt.includes(ext) ? "a" : videoExt.includes(ext) ? "v" : null;

  if (type === "v") {
    if (!videoExt.includes(ext)) {
      return res.status(400).json({
        error: `Invalid extension. Valid extensions are ${videoExt.join(", ")}`,
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
        quality: "highest",
        filter: ext == "fastest" ? "videoandaudio" : (format) => format.container === ext,
      });

      const info = await getVideoInfo(stream);

      res.setHeader("Content-Type", "video/" + ext);

      const processor = new Processor(stream, info.format.container);
      processor.send(res, {
        download: i == "true",
        filename: title,
        mode: useDiscordPatch ? "full" : "pipe",
        ext,
      });
    } catch (err) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  } else {
    if (!audioExt.includes(ext)) {
      return res.status(400).json({
        error: `Invalid extension. Valid extensions are ${audioExt.join(", ")}`,
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

      const info = await getVideoInfo(stream);
      console.log(info);

      const processor = new Processor(stream, info.format.container);
      processor.send(res, {
        download: i == "true",
        filename: title,
        mode: useDiscordPatch ? "full" : "pipe",
        ext,
      });
    } catch (err) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }
});

export default router;
