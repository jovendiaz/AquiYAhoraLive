const intro = document.getElementById("intro");
const bosque = document.getElementById("bosque");

intro.onclick = () => {
  intro.classList.add("apertura");

  setTimeout(() => {
    intro.style.display = "none";
    bosque.classList.add("visible");
  }, 2000);
};
