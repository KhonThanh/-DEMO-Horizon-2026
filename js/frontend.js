// ----------- Vùng chức năng -------------
// 🧩 1️⃣ Include HTML Components
function includeHTML(callback) {
  const elements = document.querySelectorAll("[data-include]");
  if (!elements.length) {
    if (callback) callback();
    return;
  }

  let loaded = 0;

  Promise.all([...elements].map(async (el) => {
    const file = el.getAttribute("data-include");
    if (!file) return;

    const cacheKey = `comp-${file}`;
    let html = sessionStorage.getItem(cacheKey);

    if (!html) {
      const res = await fetch(`${file}?v=${Date.now()}`, { cache: "no-store" });
      html = await res.text();
      sessionStorage.setItem(cacheKey, html);
    }

    el.innerHTML = html;
    if (typeof initResponsive === "function") initResponsive(el);

    if (++loaded === elements.length) {
      document.dispatchEvent(new Event("includesLoaded"));
      if (callback) callback();
    }
  }));
}

// js thêm active
function initToggleSystem(configs = []) {
  if (!window._toggleSystemState) {
    window._toggleSystemState = { docKeys: new Set(), keyKeys: new Set() };
  }
  const state = window._toggleSystemState;

  configs.forEach((cfg, cfgIndex) => {
    if (!cfg || !cfg.trigger) return;

    const activeClass = cfg.activeClass || "active";
    const behavior = cfg.behavior || "toggle";
    const closeOnOutside = !!cfg.closeOnOutside;
    const closeOnEsc = !!cfg.closeOnEsc;
    const overlayCloses = !!cfg.overlayCloses;
    const innerSelector = cfg.innerSelector || null;
    const closeBtnSelector = cfg.closeBtn || null;
    const groupSelector = cfg.groupSelector || null;

    const triggers = Array.from(document.querySelectorAll(cfg.trigger));
    if (!triggers.length) return;

    const targets = cfg.target ? Array.from(document.querySelectorAll(cfg.target)) : [];

    const closeAll = () => {
      targets.forEach(t => t.classList.remove(activeClass));
      triggers.forEach(t => t.classList.remove(activeClass));
    };

    // bind sự kiện click cho từng trigger (chỉ bind 1 lần)
    triggers.forEach((trigger, idx) => {
      if (trigger.dataset._toggleBound === "true") return;
      trigger.dataset._toggleBound = "true";

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();

        // Tìm target element ứng với trigger (nếu có)
        let targetEl = null;
        if (cfg.target) {
          if (trigger.dataset && trigger.dataset.target) {
            targetEl = document.querySelector(trigger.dataset.target);
          } else {
            targetEl = targets[idx] || targets[0] || null;
          }
        }

        // ---- behavior activate (tab-like) ----
        if (behavior === "activate") {
          if (groupSelector) {
            document.querySelectorAll(groupSelector).forEach(el => el.classList.remove(activeClass));
          } else {
            triggers.forEach(t => t.classList.remove(activeClass));
          }
          trigger.classList.add(activeClass);

          if (targets.length > 0 && targetEl) {
            targets.forEach(t => t.classList.remove(activeClass));
            targetEl.classList.add(activeClass);
          }
        }

        // ---- toggle mode ----
        else {
          if (targetEl) targetEl.classList.toggle(activeClass);
          else trigger.classList.toggle(activeClass);
        }

        // callback onToggle (nếu có)
        if (typeof cfg.onToggle === "function") {
          try { cfg.onToggle(trigger, idx); } catch (err) { /* ignore */ }
        }

        // -> GỌI onActiveChange bất kể có target hay không
        if (typeof cfg.onActiveChange === "function") {
          const isActive = targetEl ? targetEl.classList.contains(activeClass) : trigger.classList.contains(activeClass);
          try { cfg.onActiveChange(isActive, trigger, targetEl, idx); } catch (err) { /* ignore */ }
        }
      });
    });

    // bind nút đóng (nhiều selector)
    if (closeBtnSelector) {
      Array.from(document.querySelectorAll(closeBtnSelector)).forEach(btn => {
        if (btn.dataset._toggleCloseBound === "true") return;
        btn.dataset._toggleCloseBound = "true";
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeAll();
        });
      });
    }

    // click outside để đóng
    if (closeOnOutside) {
      const docKey = `doc_${cfg.trigger}|${cfg.target || ""}|${cfgIndex}`;
      if (!state.docKeys.has(docKey)) {
        state.docKeys.add(docKey);
        document.addEventListener("click", (e) => {
          const currTriggers = Array.from(document.querySelectorAll(cfg.trigger));
          const currTargets = cfg.target ? Array.from(document.querySelectorAll(cfg.target)) : [];

          const clickedOnTrigger = currTriggers.some(t => t.contains(e.target));
          const clickedOnOverlay = overlayCloses && currTargets.some(t => e.target === t);

          const clickedInsideTarget = currTargets.some(t => {
            const inner = innerSelector ? t.querySelector(innerSelector) : t;
            return inner && inner.contains(e.target);
          });

          if (clickedOnOverlay) {
            currTargets.forEach(t => t.classList.remove(activeClass));
            currTriggers.forEach(t => t.classList.remove(activeClass));
            return;
          }

          if (!clickedInsideTarget && !clickedOnTrigger) {
            currTargets.forEach(t => t.classList.remove(activeClass));
            currTriggers.forEach(t => t.classList.remove(activeClass));
          }
        });
      }
    }

    // ESC để đóng
    if (closeOnEsc) {
      const escKey = `esc_${cfg.trigger}|${cfg.target || ""}|${cfgIndex}`;
      if (!state.keyKeys.has(escKey)) {
        state.keyKeys.add(escKey);
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            const currTargets = cfg.target ? Array.from(document.querySelectorAll(cfg.target)) : [];
            const currTriggers = Array.from(document.querySelectorAll(cfg.trigger));
            currTargets.forEach(t => t.classList.remove(activeClass));
            currTriggers.forEach(t => t.classList.remove(activeClass));
          }
        });
      }
    }

    // === gọi onActiveChange cho trạng thái ban đầu (nếu có active sẵn trong DOM) ===
    if (typeof cfg.onActiveChange === "function") {
      // delay một tick để đảm bảo các class có sẵn đã gán xong (nếu include động)
      setTimeout(() => {
        Array.from(document.querySelectorAll(cfg.trigger)).forEach((tr, i) => {
          const targetEl = cfg.target ? (document.querySelectorAll(cfg.target)[i] || document.querySelectorAll(cfg.target)[0]) : null;
          const isActive = targetEl ? targetEl.classList.contains(activeClass) : tr.classList.contains(activeClass);
          if (isActive) {
            try { cfg.onActiveChange(true, tr, targetEl, i); } catch (err) { }
          }
        });
      }, 0);
    }
  });
}

