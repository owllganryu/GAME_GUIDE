// =====================
// ユーティリティ
// =====================

/**
 * debounce：連続呼び出しを間引く
 * @param {Function} fn - 遅延させたい関数
 * @param {number}   ms - 待機ミリ秒
 */
function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

// =====================
// isMobile キャッシュ
// matchMedia を毎回評価せず、変化時だけ更新する
// =====================

const _mql = window.matchMedia("(max-width: 1024px)");
let _isMobile = _mql.matches;
_mql.addEventListener("change", e => { _isMobile = e.matches; });

function isMobile() {
    return _isMobile;
}

// =====================
// ゲームカード・フッター著作権の自動生成
// GAMES配列（games.js）からDOMを組み立てる
// =====================

(function renderGames() {
    const list    = document.getElementById("game-list");
    const credits = document.getElementById("footer-credits");

    GAMES.forEach(game => {
        // --- カード <li> ---
        const li = document.createElement("li");
        li.setAttribute("role", "button");
        li.setAttribute("tabindex", "0");
        li.setAttribute("aria-label", `${game.title} の詳細を見る`);
        li.dataset.category   = game.category;
        li.dataset.title      = game.title;
        li.dataset.genre      = game.genre;
        li.dataset.recommend  = game.recommend;
        li.dataset.time       = game.time;
        li.dataset.difficulty = game.difficulty;
        li.dataset.desc       = game.desc;
        li.dataset.video      = game.video;
        li.dataset.bgImgs     = game.bgImgs;

        const img = document.createElement("img");
        img.src = game.img;
        img.alt = `${game.title} パッケージ画像`;
        if (game.lazy) img.loading = "lazy";
        li.appendChild(img);
        list.appendChild(li);

        // --- フッター著作権 <li> ---
        if (game.copyright) {
            const creditLi = document.createElement("li");
            creditLi.innerHTML = game.copyright;
            credits.appendChild(creditLi);
        }
    });
})();



(function sortList() {
    const list = document.querySelector(".list");
    const items = Array.from(list.querySelectorAll("li"));
    items.sort((a, b) =>
        a.dataset.title.localeCompare(b.dataset.title, "ja")
    );
    items.forEach(item => list.appendChild(item));
})();

// =====================
// タブフィルター
// =====================

const tabs  = document.querySelectorAll(".tab li");
// renderGames() の後に取得するため、ここで querySelectorAll する
const items = document.querySelectorAll(".list li");

// 固定状態管理（applyFilter から参照するため早めに宣言）
let pinnedItem  = null;
let hoveredItem = null; // 現在マウスが乗っているカード

function applyFilter() {
    const activeTab = document.querySelector(".tab li.active");
    const target    = activeTab ? activeTab.dataset.tab : "all";
    const query     = (document.getElementById("search-input")?.value || "").trim().toLowerCase();

    items.forEach(item => {
        const matchTab    = target === "all" || item.dataset.category === target;
        const matchSearch = !query || (item.dataset.title || "").toLowerCase().includes(query);
        item.classList.toggle("hide", !(matchTab && matchSearch));
    });

    // フィルター後：固定アイテムが非表示になっていたら固定を解除し、先頭アイテムをデフォルト表示
    if (!isMobile()) {
        if (pinnedItem && pinnedItem.classList.contains("hide")) {
            pinnedItem.classList.remove("is-pinned");
            pinnedItem = null;
        }
        if (!pinnedItem) {
            const visibleTarget = hoveredItem && !hoveredItem.classList.contains("hide")
                ? hoveredItem
                : Array.from(items).find(i => !i.classList.contains("hide"));
            if (visibleTarget) showPanel(visibleTarget);
            else {
                if (panelPlaceholder) panelPlaceholder.hidden = false;
                panelContent.hidden = true;
            }
        }
    }
}

// タブのアクティブ化（クリック・キーボード共通）
function activateTab(tab) {
    if (tab.classList.contains("active")) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }
    tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
        t.setAttribute("tabindex", "-1");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    tab.setAttribute("tabindex", "0");
    applyFilter();
}

