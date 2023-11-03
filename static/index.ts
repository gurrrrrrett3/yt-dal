import FormatManager from "./scripts/formatManager";
import "./scripts/typewriter";

const input = document.getElementById("input") as HTMLInputElement;

let inputTimestamp = 0;
let lastFormatInput = "";

input.addEventListener("keyup", (e) => {
    if (input.value === "") {
        return;
    }
    inputTimestamp = Date.now();
});

setInterval(async () => {
    if (input.value === "" || input.value === lastFormatInput) {
        return;
    }

    if (Date.now() - inputTimestamp > 1000) {
        lastFormatInput = input.value;
        await FormatManager.getFormats(input.value)
    }
})

function urlEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => {
    return "%" + c.charCodeAt(0).toString(16);
  });
}