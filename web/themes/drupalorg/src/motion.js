import { animate, inView, scroll, stagger } from "motion";

const animatableElements = document.querySelectorAll("[data-animation]");

// Define animation transforms for each type
const animationTransforms = {
  fade_up: ["translateY(100px)", "translateY(0px)"],
  fade_down: ["translateY(-100px)", "translateY(0px)"],
  fade_left: ["translateX(100px)", "translateX(0px)"],
  fade_right: ["translateX(-100px)", "translateX(0px)"],
};

inView(
  animatableElements,
  (element) => {
    const animationType = element.dataset.animation || "fade_up";
    const transform = animationTransforms[animationType] || animationTransforms.fade_up;

    // Get delay and duration from data attributes (in milliseconds), convert to seconds
    const delay = (parseFloat(element.dataset.delay) || 0) / 1000;
    const duration = (parseFloat(element.dataset.duration) || 300) / 1000;

    animate(
      element,
      {
        opacity: 1,
        transform: transform,
      },
      {
        delay: delay,
        duration: duration,
        ease: "easeOut",
      },
    );
  },
  { amount: 1 },
);

// Logo ticker: horizontal autoscroll that slows on hover.
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll(".ticker").forEach((ticker) => {
  const viewport = ticker.querySelector(".ticker__viewport");
  const track = ticker.querySelector(".ticker__track");

  if (!viewport || !track || track.children.length === 0 || prefersReducedMotion) {
    return;
  }

  const originalItems = Array.from(track.children);
  const oneSetWidth = track.getBoundingClientRect().width;
  const viewportWidth = viewport.getBoundingClientRect().width;

  // Repeat the set enough times that the row always overflows the viewport, so
  // scrolling by exactly one set never reveals a gap.
  const sets = oneSetWidth > 0 ? Math.ceil(viewportWidth / oneSetWidth) + 2 : 3;
  for (let copy = 1; copy < sets; copy++) {
    originalItems.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });
  }

  const shift = 100 / sets;

  const controls = animate(
    track,
    { transform: ["translateX(0)", `translateX(-${shift}%)`] },
    { duration: originalItems.length * 4, ease: "linear", repeat: Infinity },
  );

  ticker.addEventListener("mouseenter", () => {
    controls.speed = 0.15;
  });

  ticker.addEventListener("mouseleave", () => {
    controls.speed = 1;
  });
});