tabs.forEach((tab, index) => {
    // クリック
    tab.addEventListener("click", () => activateTab(tab));

    // キーボード：Enter / Space でアクティブ化、← → で隣のタブへ移動
    tab.addEventListener("keydown", (e) => {
        switch (e.key) {
            case "Enter":
            case " ":
                e.preventDefault();
                activateTab(tab);
                break;
            case "ArrowRight": {
                e.preventDefault();
                const next = tabs[(index + 1) % tabs.length];
                next.focus();
                activateTab(next);
                break;
            }
            case "ArrowLeft": {
                e.preventDefault();
                const prev = tabs[(index - 1 + tabs.length) % tabs.length];
                prev.focus();
                activateTab(prev);
                break;
            }
            case "Home":
                e.preventDefault();
                tabs[0].focus();
                activateTab(tabs[0]);
                break;
            case "End":
                e.preventDefault();
                tabs[tabs.length - 1].focus();
                activateTab(tabs[tabs.length - 1]);
                break;
        }
    });
});

// =====================
// 検索バー
// =====================

const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");

// debounce 済みフィルター（150ms：IME確定前の連打を防ぐ）
const debouncedFilter = debounce(applyFilter, 150);

searchInput.addEventListener("input", () => {
    searchClear.classList.toggle("visible", searchInput.value.length > 0);
    debouncedFilter();
});

searchClear.addEventListener("click", () => {
    searchInput.value = "";
    searchClear.classList.remove("visible");
    applyFilter();
    searchInput.focus();
});

// =====================
// PC：マウスオーバーで右パネル更新
// =====================

const panelBg          = document.getElementById("panel-bg");
const panelBgImgA      = document.getElementById("panel-bg-img-a");
const panelBgImgB      = document.getElementById("panel-bg-img-b");
const panelPlaceholder = document.getElementById("panel-placeholder");
const panelContent     = document.getElementById("panel-content");

const elGenre      = document.getElementById("panel-genre");
const elTitle      = document.getElementById("panel-title");
const elDesc       = document.getElementById("panel-desc");
const elTime       = document.getElementById("panel-time");
const elDifficulty = document.getElementById("panel-difficulty");
const elRecommend  = document.getElementById("panel-recommend");

// =====================
// 背景スライドショー管理
// =====================

const SLIDE_INTERVAL = 4000; // 切り替え間隔（ミリ秒）

const bgSlideshow = {
    images:  [],
    current: 0,
    timer:   null,
    front:   panelBgImgA,  // 現在表示中の要素
    back:    panelBgImgB   // 次の画像を準備する要素
};

function startSlideshow(images) {
    stopSlideshow();
    bgSlideshow.images  = images;
    bgSlideshow.current = 0;

    // 最初の画像をすぐに表示
    bgSlideshow.front.src = images[0];
    bgSlideshow.front.classList.add("visible");
    bgSlideshow.back.classList.remove("visible");
    bgSlideshow.back.src = "";

    // 複数枚あればタイマー開始
    if (images.length > 1) {
        bgSlideshow.timer = setInterval(nextBgSlide, SLIDE_INTERVAL);
    }
}

function nextBgSlide() {
    const images = bgSlideshow.images;
    bgSlideshow.current = (bgSlideshow.current + 1) % images.length;

    // back に次の画像をセットしてクロスフェード
    bgSlideshow.back.src = images[bgSlideshow.current];
    bgSlideshow.back.classList.add("visible");
    bgSlideshow.front.classList.remove("visible");

    // front / back を入れ替え
    [bgSlideshow.front, bgSlideshow.back] = [bgSlideshow.back, bgSlideshow.front];
}

function stopSlideshow() {
    clearInterval(bgSlideshow.timer);
    bgSlideshow.timer   = null;
    bgSlideshow.images  = [];
    panelBgImgA.classList.remove("visible");
    panelBgImgB.classList.remove("visible");
    panelBgImgA.src = "";
    panelBgImgB.src = "";
    // front/back をリセット
    bgSlideshow.front = panelBgImgA;
    bgSlideshow.back  = panelBgImgB;
}

