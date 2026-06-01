import Swiper from "swiper";
import { Autoplay, Keyboard, A11y } from "swiper/modules";
import "swiper/css";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A centered loop with a peek on each side needs enough slides to always have a
// neighbour to the left and right. Swiper's loop can't guarantee that with very
// few slides, so we duplicate the set up to this minimum.
const MIN_SLIDES = 5;

document.querySelectorAll(".carousel").forEach((carousel) => {
  const swiperEl = carousel.querySelector(".swiper");
  const wrapper = swiperEl && swiperEl.querySelector(".swiper-wrapper");
  const nav = carousel.querySelector(".carousel__nav");

  if (!swiperEl || !wrapper || !nav) {
    return;
  }

  const originalSlides = Array.from(wrapper.querySelectorAll(":scope > .swiper-slide"));

  if (originalSlides.length === 0) {
    return;
  }

  // Hoist each original slide's nav (icon + title + description) into the
  // feature nav row as a button.
  const navButtons = originalSlides.map((slide) => {
    const slideNav = slide.querySelector(".slide__nav");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "carousel__feature";

    if (slideNav) {
      button.innerHTML = slideNav.innerHTML;
      slideNav.remove();
    }

    nav.appendChild(button);
    return button;
  });

  const slideCount = navButtons.length;

  // Duplicate the slide set when there are too few for a smooth both-sides peek.
  // Clones are decorative (aria-hidden) and removed from the tab order; the
  // active-state and nav mapping use modulo so clones map back to the right
  // feature.
  if (slideCount > 1 && originalSlides.length < MIN_SLIDES) {
    const extraSets = Math.ceil(MIN_SLIDES / originalSlides.length) - 1;
    for (let set = 0; set < extraSets; set++) {
      originalSlides.forEach((slide) => {
        const clone = slide.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((el) => {
          el.tabIndex = -1;
        });
        wrapper.appendChild(clone);
      });
    }
  }

  const autoplayEnabled = carousel.dataset.autoplay === "true" && !prefersReducedMotion;

  const swiper = new Swiper(swiperEl, {
    modules: [Autoplay, Keyboard, A11y],
    loop: slideCount > 1,
    centeredSlides: true,
    // "auto" reads each slide's CSS width (set per the slides_per_view prop).
    slidesPerView: "auto",
    spaceBetween: 24,
    keyboard: { enabled: true },
    autoplay: autoplayEnabled ? { delay: 3000, pauseOnMouseEnter: true, disableOnInteraction: true } : false,
  });

  const setActive = () => {
    const activeFeature = swiper.realIndex % slideCount;
    navButtons.forEach((button, index) => {
      const isActive = index === activeFeature;
      button.classList.toggle("is-active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  };

  navButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      // Manual selection disables autoplay (programmatic slideTo does not trigger
      // Swiper's disableOnInteraction).
      if (autoplayEnabled) {
        swiper.autoplay.stop();
      }
      swiper.slideToLoop(index);
    });
  });

  swiper.on("slideChange", setActive);
  setActive();
});