// Stat counter: count up to target value when scrolled into view.
function formatCounter(val, target) {
  if (target >= 1_000_000) {
    return (val / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  }
  if (target >= 1_000) {
    return (val / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return Math.round(val).toString();
}

document.querySelectorAll("[data-counter]").forEach((el) => {
  const target = parseInt(el.dataset.counter, 10);
  if (isNaN(target)) return;

  const numberEl = el.querySelector(".stat-counter__number");
  const srEl = el.querySelector(".sr-only");
  if (!numberEl || !srEl) return;

  const prefix = (el.querySelector(".stat-counter__prefix") || { textContent: "" }).textContent;
  const suffix = (el.querySelector(".stat-counter__suffix") || { textContent: "" }).textContent;
  const formatted = formatCounter(target, target);

  srEl.textContent = prefix + formatted + suffix;

  if (prefersReducedMotion) {
    numberEl.textContent = formatted;
    return;
  }

  inView(
    el,
    () => {
      animate(0, target, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate: (latest) => {
          numberEl.textContent = formatCounter(latest, target);
        },
        onComplete: () => {
          numberEl.textContent = formatCounter(target, target);
        },
      });
    },
    { amount: 0.5, once: true },
  );
});

document.querySelectorAll("[data-stagger-items]").forEach((stagger_container) => {
  const items = Array.from(stagger_container.children);
  if (items.length === 0) return;
  
  // Set initial hidden state
  items.forEach((item) => {
    item.style.opacity = "0";
    item.style.transform = "translateY(20px)";
  });
  
  inView(
    stagger_container,
    () => {
      animate(
        items,
        { opacity: 1, transform: "translateY(0)" },
        { duration: 0.5, delay: stagger(0.15), ease: "easeOut" },
      );
    },
    { amount: 0.2, once: true },
  );
});

document.querySelectorAll("[data-scroll-stack]").forEach((el) => {
  // Below md, the grid is single-column — let cards flow naturally instead.
  if (window.innerWidth < 768) return;

  const header = el.querySelector(".scroll-stack__header");
  const item_wrapper = el.querySelector(".stack-items");
  if (!item_wrapper || !header) return;

  const items = Array.from(item_wrapper.children);
  if (items.length === 0) return;

  // First card is visible immediately; each subsequent card needs one viewport of scroll.
  el.style.height = `${items.length * 100}vh`;

  header.style.position = "sticky";
  header.style.top = "0";
  header.style.height = "100vh";
  header.style.display = "flex";
  header.style.alignItems = "center";

  // Stack items becomes a sticky full-viewport container; cards are absolutely
  // positioned inside it so they can stack on top of each other.
  item_wrapper.style.position = "sticky";
  item_wrapper.style.top = "0";
  item_wrapper.style.height = "100vh";
  item_wrapper.style.overflow = "hidden";

  // Read all heights before touching the layout — making earlier items absolute
  // removes them from grid flow and corrupts later items' offsetHeight.
  const cardHeights = items.map((item) => item.offsetHeight);

  items.forEach((item, index) => {
    item.style.position = "absolute";
    item.style.left = "0";
    item.style.right = "0";
    item.style.top = `calc(50vh - ${cardHeights[index] / 2}px)`;
    item.style.zIndex = index + 1;
    // First card is visible immediately as a scroll hint; the rest start off-screen below.
    item.style.transform = index === 0 ? "translateY(0)" : "translateY(100vh)";
    item.classList.remove("transition", "duration-500", "ease-out");
  });

  // Slide cards 1+ up from below during their scroll segment; lock in place once arrived.
  const scrollItems = items.slice(1);
  scroll(
    (progress) => {
      const segmentSize = 1 / scrollItems.length;
      scrollItems.forEach((item, index) => {
        const segmentStart = index * segmentSize;
        const segmentEnd = segmentStart + segmentSize;
        if (progress < segmentStart) {
          item.style.transform = "translateY(100vh)";
        } else if (progress >= segmentEnd) {
          item.style.transform = "translateY(0)";
        } else {
          const itemProgress = Math.min(1, (progress - segmentStart) / segmentSize);
          item.style.transform = `translateY(${(1 - itemProgress) * 100}vh)`;
        }
      });
    },
    { target: el, offset: ["start start", "end end"] },
  );
});

document.querySelectorAll('[data-reveal="center_spread"]').forEach((el) => {
  const children = Array.from(el.children);
  if (children.length === 0) return;

  const middleIndex = Math.floor(children.length / 2);

  // Measure natural positions before applying any transforms.
  const containerRect = el.getBoundingClientRect();
  const containerCenter = containerRect.left + containerRect.width / 2;
  const offsets = children.map((child) => {
    const rect = child.getBoundingClientRect();
    return containerCenter - (rect.left + rect.width / 2);
  });

  // Stack all items at the container centre; middle item sits on top.
  children.forEach((child, index) => {
    child.style.zIndex = String(children.length - Math.abs(index - middleIndex));
    child.style.transform = `translateX(${offsets[index]}px)`;

    child.classList.remove("transition", "duration-500", "ease-out");

    if (index === middleIndex) return

    child.style.scale = "0.6"
  });

  // Spread driven by scroll: starts when container enters the viewport from below,
  // finishes when the container is fully in view.
  scroll(
    (progress) => {
      children.forEach((child, index) => {
        child.style.transform = `translateX(${offsets[index] * (1 - progress)}px)`;
        child.style.scale = index === middleIndex ? "1" : String(0.6 + 0.4 * progress);
      });
    },
    { target: el, offset: ["start end", "end end"] },
  );
});