function showPanel(item) {
    elGenre.textContent      = item.dataset.genre      || "";
    elTitle.textContent      = item.dataset.title      || "";
    elDesc.textContent       = item.dataset.desc       || "";
    elTime.textContent       = item.dataset.time       || "";
    elDifficulty.textContent = item.dataset.difficulty || "";
    elRecommend.textContent  = item.dataset.recommend  || "";

    // 背景画像スライドショー（data-bg-imgs にカンマ区切りで複数指定可）
    const bgImgsSrc = (item.dataset.bgImgs || "").trim();
    const bgImages  = bgImgsSrc
        ? bgImgsSrc.split(",").map(s => s.trim()).filter(Boolean)
        : [];

    if (bgImages.length > 0) {
        startSlideshow(bgImages);
    } else {
        stopSlideshow();
    }

    if (panelPlaceholder) panelPlaceholder.hidden = false;
    panelContent.hidden = false;

    // アニメーション再実行
    panelContent.style.animation = "none";
    panelContent.offsetHeight; // reflow
    panelContent.style.animation = "";
}

function resetPanel() {
    // 固定中なら何もしない（ホバーアウトでは消さない）
    if (pinnedItem) return;
    if (panelPlaceholder) panelPlaceholder.hidden = false;
    panelContent.hidden = true;
    stopSlideshow();
}

// 固定を解除
function unpinPanel() {
    if (!pinnedItem) return;
    pinnedItem.classList.remove("is-pinned");
    pinnedItem = null;

    if (hoveredItem) {
        showPanel(hoveredItem);
    }
}

// 固定する（同じカードを再クリックで解除）
function pinItem(item) {
    if (pinnedItem === item) {
        unpinPanel();
        return;
    }
    if (pinnedItem) pinnedItem.classList.remove("is-pinned");
    pinnedItem = item;
    item.classList.add("is-pinned");
    showPanel(item);
}

// Escキーで固定解除
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pinnedItem && !isMobile()) {
        unpinPanel();
    }
});

// =====================
// デフォルト表示：ページ読み込み時に最初のアイテムをパネルに表示
// =====================

(function initDefaultPanel() {
    const firstItem = Array.from(items).find(i => !i.classList.contains("hide"));
    if (firstItem && !isMobile()) {
        showPanel(firstItem);
    }
})();

// =====================
// スマホ：タップで全画面モーダル
// =====================

const modal          = document.getElementById("modal");
const modalClose     = document.getElementById("modal-close");
const modalGenre     = document.getElementById("modal-genre");
const modalTitle     = document.getElementById("modal-title");
const modalImg       = document.getElementById("modal-img");
const modalDesc      = document.getElementById("modal-desc");
const modalTime      = document.getElementById("modal-time");
const modalDiff      = document.getElementById("modal-difficulty");
const modalRec       = document.getElementById("modal-recommend");

// モーダルを開いた際に元いた要素を記憶（クローズ後にフォーカスを戻すため）
let lastFocusedItem = null;

// モーダル内でフォーカスを閉じ込めるフォーカストラップ
function trapFocus(e) {
    const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.key === "Tab") {
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    if (e.key === "Escape") {
        closeModal();
    }
}

function openModal(item) {
    lastFocusedItem = item;

    modalGenre.textContent = item.dataset.genre      || "";
    modalTitle.textContent = item.dataset.title      || "";
    modalDesc.textContent  = item.dataset.desc       || "";
    modalTime.textContent  = item.dataset.time       || "";
    modalDiff.textContent  = item.dataset.difficulty || "";
    modalRec.textContent   = item.dataset.recommend  || "";

    const imgSrc = item.querySelector("img")?.src || "";
    modalImg.src = imgSrc;
    modalImg.alt = item.dataset.title ? `${item.dataset.title} パッケージ画像` : "";

    modal.classList.add("open");
    document.body.style.overflow = "hidden";

    modalTitle.setAttribute("tabindex", "-1");
    modalTitle.focus();

    modal.addEventListener("keydown", trapFocus);
}

function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";

    modal.removeEventListener("keydown", trapFocus);

    if (lastFocusedItem) {
        lastFocusedItem.focus();
        lastFocusedItem = null;
    }
}

// =====================
// カードイベント（clickリスナーを1つに統合）
// PC: hover / focus でパネル更新、click で固定
// SP: click でモーダルを開く
// =====================

