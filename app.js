const intro = document.getElementById("intro");
const bosque = document.getElementById("bosque");

intro.addEventListener("click", () => {
  intro.classList.add("abrir");

  setTimeout(() => {
    intro.style.display = "none";
    bosque.classList.add("visible");
  }, 1200);
});
