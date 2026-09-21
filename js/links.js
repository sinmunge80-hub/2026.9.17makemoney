import { renderShell, getNickname, setNickname, showToast } from "./app.js";
import { addEntry, getEntriesByCategory } from "./db.js";
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

document.getElementById("clNickname").value = getNickname();

const CATEGORY_LABEL = { useful: "유용한 사이트", income: "부수입 사이트" };

document
  .getElementById("communityLinkForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const nickname = document.getElementById("clNickname").value.trim();
    const title = document.getElementById("clTitle").value.trim();
    let url = document.getElementById("clUrl").value.trim();
    const linkCategory = document.getElementById("clCategory").value;
    const desc = document.getElementById("clDesc").value.trim();
    if (!nickname || !title || !url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    setNickname(nickname);

    const submitBtn = e.target.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "등록 중...";
    try {
      await addEntry({
        category: "community-link",
        nickname,
        title,
        url,
        linkCategory,
        desc,
        date: new Date().toISOString().slice(0, 10),
      });
      showToast("추천 사이트가 등록됐어요! 고마워요 💚");
      document.getElementById("clTitle").value = "";
      document.getElementById("clUrl").value = "";
      document.getElementById("clDesc").value = "";
      loadCommunityLinks();
    } catch (err) {
      console.error(err);
      showToast("등록 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "추천 사이트 등록하기";
    }
  });

async function loadCommunityLinks() {
  const links = await getEntriesByCategory("community-link");
  links.sort((a, b) => b.createdAt - a.createdAt);

  const el = document.getElementById("communityLinkList");
  if (links.length === 0) {
    el.innerHTML = `<p class="empty-msg">아직 등록된 추천 사이트가 없어요. 첫 사이트를 공유해보세요!</p>`;
    return;
  }
  el.innerHTML = links
    .map(
      (l) => `
      <div class="community-link-item">
        <div class="community-link-body">
          <a href="${escapeAttr(l.url)}" target="_blank" rel="noopener">${escapeHtml(
        l.title
      )}</a>
          ${l.desc ? `<div class="entry-memo">${escapeHtml(l.desc)}</div>` : ""}
          <div class="community-link-meta">
            ${escapeHtml(CATEGORY_LABEL[l.linkCategory] || "기타")} · ${escapeHtml(
        l.nickname
      )} · ${l.date}
          </div>
        </div>
      </div>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || "#").replace(/"/g, "&quot;");
}

loadCommunityLinks();