// 🖼️ 2️⃣ Lazy Load + Set Dimensions
function applyImageEnhancements(root = document) {
  root.querySelectorAll("img").forEach(img => {
    // Lazy load
    if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");

    // Alt text
    if (!img.hasAttribute("alt") || img.alt.trim() === "") {
      const fileName = img.src.split("/").pop().split(".")[0] || "image";
      img.setAttribute("alt", fileName.replace(/[-_]/g, " "));
    }

    // Hàm set kích thước an toàn
    const setDim = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        if (!img.hasAttribute("width")) img.setAttribute("width", img.naturalWidth);
        if (!img.hasAttribute("height")) img.setAttribute("height", img.naturalHeight);
      }
    };

    // Nếu ảnh đã load sẵn (cache hoặc render sớm)
    if (img.complete) setTimeout(setDim, 50);
    else img.addEventListener("load", setDim);

    // Chỉ xử lý khi xuất hiện trong viewport
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setDim();
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: "200px 0px" });
    io.observe(img);
  });
}

// ✨ 3️⃣ Scroll Reveal Effect
function initRevealEffect() {
  const sections = document.querySelectorAll("section, footer");
  if (!sections.length) return;

  sections.forEach(sec => sec.classList.add("hidden-section"));

  let revealIndex = 0;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.style.transitionDelay = `${revealIndex * 20}ms`;
        revealIndex++;
        el.classList.add("show-up");
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -10% 0px" });

  sections.forEach(sec => observer.observe(sec));
}

