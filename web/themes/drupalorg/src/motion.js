import { animate, inView, scroll, stagger, cubicBezier } from "motion";
import currentlyInCanvasEditor from "../lib/currentlyInCanvasEditor.js";

const animatableElements = document.querySelectorAll("[data-animation]");

// Define animation transforms for each type.
const animationTransforms = {
  fade_up: ["translateY(100px)", "translateY(0px)"],
  fade_down: ["translateY(-100px)", "translateY(0px)"],
  fade_left: ["translateX(100px)", "translateX(0px)"],
  fade_right: ["translateX(-100px)", "translateX(0px)"],
};

// Firefox can fire inView's onStart twice for the same element (see the stagger
// block), which cancels and replays the in-flight animation. Track handled elements.
const animatedElements = new WeakSet();

inView(
  animatableElements,
  (element) => {
    if (animatedElements.has(element)) return;
    animatedElements.add(element);

    const animationType = element.dataset.animation || "fade_up";
    const transform = animationTransforms[animationType] || animationTransforms.fade_up;

    // Get delay and duration from data attributes (in milliseconds), convert to seconds.
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

  // Measure one set as the sum of item widths.
  const originalItems = Array.from(track.children);
  const measureSet = () => originalItems.reduce((width, item) => width + item.getBoundingClientRect().width, 0);
  const oneSetWidth = measureSet();
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

  // Get the track width and keep it in sync on resize.
  const sizeTrack = () => {
    track.style.width = `${measureSet() * sets}px`;
  };
  sizeTrack();
  new ResizeObserver(sizeTrack).observe(viewport);

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

// `once` guards against duplicate library execution re-running the count-up (see
// the stagger block below for details).
once("stat-counter", "[data-counter]").forEach((el) => {
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

  // Guard against Firefox firing inView's onStart twice (see the stagger block),
  // which would restart the count-up from zero.
  let counted = false;
  inView(
    el,
    () => {
      if (counted) return;
      counted = true;
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
    { amount: 0.5 },
  );
});

// Use Drupal's `once` (a declared dependency of this library) so each container is
// initialised a single time. Without it, if the motion library is attached/executed
// more than once — which Firefox was doing here — the setup below re-hides the items
// (opacity 0) and registers a second observer, replaying the stagger. A per-closure
// flag can't prevent that because each execution gets its own closure.
once("stagger-items", "[data-stagger-items]").forEach((stagger_container) => {
  const items = Array.from(stagger_container.children);
  if (items.length === 0) return;

  // Set initial hidden state
  items.forEach((item) => {
    item.style.opacity = "0";
    item.style.transform = "translateY(20px)";
    item.classList.remove("transition", "duration-500", "ease-out");
  });

  // Firefox's IntersectionObserver can deliver two entries for the same target in
  // one callback batch, so inView runs this onStart twice before it can unobserve.
  // The second run cancels the in-flight WAAPI animation — reverting items to their
  // inline opacity:0 (a visible flicker) before replaying. Guard so it plays once.
  let played = false;
  inView(
    stagger_container,
    () => {
      if (played) return;
      played = true;

      const duration = 0.5;
      const staggerDelay = 0.15;
      animate(items, { opacity: 1, transform: "translateY(0)" }, { duration, delay: stagger(staggerDelay), ease: "easeOut" });

      // motion's group `.finished` can resolve before the last item's stagger delay
      // has played out, so restoring `transition` mid-flight flickers that item.
      // Wait the real total (last item's delay + duration) plus a small buffer.
      const totalMs = (duration + (items.length - 1) * staggerDelay) * 1000 + 50;
      setTimeout(() => {
        items.forEach((item) => {
          item.style.opacity = "1";
          item.style.transform = "translateY(0)";
          item.classList.add("transition", "duration-500", "ease-out");
        });
      }, totalMs);
    },
    { amount: 0.2 },
  );
});

document.querySelectorAll("[data-scroll-stack]").forEach((el) => {
  // In the Canvas editor, skip the scroll-driven effect entirely. Otherwise the
  // persistent scroll() subscription below keeps re-writing each card's inline
  // transform on every scroll, and cleanup in the component JS can't cancel it.
  if (currentlyInCanvasEditor()) return;

  // Below md, the grid is single-column — let cards flow naturally instead.
  if (window.innerWidth < 768) return;

  const header = el.querySelector(".scroll-stack__header");
  const item_wrapper = el.querySelector(".stack-items");
  if (!item_wrapper || !header) return;

  const items = Array.from(item_wrapper.children);
  if (items.length === 0) return;

  // First card is visible immediately; each subsequent card needs one viewport of scroll.
  el.style.height = `${items.length * 100}vh`;

  // Heading pinned to the top of the viewport while the cards scroll beneath it.
  header.style.position = "sticky";
  header.style.top = "0";
  header.style.zIndex = "50";
  const headerHeight = header.offsetHeight;

  // Stack items becomes a sticky full-viewport container; cards are absolutely
  // positioned inside it so they can stack on top of each other. Pull it up under
  // the sticky header so cards centre in the viewport rather than below the header.
  item_wrapper.style.position = "sticky";
  item_wrapper.style.top = "0";
  item_wrapper.style.height = "100vh";
  item_wrapper.style.marginTop = `-${headerHeight}px`;
  item_wrapper.style.overflow = "hidden";

  // Read all heights before touching the layout — making earlier items absolute
  // removes them from grid flow and corrupts later items' offsetHeight.
  const cardHeights = items.map((item) => item.offsetHeight);

  items.forEach((item, index) => {
    item.style.position = "absolute";
    item.style.left = "0";
    item.style.right = "0";
    item.style.marginInline = "auto";
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
  if (currentlyInCanvasEditor()) return;
  if (window.innerWidth < 768) return;
  
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

    if (index === middleIndex) return;

    child.style.scale = "0.6";
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

// Hero gallery: the first card fills the viewport then shrinks into the centre
// cell, while the remaining cards fade + scale into the grid around it from the
// centre outward. The static centred grid is pure CSS, so this only runs the
// enhancement.
document.querySelectorAll("[data-gallery-reveal]").forEach((el) => {
  // Skip in the Canvas editor — a persistent scroll() subscription would keep
  // re-writing inline styles the component JS can't cancel (matches scroll-stack).
  if (currentlyInCanvasEditor()) return;
  // Mobile + reduced motion fall back to the static CSS grid.
  if (prefersReducedMotion) return;
  if (window.innerWidth < 768) return;

  const content = el.querySelector(".hero-gallery__content");
  const grid = el.querySelector(".hero-gallery__grid");
  if (!content || !grid) return;

  // First card is the hero (centre cell, scales to fill); the rest are tiles.
  const tiles = Array.from(grid.children);
  const hero = tiles[0];
  const cards = tiles.slice(1);
  if (!hero || cards.length === 0) return;

  el.style.height = "240vh";

  const ease = cubicBezier(0.16, 1, 0.3, 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => Math.min(1, Math.max(0, t));

  // Measure-before-mutate: the hero's cell size, the stage (container) size, and
  // each card's distance from the grid centre (drives the concentric reveal).
  const heroRect = hero.getBoundingClientRect();
  const stageRect = content.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  const cx = gridRect.left + gridRect.width / 2;
  const cy = gridRect.top + gridRect.height / 2;
  // For each card: the vector from its resting cell to the grid centre. Cards
  // start stacked at the centre (behind the hero) and slide out to their cell.
  const offsets = cards.map((card) => {
    const r = card.getBoundingClientRect();
    const dx = cx - (r.left + r.width / 2);
    const dy = cy - (r.top + r.height / 2);
    return { dx, dy, dist: Math.hypot(dx, dy) };
  });
  const maxDistance = Math.max(...offsets.map((o) => o.dist), 1);

  // Scale the hero needs to cover its container (stage) from its cell size.
  const fillScale = Math.max((stageRect.width - 32) / heroRect.width, (stageRect.height - 32) / heroRect.height);
  const heroEnd = 0.5; // hero finishes shrinking at the halfway point

  // Strip the cards' Tailwind transition classes so their built-in easing doesn't
  // fight (and lag behind) the scroll-driven opacity + scale updates below.
  // Matches the scroll-stack / center_spread blocks.
  hero.classList.remove("transition", "duration-500", "ease-out");

  // Enhanced start state, set synchronously to avoid a flash of the resolved grid
  // before the first scroll callback fires.
  hero.style.scale = String(fillScale);
  cards.forEach((card, index) => {
    card.classList.remove("transition", "duration-500", "ease-out");
    card.style.opacity = "0";
    card.style.scale = "0";
    // Stacked at the grid centre, hidden behind the hero (z-index 2).
    card.style.translate = `${offsets[index].dx}px ${offsets[index].dy}px`;
  });

  scroll(
    (progress) => {
      const s = ease(clamp01(progress / heroEnd));
      hero.style.scale = String(lerp(fillScale, 1, s));

      cards.forEach((card, index) => {
        const { dx, dy, dist } = offsets[index];
        // Nearer the centre = earlier window; farther = later (centre-outward).
        const norm = dist / maxDistance;
        const start = 0.1 + norm * 0.4;
        const end = start + 0.4;
        const t = ease(clamp01((progress - start) / (end - start)));
        card.style.opacity = String(t);
        card.style.scale = String(t);
        // Slide from the centre out to the resting cell as it scales in.
        card.style.translate = `${dx * (1 - t)}px ${dy * (1 - t)}px`;
      });
    },
    { target: el, offset: ["start start", "end end"] },
  );
});