items.forEach(item => {
    // hover（PC のみ有効）
    item.addEventListener("mouseenter", () => {
        hoveredItem = item;
        if (pinnedItem) return;
        showPanel(item);
    });
    item.addEventListener("mouseleave", () => {
        hoveredItem = null;
    });

    // フォーカス（PC のみパネル更新）
    item.addEventListener("focus", () => {
        if (!isMobile() && !pinnedItem) showPanel(item);
    });
    item.addEventListener("blur", () => {
        if (!isMobile() && !pinnedItem) resetPanel();
    });

    // クリック：PC = 固定 / SP = モーダル（重複リスナーを統合）
    item.addEventListener("click", () => {
        if (isMobile()) openModal(item);
        else pinItem(item);
    });

    // キーボード：Enter / Space でも同様の動作
    item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isMobile()) openModal(item);
            else pinItem(item);
        }
    });
});

// モーダル閉じるボタン
modalClose.addEventListener("click", closeModal);
document.getElementById("modal-close-btn").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

// =====================
// 下スワイプで閉じる（iOSネイティブ風）
// =====================

const sheet      = modal.querySelector(".modal-sheet");
const sheetInner = modal.querySelector(".modal-sheet-inner");
let startY      = 0;
let currentY    = 0;
let isDragging  = false;
let hapticFired = false;

sheet.addEventListener("touchstart", (e) => {
    startY      = e.touches[0].clientY;
    currentY    = startY;
    hapticFired = false;
    isDragging  = false;
    sheet.style.transition = "none";
}, { passive: true });

sheet.addEventListener("touchmove", (e) => {
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0 && sheetInner.scrollTop === 0) {
        isDragging = true;
    }

    if (!isDragging) return;

    sheetInner.scrollTop = 0;
    sheet.style.transform = `translateY(${diff}px)`;

    const progress = Math.min(diff / sheet.offsetHeight, 1);
    modal.style.background = `rgba(0,0,0,${0.55 * (1 - progress)})`;

    const threshold = sheet.offsetHeight * 0.5;
    if (diff > threshold && !hapticFired) {
        navigator.vibrate?.(10);
        hapticFired = true;
    }
}, { passive: true });

sheet.addEventListener("touchend", () => {
    if (!isDragging) return;
    isDragging = false;

    const diff      = currentY - startY;
    const threshold = sheet.offsetHeight * 0.5;

    if (diff > threshold) {
        sheet.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
        sheet.style.transform  = "translateY(100%)";
        modal.style.background = "rgba(0,0,0,0)";
        setTimeout(() => {
            closeModal();
            sheet.style.transition = "";
            sheet.style.transform  = "";
            modal.style.background = "";
        }, 300);
    } else {
        sheet.style.transition = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
        sheet.style.transform  = "";
        modal.style.background = "";
        sheet.addEventListener("transitionend", () => {
            sheet.style.transition = "";
        }, { once: true });
    }
});

// =====================
// スクロールで検索＋タブをfixed固定（PC・スマホ共通）
// =====================

(function () {
    const tabList   = document.querySelector(".tab");
    const searchBar = document.getElementById("search-bar");
    const headerImg = document.querySelector(".header-img");
    const panelArea = document.querySelector(".panel-area");

    let stickyThreshold = null;

    function handleScroll() {
        if (stickyThreshold === null) {
            if (isMobile()) {
                stickyThreshold = headerImg.offsetHeight;
            } else {
                stickyThreshold = headerImg.offsetHeight
                    - tabList.offsetHeight
                    - searchBar.offsetHeight;
            }
        }

        const scrollY   = window.scrollY || window.pageYOffset;
        const shouldFix = scrollY >= Math.max(0, stickyThreshold);
        const isFixed   = tabList.classList.contains("is-fixed");

        if (shouldFix && !isFixed) {
            const searchH = searchBar.offsetHeight;
            const fixedH  = searchH + tabList.offsetHeight;

            searchBar.classList.add("is-fixed");
            tabList.classList.add("is-fixed");
            tabList.style.top = searchH + "px";

            if (!isMobile() && panelArea) {
                panelArea.style.top    = fixedH + "px";
                panelArea.style.height = `calc(100vh - ${fixedH}px)`;
            }
        } else if (!shouldFix && isFixed) {
            searchBar.classList.remove("is-fixed");
            tabList.classList.remove("is-fixed");
            tabList.style.top = "";

            if (!isMobile() && panelArea) {
                panelArea.style.top    = "";
                panelArea.style.height = "";
            }
        }
    }

    // resize に debounce（200ms）を追加し、高頻度再計算を抑制
    window.addEventListener("resize", debounce(() => {
        stickyThreshold = null;
        handleScroll();
    }, 200));

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
})();
