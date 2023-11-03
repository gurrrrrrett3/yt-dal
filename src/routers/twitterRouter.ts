import { Router } from "express";
import { FxTweet } from "../util/fxTwitterTypes";
import errorRedirect from "../util/errorRedirect";
import fetch from "node-fetch";
import Stream from "stream";
import Processor from "../processor";
const router = Router();

router.get("/:username/:id.:ext", async (req, res) => {
  const { username, id, ext } = req.params;
  const { i } = req.query;

  const useDiscordPatch = req.headers["user-agent"]?.includes("Discordbot") || false;

  const apiUrl = new URL(`https://api.fxtwitter.com/${username}/status/${id}`);
  const tweet: FxTweet = await fetch(apiUrl)
    .then((res) => res.json())
    .catch((err) => {
      errorRedirect(res, "Failed to fetch tweet");
      return;
    });

  if (!tweet) return;
  const video = tweet.tweet.media.videos[0];

  const fastExtensions = [
    "fastest",
    "fastestvideo",
  ]

  const useNative = fastExtensions.includes(ext) || useDiscordPatch;

  if (useNative) {
    res.redirect(`/tw/${username}/${id}.${video.format}` + (i == "true" ? "?i=true" : ""));
  }

  if (!video) {
    errorRedirect(res, "Tweet has no video");
    return;
  }

  const title = tweet.tweet.text.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const stream = await fetch(video.url).then((res) => res.body);

  const isCorrectExt = video.format === `video/${ext}`;

  const processor = new Processor(stream as Stream.Readable, video.format.replace("video/", ""));

  if (!isCorrectExt) {
    processor.send(res, {
      download: i == "true",
      filename: title,
      mode: useDiscordPatch ? "full" : "pipe",
      ext,
    });
  } else {
    processor.send(res, {
      download: i == "true",
      filename: title,
      mode: useDiscordPatch ? "full" : "pipe",
      ext,
    });
  }
});

export default router;
