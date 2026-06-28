import { ComponentType, ComponentInstance } from "../../lib/component.js";
import currentlyInCanvasEditor from "../../lib/currentlyInCanvasEditor.js";

class HeroGallery extends ComponentInstance {
  init() {
    const el = this.el;
    if (currentlyInCanvasEditor()) {
      // motion.js already skips the scroll effect in the Canvas editor, so no
      // inline styles get applied. This is belt-and-braces against hot-reload
      // races where the effect may have run before this behaviour: strip the
      // attribute and only the properties the effect sets (not authored inline
      // styles on the cards).
      delete el.dataset.galleryReveal;
      el.style.removeProperty("height");
      el.querySelectorAll(".hero-gallery__grid > *").forEach((node) => {
        node.style.removeProperty("opacity");
        node.style.removeProperty("scale");
        node.style.removeProperty("translate");
      });
    }
  }
}

new ComponentType(HeroGallery, "heroGallery", ".hero-gallery");