// 🧩 1️⃣ Hàm dùng chung cho tất cả slick
function initSlickSlider({
  mainSelector,
  navSelector = null,
  minSlides = 0,
  mainOptions = {},
  navOptions = {},
  prevBtnSelector = null,
  nextBtnSelector = null
}) {
  const $main = $(mainSelector);
  if (!$main.length) return;

  // --- Helper: clone thêm slide nếu ít hơn minSlides ---
  const ensureMinSlides = ($el, minCount) => {
    const $items = $el.children();
    let count = $items.length;
    let i = 0;
    while (count < minCount) {
      $el.append($items.eq(i % $items.length).clone());
      count++;
      i++;
    }
  };

  // --- Có nav → slider kép ---
  if (navSelector) {
    const $nav = $(navSelector);
    if (!$nav.length) return;

    if (minSlides > 0) ensureMinSlides($nav, minSlides);

    if (!$main.hasClass("slick-initialized")) {
      $main.slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        fade: true,
        infinite: true,
        arrows: false,
        asNavFor: navSelector,
        ...mainOptions
      });
    }

    if (!$nav.hasClass("slick-initialized")) {
      $nav.slick({
        slidesToShow: 8,
        slidesToScroll: 1,
        focusOnSelect: true,
        infinite: true,
        arrows: false,
        centerMode: true,
        centerPadding: "0px",
        asNavFor: mainSelector,
        ...navOptions
      });
    }

    // --- Nút prev/next riêng (nếu có) ---
    if (prevBtnSelector) {
      const prevBtn = document.querySelector(prevBtnSelector);
      if (prevBtn) prevBtn.addEventListener("click", () => $main.slick("slickPrev"));
    }

    if (nextBtnSelector) {
      const nextBtn = document.querySelector(nextBtnSelector);
      if (nextBtn) nextBtn.addEventListener("click", () => $main.slick("slickNext"));
    }
  }

  // --- Không có nav → slider đơn ---
  else {
    if (minSlides > 0) ensureMinSlides($main, minSlides);

    if (!$main.hasClass("slick-initialized")) {
      $main.slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: true,
        infinite: true,
        ...mainOptions
      });
    }

    if (prevBtnSelector) {
      const prevBtn = document.querySelector(prevBtnSelector);
      if (prevBtn) prevBtn.addEventListener("click", () => $main.slick("slickPrev"));
    }

    if (nextBtnSelector) {
      const nextBtn = document.querySelector(nextBtnSelector);
      if (nextBtn) nextBtn.addEventListener("click", () => $main.slick("slickNext"));
    }
  }
}

// HÀM 1: QUÉT NỘI DUNG, GẮN ID VÀ LẤY DATA
// Gộp 2 tính năng: Quét 1 vùng cụ thể HOẶC quét toàn bộ web ("all")
function extractHeadingData(contentSelector, headingTags = "h1, h2, h3, h4, h5, h6") {
  const content = contentSelector === "all" ? document : document.querySelector(contentSelector);
  
  if (!content) {
      console.warn(`Không tìm thấy vùng quét: ${contentSelector}`);
      return [];
  }

  const headings = content.querySelectorAll(headingTags);
  if (!headings.length) return [];

  const toSlug = str => str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .toLowerCase();

  const data = [];

  headings.forEach((h, i) => {
    const text = h.textContent.trim();
    
    let id = h.id || toSlug(text) || `heading-${i}`;

    if (document.getElementById(id) && document.getElementById(id) !== h) {
        let baseId = id;
        let counter = 1;
        while (document.getElementById(`${baseId}-${counter}`) && document.getElementById(`${baseId}-${counter}`) !== h) {
            counter++;
        }
        id = `${baseId}-${counter}`;
    }

    h.id = id; 
    data.push({ 
        id: id, 
        text: text,
        tag: h.tagName.toLowerCase() 
    });
  });

  return data;
}

