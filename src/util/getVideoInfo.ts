import { Readable } from "stream";
import { videoInfo, videoFormat } from "ytdl-core";
export default function getVideoInfo(stream: Readable) {
  return new Promise<{
    info: videoInfo;
    format: videoFormat;
  }>((resolve, reject) => {
    stream.on("info", (info, format) => {
      resolve({ info, format });
    });
  });
}
