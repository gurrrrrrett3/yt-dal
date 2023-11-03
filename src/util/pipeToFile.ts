import internal from "stream";
import path from "path";
import fs from "fs";

export default async function pipeToFile(stream: internal.Stream, name: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempPath = path.resolve(`temp/${name}`);
    if (!fs.existsSync(tempPath)) {
      stream.pipe(fs.createWriteStream(tempPath));
    } else {
      stream.emit("end");
    }

    stream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }, 1000 * 60 * 5);

      resolve(tempPath);
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
}
