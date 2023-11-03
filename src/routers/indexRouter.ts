import { Router } from "express";
import ytdl from "ytdl-core";
import Ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs";

const router = Router();

let infoCache: {
  [key: string]: {
    info: ytdl.videoInfo;
    timestamp: number;
  };
} = {};

let progress: {
  [key: string]: {
    progress: string;
    timestamp: number;
    fileName?: string;
    encodedName?: string;
  };
} = {};


router.get("/formats", (req, res) => {
  const { input } = req.query;

  if (!input) {
    res
      .status(500)
      .send("No URL provided");
    return;
  }

  if (ytdl.validateURL(input as string) || ytdl.validateID(input as string)) {
    try {
      const id = ytdl.getVideoID(input as string);
      if (!id) {
        res
          .status(500)
          .send("Invalid Video ID");
        return;
      }

      ytdl.getInfo(id).then((info) => {
        infoCache[id] = {
          info,
          timestamp: Date.now(),
        };

        res
          .status(200)
          .json({
            id,
            formats: info.formats,
          });
      }).catch((err) => {
        res
          .status(500)
          .send("Failed to parse URL");
        return;
      });
    } catch (err) {
      res
        .status(500)
        .send("Failed to parse URL");
      return;
    }
  } else {
    res
      .status(500)
      .send("Invalid URL. We don't support this site (yet)");
    return;
  }
});



router.get("/download", async (req, res) => {

  const audioFormats = "mp3,ogg,m4a,opus,wav,webm".split(",");
  const videoFormats = "mp4,webm".split(",");

  const { id, itag, format } = req.query;
  const audioTag = req.query.audioTag as string | undefined;

  const isVideo = videoFormats.includes(format as string);
  const isAudio = audioFormats.includes(format as string);

  if (!id || !itag || !format) {
    res
      .status(500)
      .send("Missing parameters");
    return;
  }

  const info = infoCache[id as string]?.info || await ytdl.getInfo(id as string);
  const videoFormat = info.formats.find((f) => f.itag == Number(itag));
  const audioFormat = audioTag ? info.formats.find((f) => f.itag == Number(audioTag)) : undefined;

  if (!videoFormat) {
    res
      .status(500)
      .send("Invalid video format");
    return;
  }

  if (audioTag && !audioFormat) {
    res
      .status(500)
      .send("Invalid audio format");
    return;
  }

  const fileName = `${info.videoDetails.title.replace(/ /g, "_")}.${format}`;
  const fileNameEncoded = encodeURIComponent(fileName).replace(/[!'()*]/g, (c) => {
    return "%" + c.charCodeAt(0).toString(16);
  });

  progress[id as string] = {
    progress: "Waiting...",
    encodedName: fileNameEncoded,
    timestamp: Date.now(),
    fileName: `${id}.${format}`
  };

  const stream = ytdl.downloadFromInfo(info, {
    format: videoFormat,
  })

  // stream.on("data", (chunk) => {
  //   chunkCount++;
  //   progress[id as string] = {
  //     progress: `Downloading... ${(chunkCount * 100 / 1000000).toFixed(2)}MB`,
  //     timestamp: Date.now(),
  //   };
  // })

  // download audio to buffer  
  const audioStream = audioFormat ? ytdl.downloadFromInfo(info, {
    format: audioFormat,
  }) : undefined;

  const audioFilePath = audioFormat ? await new Promise<string>((resolve, reject) => {
    const filePath = path.resolve(`./temp/${id}_audio_${Math.random().toString(36).substring(7)}.opus`);
    const writeStream = fs.createWriteStream(filePath);

    audioStream?.pipe(writeStream);

    writeStream.on("finish", () => {
      resolve(filePath);
    });

    writeStream.on("error", (err) => {
      reject(err);
    });
  }) : undefined;

  stream.on("error", (err) => {
    console.log(err);
  });

  const ffmpeg = Ffmpeg({
    source: stream,
    logger: console,
  }).setFfmpegPath(ffmpegPath as string);

  // ffmpeg.inputFormat(videoFormat.container);

  // merge audio and video

  if (audioFilePath) {
    ffmpeg.mergeAdd(audioFilePath);
  }

  if (isVideo) {
    ffmpeg.addOptions([
      "-c:v libx264",
      "-ac 2",
      "-map 0:v",
      "-map 1:a",
    ]);
  } else if (isAudio) {
    ffmpeg.addOptions([
      "-vn",
      "-c:a libopus",
      "-b:a 128k",
      "-ac 2",
    ]);
  }

  ffmpeg.on("start", (cmd) => {
    console.log(`ffmpeg command: ${cmd}`);
    progress[id as string].progress = "Converting...";
    progress[id as string].timestamp = Date.now();
  });

  ffmpeg.on("error", (err) => {
    console.log("An error occured while converting the video");
    console.log(err);
    delete progress[id as string];
  });

  ffmpeg.on("progress", (prog) => {
    const { timemark, currentFps } = prog;

    const ms = timemarkToMs(timemark);
    const duration = Number(info.videoDetails.lengthSeconds) * 1000;

    const progressPercent = (ms / duration * 100).toFixed(2);

    progress[id as string].progress = `Converting... ${progressPercent}% ${!Number.isNaN(currentFps) ? `${currentFps}fps` : ""}`;
    progress[id as string].timestamp = Date.now();

  });

  ffmpeg.on("end", () => {
    console.log("Finished converting video");

    if (audioFilePath && fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath as string);

    // setTimeout(() => {
    //   if (fs.existsSync(path.resolve(`./temp/${id}.${format}`))) fs.unlinkSync(path.resolve(`./temp/${id}.${format}`));
    //   console.log("Temp file deleted");
    // }, 1000 * 60 * 5);

    progress[id as string].progress = "done";

  });

  ffmpeg.output(path.resolve(`./temp/${id}.${format}`)).run();
  res.sendStatus(200);

})

