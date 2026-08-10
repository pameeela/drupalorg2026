import { ComponentType, ComponentInstance } from "../../lib/component.js";

/** Pixels scrolled per second for hover-mode previews. */
const SCROLL_SPEED_PX_PER_SEC = 200;

class SiteTemplatePreview extends ComponentInstance {
  init() {
    this.viewport = this.el.querySelector(".site-template-preview__viewport--hover");
    if (!this.viewport) {
      return;
    }

    this.image = this.viewport.querySelector(".site-template-preview__image--hover");
    if (!this.image) {
      return;
    }

    this.updateDuration = this.updateDuration.bind(this);
    this.onImageLoad = this.onImageLoad.bind(this);

    this.updateDuration();
    this.image.addEventListener("load", this.onImageLoad);

    this.resizeObserver = new ResizeObserver(() => this.updateDuration());
    this.resizeObserver.observe(this.viewport);
    this.resizeObserver.observe(this.image);
  }

  onImageLoad() {
    this.updateDuration();
  }

  updateDuration() {
    const viewportHeight = this.viewport.clientHeight;
    const imageHeight = this.image.getBoundingClientRect().height;

    if (!viewportHeight || !imageHeight) {
      return;
    }

    const distance = Math.max(0, imageHeight - viewportHeight);
    // Constant px/s — no min/max clamp, or short images crawl and tall ones race.
    const duration = distance / SCROLL_SPEED_PX_PER_SEC;

    this.el.style.setProperty("--stp-height", `${viewportHeight}px`);
    this.el.style.setProperty("--stp-duration", `${duration}s`);
  }

  remove() {
    if (this.image) {
      this.image.removeEventListener("load", this.onImageLoad);
    }
    this.resizeObserver?.disconnect();
  }
}

new ComponentType(SiteTemplatePreview, "siteTemplatePreview", ".site-template-preview");
