import { addEntry } from "./db.js";
import { showToast, todayStr } from "./app.js";
import { PROFILE } from "./profile-data.js";

document.getElementById("heroKicker").textContent = PROFILE.kicker;
document.getElementById("heroName").textContent = PROFILE.name;
document.getElementById("heroDesc").textContent = PROFILE.heroDesc;

document.getElementById("aboutAvatar").textContent = PROFILE.about.avatarEmoji;
const bioParagraphs = Array.isArray(PROFILE.about.bio)
  ? PROFILE.about.bio
  : [PROFILE.about.bio];
document.getElementById("aboutBio").innerHTML = bioParagraphs
  .map((p) => `<p>${escapeHtml(p)}</p>`)
  .join("");
document.getElementById("aboutStats").innerHTML = PROFILE.about.stats
  .map((label) => `<span class="stat-pill">${escapeHtml(label)}</span>`)
  .join("");

document.getElementById("socialGrid").innerHTML = PROFILE.socialLinks
  .map(
    (link) => `
    <a class="social-card" href="${escapeAttr(link.url)}" target="_blank" rel="noopener">
      <span class="emoji">${link.emoji || "🔗"}</span>
      <strong>${escapeHtml(link.title)}</strong>
      <span>${escapeHtml(link.desc || "")}</span>
    </a>`
  )
  .join("");

document.getElementById("productEyebrow").textContent = PROFILE.product.eyebrow;
document.getElementById("productTitle").textContent = PROFILE.product.title;
document.getElementById("productDesc").textContent = PROFILE.product.desc;

document.getElementById("contactDesc").textContent = PROFILE.contact.desc;
const mailtoLink = document.getElementById("contactMailto");
mailtoLink.textContent = PROFILE.contact.email;
mailtoLink.href = `mailto:${PROFILE.contact.email}`;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || "#").replace(/"/g, "&quot;");
}

document.getElementById("waitlistForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("waitlistEmail").value.trim();
  if (!email) return;

  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "저장 중...";
  try {
    await addEntry({
      category: "waitlist",
      date: todayStr(),
      nickname: email,
      memo: "메이크머니 해빗노트 출시 알림 신청",
    });
    showToast("알림 신청 완료! 출시하면 가장 먼저 알려드릴게요 📮");
    e.target.reset();
  } catch (err) {
    console.error(err);
    showToast("저장 중 문제가 발생했어요. 다시 시도해주세요.");
  } finally {
    btn.disabled = false;
    btn.textContent = "출시 알림 받기";
  }
});

document.getElementById("contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("contactName").value.trim();
  const email = document.getElementById("contactEmail").value.trim();
  const message = document.getElementById("contactMessage").value.trim();
  if (!name || !email) return;

  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "보내는 중...";
  try {
    await addEntry({
      category: "inquiry",
      date: todayStr(),
      nickname: name,
      email,
      memo: message,
    });
    showToast("문의가 접수됐어요! 빠르게 확인하고 연락드릴게요 🙏");
    e.target.reset();
  } catch (err) {
    console.error(err);
    showToast("전송 중 문제가 발생했어요. 이메일로 직접 보내주세요.");
  } finally {
    btn.disabled = false;
    btn.textContent = "문의 보내기";
  }
});
