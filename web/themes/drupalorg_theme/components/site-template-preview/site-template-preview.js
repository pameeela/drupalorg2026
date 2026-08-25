import { ComponentType, ComponentInstance } from "../../lib/component.js";
import currentlyInCanvasEditor from "../../lib/currentlyInCanvasEditor.js";

/* Pixels scrolled per second for card previews. */
const SCROLL_SPEED_PX_PER_SEC = 200;

class SiteTemplatePreview extends ComponentInstance {
  init() {
    this.onImageLoad = this.onImageLoad.bind(this);
    this.updateDuration = this.updateDuration.bind(this);
    this.onThumbClick = this.onThumbClick.bind(this);
    this.onThumbKeydown = this.onThumbKeydown.bind(this);
    this.onActivate = this.onActivate.bind(this);
    this.onAnimationEnd = this.onAnimationEnd.bind(this);

    this.playbackFinished = false;

    this.initHoverScroll();
    this.initGallery();
  }

  initHoverScroll() {
    this.hoverViewport = this.el.querySelector(".site-template-preview__viewport--hover");
    if (!this.hoverViewport) {
      return;
    }

    this.hoverImage = this.hoverViewport.querySelector(".site-template-preview__image--hover");
    if (!this.hoverImage) {
      return;
    }

    this.updateDuration();
    this.hoverImage.addEventListener("load", this.onImageLoad);
    this.hoverImage.addEventListener("animationend", this.onAnimationEnd);

    this.resizeObserver = new ResizeObserver(() => this.updateDuration());
    this.resizeObserver.observe(this.hoverViewport);
    this.resizeObserver.observe(this.hoverImage);

    if (currentlyInCanvasEditor()) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.hoverViewport.removeAttribute("role");
      this.hoverViewport.removeAttribute("aria-pressed");
      this.hoverViewport.removeAttribute("aria-label");
      this.hoverViewport.tabIndex = -1;
      return;
    }

    this.hoverViewport.addEventListener("click", this.onActivate);
    this.hoverViewport.addEventListener("keydown", this.onActivate);
  }

  initGallery() {
    this.scrollViewport = this.el.querySelector("[data-site-template-preview-viewport].site-template-preview__viewport--scroll");
    this.mainImage = this.el.querySelector(
      ".site-template-preview__viewport--scroll .site-template-preview__image, .site-template-preview__viewport--scroll img",
    );
    this.thumbs = Array.from(this.el.querySelectorAll("[data-site-template-preview-thumb]"));

    if (!this.scrollViewport || !this.mainImage || this.thumbs.length < 2) {
      return;
    }

    this.thumbs.forEach((thumb) => {
      thumb.addEventListener("click", this.onThumbClick);
      thumb.addEventListener("keydown", this.onThumbKeydown);
    });
  }

  onImageLoad() {
    this.updateDuration();
  }

  onActivate(event) {
    if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") {
      return;
    }

    if (event.type === "keydown") {
      event.preventDefault();
    }

    this.togglePlayback();
  }

  togglePlayback() {
    if (this.el.classList.contains("is-playing")) {
      this.stopPlayback();
      return;
    }

    if (this.playbackFinished) {
      this.restartAnimation();
      this.playbackFinished = false;
    }

    this.startPlayback();
  }

  startPlayback() {
    this.el.classList.add("is-playing");
    this.hoverViewport.setAttribute("aria-pressed", "true");
    this.hoverViewport.setAttribute("aria-label", "Stop preview");
  }

  stopPlayback() {
    this.el.classList.remove("is-playing");
    this.hoverViewport.setAttribute("aria-pressed", "false");
    this.hoverViewport.setAttribute("aria-label", "Play preview");
  }

  restartAnimation() {
    this.hoverImage.style.animation = "none";
    void this.hoverImage.offsetHeight;
    this.hoverImage.style.removeProperty("animation");
  }

  onAnimationEnd(event) {
    if (event.animationName !== "site-template-preview-scroll") {
      return;
    }

    this.playbackFinished = true;
    this.stopPlayback();
  }

  updateDuration() {
    if (!this.hoverViewport || !this.hoverImage) {
      return;
    }

    const viewportHeight = this.hoverViewport.clientHeight;
    const imageHeight = this.hoverImage.getBoundingClientRect().height;

    if (!viewportHeight || !imageHeight) {
      return;
    }

    const travel = Math.max(0, imageHeight - viewportHeight);
    const duration = travel / SCROLL_SPEED_PX_PER_SEC;

    this.el.style.setProperty("--stp-height", `${viewportHeight}px`);
    this.el.style.setProperty("--stp-travel", `${travel}px`);
    this.el.style.setProperty("--stp-duration", `${duration}s`);
  }

  onThumbClick(event) {
    this.selectThumb(event.currentTarget);
  }

  onThumbKeydown(event) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const currentIndex = this.thumbs.indexOf(event.currentTarget);
    if (currentIndex < 0) {
      return;
    }

    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + this.thumbs.length) % this.thumbs.length;
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % this.thumbs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = this.thumbs.length - 1;
    }

    const next = this.thumbs[nextIndex];
    next.focus();
    this.selectThumb(next);
  }

  selectThumb(thumb) {
    const src = thumb.getAttribute("data-src");
    if (!src || !this.mainImage) {
      return;
    }

    this.mainImage.setAttribute("src", src);
    this.mainImage.removeAttribute("srcset");
    this.mainImage.setAttribute("alt", thumb.getAttribute("data-alt") || "");

    const width = thumb.getAttribute("data-width");
    const height = thumb.getAttribute("data-height");
    if (width) {
      this.mainImage.setAttribute("width", width);
    }
    if (height) {
      this.mainImage.setAttribute("height", height);
    }

    this.scrollViewport.scrollTop = 0;

    this.thumbs.forEach((item) => {
      const selected = item === thumb;
      item.setAttribute("aria-selected", selected ? "true" : "false");
      item.tabIndex = selected ? 0 : -1;
    });
  }

  remove() {
    if (this.hoverImage) {
      this.hoverImage.removeEventListener("load", this.onImageLoad);
      this.hoverImage.removeEventListener("animationend", this.onAnimationEnd);
    }
    if (this.hoverViewport) {
      this.hoverViewport.removeEventListener("click", this.onActivate);
      this.hoverViewport.removeEventListener("keydown", this.onActivate);
    }
    this.resizeObserver?.disconnect();
    this.thumbs?.forEach((thumb) => {
      thumb.removeEventListener("click", this.onThumbClick);
      thumb.removeEventListener("keydown", this.onThumbKeydown);
    });
  }
}

new ComponentType(SiteTemplatePreview, "siteTemplatePreview", ".site-template-preview");