// HÀM 2: NHÂN BẢN TEMPLATE VÀ ĐỔ DỮ LIỆU
function renderDynamicList(headingData, targetSelector) {
  if (!headingData || headingData.length === 0) return;

  const targetContainer = document.querySelector(targetSelector);
  if (!targetContainer) {
    console.log('Không tìm thấy menu');
    return;
  }

  const template = targetContainer.firstElementChild;
  if (!template) {
    console.warn(`Vui lòng để lại 1 thẻ con trong ${targetSelector} để làm mẫu!`);
    return;
  }

  targetContainer.innerHTML = "";

  headingData.forEach(item => {
    const clone = template.cloneNode(true);
    const aTag = clone.querySelector("a");

    if (aTag) {
      aTag.href = `#${item.id}`;
      let rawText = item.text; 
      let formattedText = rawText.charAt(0).toUpperCase() + rawText.slice(1).toLowerCase();
      aTag.textContent = formattedText; 

      aTag.addEventListener("click", e => {
        e.preventDefault();
        const targetSection = document.getElementById(item.id);

        if (targetSection) {
          const headerHeight = 300; 
          const elementPosition = targetSection.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      });
    }

    targetContainer.appendChild(clone);
  });
}

// js bật tắt menu
function toggleMenu(buttonSelector, menuSelector) {
  const button = document.querySelector(buttonSelector);
  const menu = document.querySelector(menuSelector);

  if (!button || !menu) return;

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !button.contains(e.target)) {
      menu.classList.remove('active');
    }
  });
}

// js roll to top
function initScrollToTop(btnId = "btnToTop", showOffset = 1000) {
  const scrollBtn = document.getElementById(btnId);
  if (!scrollBtn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > showOffset) {
      scrollBtn.classList.add("show");
    } else {
      scrollBtn.classList.remove("show");
    }
  });

  scrollBtn.addEventListener("click", () => {
    window.scroll({
      top: 0,
      behavior: "smooth",
    });
  });
}

// js validate form
function validateField(input) {
  const group = input.closest(".form-group");
  const error = group?.querySelector(".error-msg");
  let message = "";

  const value = input.value.trim();

  if (input.hasAttribute("required") && !value) {
    message = input.dataset.msg || "Vui lòng không để trống";
  }

  if (!message && input.type === "email" && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) message = "Email không hợp lệ";
  }

  if (!message && input.hasAttribute("minlength")) {
    const min = +input.getAttribute("minlength");
    if (value.length < min) {
      message = input.dataset.msg || `Tối thiểu ${min} ký tự`;
    }
  }

  if (!message && input.tagName === "SELECT" && input.required) {
    if (!input.value) message = "Vui lòng chọn một giá trị";
  }

  if (!message && input.type === "checkbox" && input.required) {
    if (!input.checked) message = "Vui lòng xác nhận";
  }

  if (!message && input.pattern && input.value) {
    const regex = new RegExp(input.pattern);
    if (!regex.test(input.value)) {
      message = input.dataset.msg || "Giá trị không hợp lệ";
    }
  }

  if (group) group.classList.toggle("error", !!message);
  if (error) error.textContent = message;

  return !message;
}

function validateForm(form) {
  let isValid = true;
  form.querySelectorAll("input, textarea").forEach(input => {
    if (!validateField(input)) isValid = false;
  });
  return isValid;
}

function initFormValidation(root = document) {
  root.querySelectorAll(".js-validate-form").forEach(form => {
    if (form.dataset._validated) return;
    form.dataset._validated = "true";

    form.querySelectorAll("input, textarea").forEach(input => {
      input.addEventListener("input", () => validateField(input));
    });

    form.addEventListener("submit", e => {
      if (!validateForm(form)) e.preventDefault();
    });
  });
}

