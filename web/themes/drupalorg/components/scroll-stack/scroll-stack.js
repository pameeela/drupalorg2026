import { ComponentType, ComponentInstance } from "../../lib/component.js";
import currentlyInCanvasEditor from "../../lib/currentlyInCanvasEditor.js";

class ScrollStack extends ComponentInstance {
  init() {
    const scrollStack = this.el;
    const item_wrapper = scrollStack.querySelector(".stack-items");
    const items = Array.from(item_wrapper.children);
    if (currentlyInCanvasEditor()) {
      // motion.js already skips the scroll effect in the Canvas editor, so no
      // inline styles get applied. This is belt-and-braces against hot-reload
      // races where the effect may have run before this behavior: strip the
      // attribute and any inline styles the effect left behind.
      delete scrollStack.dataset.scrollStack;
      scrollStack.removeAttribute("style");
      item_wrapper.removeAttribute("style");
      items.forEach((item) => {
        item.removeAttribute("style");
      });
    }
  }
}

new ComponentType(ScrollStack, "scrollStack", ".scroll-stack");
