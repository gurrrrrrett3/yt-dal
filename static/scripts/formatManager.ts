import { videoFormat } from "ytdl-core";
import Progress from "./progress";

export default class FormatManager {

    public static async getFormats(input: string) {
        const res = await fetch("/formats?input=" + encodeURIComponent(input));
        if (!res.ok) {
            alert("Failed to get formats");
            return;
        }

        const formats: {
            id: string,
            formats: videoFormat[]
        } = await res.json();

        console.log(formats);

        this.calcuateFormats(formats);
    }

    public static calcuateFormats(data: {
        id: string,
        formats: videoFormat[]
    }) {
        const formats = data.formats;
        const parsedFormats: ParsedFormat[] = [];

        const audioFormats = [
<<<<<<< HEAD
            "mp3",
=======
            // "mp3",
>>>>>>> 59210cbd28d35991a5ed9e463112e424c3734a1c
            "ogg",
           // "wav",
            "flac",
            "opus"
        ]

        const videoFormats = [
            "mp4",
            // "webm",
        ]

        const bestAudio = formats
            .filter((format) => {
                return format.hasAudio;
            })
            .sort((a, b) => {
                if (!a.audioBitrate || !b.audioBitrate) return 0;
                return b.audioBitrate - a.audioBitrate;
            })[0]

        console.log(bestAudio);

        formats.forEach((format) => {
            if (format.hasVideo) {
                videoFormats.forEach((videoFormat) => {
                    if (format.container === videoFormat &&
                        !parsedFormats.find((f) => f.type == "video" &&
                            f.format === videoFormat &&
                            f.resolution === `${format.height}p ${format.fps}fps ${format.hasAudio && "a"}`)) {

                        parsedFormats.push({
                            type: "video",
                            format: videoFormat,
                            resolution: `${format.height}p ${format.fps}fps`,
                            resolutionNum: format.height || 0,
                            videoTag: format.itag,
                            audioTag: bestAudio.itag,
                            bitrate: format.audioBitrate,
                        })
                    }
                })
            }
        })

        audioFormats.forEach((audioFormat) => {
            parsedFormats.push({
                type: "audio",
                format: audioFormat,
                bitrate: bestAudio.audioBitrate,
                audioTag: bestAudio.itag,
            })
        })

        this.buildTable(parsedFormats, data.id);

    }

    public static buildTable(formats: ParsedFormat[], id: string) {
        const table = document.getElementById("formatInfo") as HTMLTableElement;
        if (!table) {
            return;
        }

        table.innerHTML = "";

        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");

        formats
            .sort((a, b) => {
                if (a.type === "video" && b.type === "video") {
                    return b.resolutionNum - a.resolutionNum;
                } else if (a.type === "audio" && b.type === "audio") {
                    return (b.bitrate || 0) - (a.bitrate || 0);
                } else if (a.type === "video" && b.type === "audio") {
                    return -1;
                } else {
                    return 1;
                }
            })
            .forEach((format) => {
                const row = tbody.insertRow();
                const typeCell = row.insertCell();
                const formatCell = row.insertCell();
                const resolutionCell = row.insertCell();
                const downloadCell = row.insertCell();

                typeCell.innerText = format.type;
                formatCell.innerText = format.format;
                resolutionCell.innerText = format.type === "video" ? format.resolution : `${format.bitrate}kbps`;

                const downloadButton = document.createElement("a");
                downloadButton.innerText = "Download";
                downloadButton.classList.add("dlbutton");
                downloadButton.innerText = "Download";
                downloadButton.href = "#";
                downloadButton.onclick = () => {
                    if (format.type == "video") {
                        Progress.startDownload(id, format.videoTag, format.format, format.audioTag);
                    } else {
                        Progress.startDownload(id, format.audioTag, format.format);
                    }
                }

                downloadCell.appendChild(downloadButton);
            })

        table.appendChild(thead);
        table.appendChild(tbody);
    }
}

type ParsedFormat = {
    type: "audio"
    format: string,
    bitrate?: number
    audioTag: number,
} | {
    type: "video"
    format: string,
    resolution: string,
    resolutionNum: number,
    videoTag: number,
    audioTag?: number,
    bitrate?: number,
}