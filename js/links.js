import { renderShell } from "./app.js";
import { LINK_GROUPS } from "./links-data.js";

renderShell("links", "정보허브");

const container = document.getElementById("linkGroups");
container.innerHTML = LINK_GROUPS.map(
  (group) => `
  <div class="link-group">
    <h3>${escapeHtml(group.title)}</h3>
    ${group.items
      .map(
        (item) => `
      <a class="link-card" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">
        <span class="emoji">${item.emoji || "🔗"}</span>
        <span class="txt">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.desc || "")}</span>
        </span>
        <span class="arrow">›</span>
      </a>`
      )
      .join("")}
  </div>`
).join("");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || "#").replace(/"/g, "&quot;");
}