router.get("/progress", (req, res) => {
  const { id } = req.query;

  if (!id) {
    res
      .status(500)
      .send("Missing parameters");
    return;
  }

  if (!progress[id as string]) {
    res
      .status(500)
      .send("Invalid ID");
    return;
  }

  if (progress[id as string].progress == "done") {

    res.json({
      progress: `done:${id}`,
      timestamp: Date.now(),
    })

    setTimeout(() => {

      if (fs.existsSync(path.resolve(`./temp/${progress[id as string].fileName}`))) {
        fs.unlinkSync(path.resolve(`./temp/${progress[id as string].fileName}`));
        console.log("Temp file deleted");
      }

      delete progress[id as string];

    }, 1000 * 60 * 5);

  } else {
    res.status(200).json(progress[id as string] || {
      progress: "Waiting...",
      timestamp: Date.now(),
    });
  }
})

router.get("/serve", (req, res) => {

  const { id } = req.query;

  if (!id) {
    res
      .status(500)
      .send("Missing parameters");
    return;
  }

  if (!progress[id as string]) {
    res
      .status(500)
      .send("Invalid ID");
    return;
  }

  if (progress[id as string].progress == "done") {
    console.log(`Sending file ${progress[id as string].fileName}`);
    res.setHeader("Content-Disposition", `attachment; filename=${progress[id as string].encodedName}`);
    res.setHeader("Content-Type", "application/octet-stream");

    res.sendFile(path.resolve(`./temp/${progress[id as string].fileName}`))
  } else {
    res
      .status(500)
      .send("File not ready");
    return;
  }

})

function timemarkToMs(mark: string) {
  const { hours, minutes, seconds, hundredths } = /((?<hours>\d{2}):)?(?<minutes>\d{2}):(?<seconds>\d{2})\.(?<hundredths>\d{2})/.exec(mark)?.groups || {
    hours: 0,
    minutes: 0,
    seconds: 0,
    hundredths: 0,
  };

  return (Number(hours) * 60 * 60 + Number(minutes) * 60 + Number(seconds)) * 1000 + Number(hundredths) * 10;
}

export default router;
