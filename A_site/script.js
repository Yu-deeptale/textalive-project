import { contentData } from "../content.js";

const main = document.getElementById("content");

contentData.forEach(({ title, text }) => {
  const section = document.createElement("section");
  section.innerHTML = `<h2>${title}</h2><p>${text}</p>`;
  main.appendChild(section);
});

