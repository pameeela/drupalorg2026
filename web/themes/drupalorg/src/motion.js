import { animate, inView } from "motion";

const animatableElements = document.querySelectorAll("[data-animation]");

// Define animation transforms for each type.
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
