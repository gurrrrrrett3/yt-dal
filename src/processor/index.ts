import { Readable, Writable, PassThrough } from "stream";
import { Response } from "express";
import Ffmpeg, { ffprobe } from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs";

export default class Processor {
  private name: string = Math.random().toString(36).substring(7);

  constructor(
    public stream: Readable,
    public ext: string,
    public optons?: {
      duration?: number;
    }
  ) {
    console.log(`${this.name}: Processor created`);

    this.stream.on("end", () => {
      console.log(`${this.name}: Pre-convert stream ended`);
    });

    this.stream.on("error", (err) => {
      console.log(`${this.name}: An error occured while processing the video`);
      console.log(err);
    });

    this.stream.on("close", () => {
      console.log(`${this.name}: Pre-convert stream closed`);
    });
  }

  public async send(
    res: Response,
    options?: {
      download?: boolean;
      filename?: string;
      audioBitrate?: number;
      videoBitrate?: number;
      startTime?: number;
      endTime?: number;
      ext: string;
      mode?: "pipe" | "full";
    }
  ) {
    console.log(`${this.name}: Sending video`);
    if (options?.download) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${options.filename || res.req?.path || "video"}"`
      );
    } else {
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${options?.filename || res.req?.path || "video"}"`
      );
    }

    if (
      (!options?.ext.includes("fastest") && options?.ext && options.ext !== this.ext) ||
      options?.audioBitrate ||
      options?.videoBitrate ||
      options?.startTime ||
      options?.endTime
    ) {
      // request has options that require conversion

      const ffmpeg = Ffmpeg({
        source: this.stream,
        logger: console,
      }).setFfmpegPath(ffmpegPath as string);

      ffmpeg.inputFormat(this.ext).outputFormat(options.ext);

      if (options?.audioBitrate) ffmpeg.audioBitrate(options.audioBitrate);
      if (options?.videoBitrate) ffmpeg.videoBitrate(options.videoBitrate);

      // time is in seconds

      if (options?.startTime) ffmpeg.seekInput(options.startTime);
      if (options?.endTime) ffmpeg.duration(options.endTime - (options.startTime || 0));

      ffmpeg.on("start", (cmd) => {
        console.log(`${this.name}: ffmpeg command: ${cmd}`);
      });

      ffmpeg.on("error", (err) => {
        console.log(`${this.name}: An error occured while converting the video`);
        console.log(err);
      });

      if (options?.mode === "pipe") {
        ffmpeg.pipe(res, { end: true });
      } else {
        const tempPath = path.resolve(`temp/${this.name}`);
        if (!fs.existsSync(tempPath)) {
          ffmpeg.pipe(fs.createWriteStream(tempPath));
        } else {
          ffmpeg.emit("end");
        }

        ffmpeg.on("end", () => {
          setTimeout(() => {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            console.log(`${this.name}: Temp file deleted`);
          }, 1000 * 60 * 5);
        });
      }

      return;
    }

    if (options?.mode === "pipe") {
      this.stream.pipe(res);

      this.stream.on("end", () => {
        console.log(`${this.name}: Piping to response finished`);
      });
    } else {
      const path = await this.pipeToFile();
      res.sendFile(path);
    }
  }

  public pipeToFile() {
    return new Promise<string>((resolve, reject) => {
      const tempPath = path.resolve(`temp/${name}`);
      if (!fs.existsSync(tempPath)) {
        this.stream.pipe(fs.createWriteStream(tempPath));
      } else {
        this.stream.emit("end");
      }

      this.stream.on("end", () => {
        setTimeout(() => {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          console.log(`${this.name}: Temp file deleted`);
        }, 1000 * 60 * 5);

        console.log(`${this.name}: Piping to file finished`);

        resolve(tempPath);
      });

      this.stream.on("error", (err) => {
        console.log(`${this.name}: An error occured while piping to file`);
        reject(err);
      });
    });
  }
}