// js đổ active vào menu
function initUniversalActiveMenu(menuSelector = '', activeClassName = 'active') {
    const currentUrl = window.location.href.split(/[?#]/)[0];

    const menuLinks = document.querySelectorAll(`${menuSelector} a`);
    let bestMatch = null;
    let longestMatchLength = 0;

    menuLinks.forEach(link => {
        const hrefAttr = link.getAttribute('href');
        if (!hrefAttr || hrefAttr.startsWith('#') || hrefAttr.startsWith('javascript')) return;
        const linkUrl = link.href.split(/[?#]/)[0];
        if (currentUrl === linkUrl) {
            bestMatch = link;
            longestMatchLength = linkUrl.length;
        } 
        else if (currentUrl.startsWith(linkUrl)) {
            const isHomePage = linkUrl.endsWith('/') || linkUrl.endsWith('index.html') || linkUrl.endsWith('/en') || linkUrl.endsWith('/kn');
            
            if (!isHomePage && linkUrl.length > longestMatchLength) {
                bestMatch = link;
                longestMatchLength = linkUrl.length;
            }
        }
    });
    if (bestMatch) {
        bestMatch.classList.add(activeClassName);
        const parentMenu = bestMatch.closest(menuSelector);
        if (parentMenu) parentMenu.classList.add(activeClassName);
    } else {
        const homeLink = Array.from(menuLinks).find(link => {
            const lUrl = link.href.split(/[?#]/)[0];
            return lUrl.endsWith('/') || lUrl.endsWith('index.html') || lUrl.endsWith('/en') || lUrl.endsWith('/kn');
        });
        
        if (homeLink) {
            homeLink.classList.add(activeClassName);
            const parentMenu = homeLink.closest(menuSelector);
            if (parentMenu) parentMenu.classList.add(activeClassName);
        }
    }
}

// Chạy hàm khi trang web tải xong
document.addEventListener("DOMContentLoaded", () => {
    initUniversalActiveMenu('.menu-container__item', 'active'); 
});

// ----------- Vùng gọi biến --------------
document.addEventListener("DOMContentLoaded", () => {
  includeHTML(() => {
    // 🟢 Slide banner chính
    initSlickSlider({
      mainSelector: '.slide-container',
      minSlides: 3,
      mainOptions: {
        infinite: true,
        autoplay: true,
        dots: true,
        arrows: false,
        slidesToShow: 1,
        slidesToScroll: 1,
        fade: false,
        appendDots: $('.custom-dots')
      }
    });
    initSlickSlider({
      mainSelector: '.service-list',
      minSlides: 8,
      mainOptions: {
        infinite: true,
        autoplay: false,
        dots: false,
        arrows: true,
        slidesToShow: 4,
        slidesToScroll: 1,
        fade: false,
        responsive: [
          {
            breakpoint: 1025,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 1,
            }
          },
          {
            breakpoint: 769,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 1,
            }
          },
          {
            breakpoint: 481,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1,
            }
          },
        ]
      }
    });
    initSlickSlider({
      mainSelector: '.news-list',
      minSlides: 6,
      mainOptions: {
        infinite: true,
        autoplay: false,
        dots: false,
        arrows: true,
        slidesToShow: 3,
        slidesToScroll: 1,
        fade: false,
        responsive: [
          {
            breakpoint: 1025,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 1,
            }
          },
          {
            breakpoint: 769,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 1,
            }
          },
          {
            breakpoint: 481,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1,
            }
          },
        ]
      }
    });
    initSlickSlider({
      mainSelector: '.partners-list',
      minSlides: 12,
      mainOptions: {
        infinite: true,
        autoplay: false,
        dots: false,
        arrows: true,
        slidesToShow: 6,
        slidesToScroll: 1,
        fade: false,
        responsive: [
          {
            breakpoint: 1025,
            settings: {
              slidesToShow: 5,
              slidesToScroll: 1,
            }
          },
          {
            breakpoint: 769,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 1,
            }
          },
          {
            breakpoint: 481,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 1,
            }
          },
        ]
      }
    });

    initToggleSystem([
      {
        trigger: ".pagination-btn__custom.page-num",
        behavior: "activate",
        activeClass: "active",
      },
      {
        trigger: ".header-bottom .menu-container__bar",
        target: ".m-menu",
        behavior: "toggle",
        activeClass: "active",
        closeOnOutside: true,
        closeOnEsc: true,
      },
      {
        trigger: ".news-detail__content h3",
        behavior: "activate",
        activeClass: "active",
        onToggle: (trigger) => {
          document.querySelectorAll(".news-detail__content h3").forEach(h => h.classList.remove("active"));
          trigger.classList.add("active");
        }
      },
    ]);
    // 🟡 roll to the top
    initScrollToTop();
    // ✨ 4️⃣ HIỆU ỨNG ẢNH & REVEAL
    applyImageEnhancements();
    initRevealEffect();
    initUniversalActiveMenu('.menu-container__item', 'active');
    // validateField('.js-validate-form');
  });
});

document.addEventListener("includesLoaded", () => {
  extractHeadingData("all");
  extractHeadingData(".intro-container", "h1, h2")
  const introData = extractHeadingData(".intro-container", "h1, h2");
  console.log(introData);
  renderDynamicList(introData, "#intro-menu-desktop");
});

// 🔁 Cập nhật khi include hoặc slick load lại
document.addEventListener("includesLoaded", () => applyImageEnhancements());
$(document).on("init reInit afterChange", ".slick-slider", function () {
  applyImageEnhancements(this);
});
