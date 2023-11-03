let currentCharCount = 0;
let delay = 75;

document.addEventListener("DOMContentLoaded", () => {
  const typewriter = (element, startDelay) => {
    const textArray = element.innerHTML.split("");
    element.innerHTML = "";

    setTimeout(() => {
      textArray.forEach((letter, i) => {
        setTimeout(() => (element.innerHTML += letter), delay * i);
      });
    }, startDelay);
  };

  document.querySelectorAll("[data-typewriter]").forEach((element) => {
    const length = element.innerHTML.length;
    typewriter(element, delay * currentCharCount);
    currentCharCount += length;
  });
});