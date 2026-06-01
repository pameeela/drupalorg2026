import { animate, inView } from "motion";

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

// Logo ticker: seamless horizontal autoscroll that slows on hover.
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
  // scrolling by exactly one set never reveals a gap. Item widths are container
  // units (they scale with the viewport), so this count stays valid on resize.
  const sets = oneSetWidth > 0 ? Math.ceil(viewportWidth / oneSetWidth) + 2 : 3;
  for (let copy = 1; copy < sets; copy++) {
    originalItems.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });
  }

  // Scroll by exactly one set. Every set is identical, so the loop point looks
  // the same as the start — a continuous loop with no jump. As a percentage of
  // the (now N-set) track, this is resize-proof.
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
