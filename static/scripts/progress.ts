export default class Progress {

    public static checkTimer = setInterval(() => {
        this.checkProgress();
    }, 1000)

    public static currentId?: string
    public static element = document.getElementById("progress") as HTMLParagraphElement;

    public static async startDownload(id: string, itag: number, format: string, audioTag?: number) {
        const url = `/download?id=${id}&itag=${itag}&format=${format}${audioTag ? `&audioTag=${audioTag}` : ""}`
        this.currentId = id;
        await fetch(url);
    }

    public static async checkProgress() {
        if (!this.currentId) return;
        const res = await fetch(`/progress?id=${this.currentId}`);

        if (!res.ok) {
            this.currentId = undefined;
            this.element.innerHTML = "Errored... Try another format.";
            return;
        }

        const data: {
            progress: string,
        } = await res.json();
        
        if (data.progress.startsWith("done")) {
            window.location.href = `/serve?id=${data.progress.split(":")[1]}`;
            this.currentId = undefined;
            this.element.innerHTML = "";
            return;
        }

        this.element.innerHTML = data.progress;
    }
}