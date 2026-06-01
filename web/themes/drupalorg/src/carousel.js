import Swiper from "swiper";
import { Autoplay, Keyboard, A11y } from "swiper/modules";
import "swiper/css";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll(".carousel").forEach((carousel) => {
  const swiperEl = carousel.querySelector(".swiper");
  const nav = carousel.querySelector(".carousel__nav");

  if (!swiperEl || !nav) {
    return;
  }

  const slides = Array.from(swiperEl.querySelectorAll(".swiper-slide"));

  if (slides.length === 0) {
    return;
  }

  // Hoist each slide's nav (icon + title + description) into the feature nav row
  // as a button. Done before Swiper init so loop-mode clones don't interfere.
  const navButtons = slides.map((slide) => {
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

  const autoplayEnabled = carousel.dataset.autoplay === "true" && !prefersReducedMotion;

  const swiper = new Swiper(swiperEl, {
    modules: [Autoplay, Keyboard, A11y],
    loop: slides.length > 1,
    centeredSlides: true,
    // "auto" reads each slide's CSS width (set per the carousel's slides_per_view
    // prop), which is what reliably produces the peek layout.
    slidesPerView: "auto",
    spaceBetween: 24,
    keyboard: { enabled: true },
    autoplay: autoplayEnabled ? { delay: 5000, pauseOnMouseEnter: true, disableOnInteraction: true } : false,
  });

  const setActive = () => {
    navButtons.forEach((button, index) => {
      const isActive = index === swiper.realIndex;
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
