import { ComponentType, ComponentInstance } from "../../lib/component.js";
import currentlyInCanvasEditor from "../../lib/currentlyInCanvasEditor.js";

class Accordion extends ComponentInstance {
  // An internal private property to keep up with the current state of the
  // accordion.
  #savedAsOpen;

  static openClass = "accordion--open";
  static animateClass = "accordion--animate";

  // Whether ancestor accordion containers should close other accordions when
  // this one is opened.
  shouldDispatchEvents = true;

  init() {
    if (currentlyInCanvasEditor()) {
      // In Canvas editor, show content by removing collapsed state classes.
      const content = this.el.querySelector(".accordion--content");
      content.classList.remove("h-0", "py-0", "overflow-hidden");
      content.classList.add("h-auto", "py-4", "overflow-visible");
      return;
    }

    // Save our togglable classes for easy reference.
    this.button = this.el.querySelector(".accordion--title");
    this.contentContainer = this.el.querySelector(".accordion--content");
    this.focusableDescendants = this.contentContainer.querySelectorAll(
      ":is(input, select, textarea, button, object):not(:disabled), a:is([href]), [tabindex]",
    );

    // Keep track of the starting tabindex for all focusable descendants, so we
    // can restore them after nuking them when the accordion is closed.
    this.focusableDescendants.forEach((el) => {
      el.tabIndex = el.tabIndex || 0;
      el.dataset.originalTabIndex = el.tabIndex;
    });

    // With the `set isOpen()` below, merely setting this property does all the
    // stuff necessary to open or close the accordion.
    this.isOpen = this.el.dataset.openByDefault === "true";

    // Figure out what height the content will be when open so we can smoothly
    // animate to it with CSS.
    this.measureNaturalHeight();

    // The previous line enables animations, but we're not ready for them yet.
    this.el.classList.remove(Accordion.animateClass);

    // Remeasure on viewport width changes.
    let lastWidth = window.innerWidth;
    let timeout = 0;

    window.addEventListener("resize", () => {
      if (window.innerWidth === lastWidth) {
        return;
      }
      lastWidth = window.innerWidth;
      this.el.classList.add("accordion--resizing");
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        this.measureNaturalHeight();
        this.el.classList.remove("accordion--resizing");
      }, 350);
    });

    // Make the button work.
    this.button.addEventListener("click", () => {
      // Toggle the accordion.
      this.isOpen = !this.isOpen;
    });

    this.el.classList.add("accordion--js");
    void this.el.offsetHeight;
    this.el.classList.add(Accordion.animateClass);
  }

  // This setter makes it so the accordion can be opened and closed just by
  // doing `this.isOpen = true` or `this.isOpen = false` rather than calling a
  // method.
  set isOpen(val) {
    if (val) {
      // First do all the DOM manipulation needed to actually open the
      // accordion.
      this.el.classList.add(Accordion.openClass);
      this.focusableDescendants.forEach((el) => {
        el.tabIndex = el.dataset.originalTabIndex;
      });
      this.button.setAttribute("aria-expanded", "true");

      // Then stash the current state in a simple private property with no
      // getters or setters involved.
      this.#savedAsOpen = true;

      // Dispatch an event that any accordion container ancestors can use to
      // close other accordions.
      if (this.shouldDispatchEvents) {
        this.el.dispatchEvent(new Event("accordionopen", { bubbles: true }));
      }
    } else {
      // DOM manipulation.
      this.el.classList.remove(Accordion.openClass);
      this.focusableDescendants.forEach((el) => {
        el.tabIndex = -1;
      });
      this.button.setAttribute("aria-expanded", "false");
      // Stash current state.
      this.#savedAsOpen = false;
    }
  }

  // Get the simple boolean saved in the setter.
  get isOpen() {
    return this.#savedAsOpen;
  }

  // Measure how tall the content should be when open to smoothly animate it
  // using CSS. Uses an off-DOM probe so live panels never flash open/closed.
  measureNaturalHeight() {
    const content = this.contentContainer;
    const width = content.getBoundingClientRect().width;
    const probe = content.cloneNode(true);

    probe.removeAttribute("id");
    probe.setAttribute("aria-hidden", "true");
    // Match open-state sizing (py-4) without affecting the live panel.
    probe.style.setProperty("position", "absolute", "important");
    probe.style.setProperty("left", "0", "important");
    probe.style.setProperty("top", "0", "important");
    probe.style.setProperty("visibility", "hidden", "important");
    probe.style.setProperty("pointer-events", "none", "important");
    probe.style.setProperty("height", "auto", "important");
    probe.style.setProperty("max-height", "none", "important");
    probe.style.setProperty("overflow", "visible", "important");
    probe.style.setProperty("padding-top", "1rem", "important");
    probe.style.setProperty("padding-bottom", "1rem", "important");
    probe.style.setProperty("width", `${width}px`, "important");

    this.el.appendChild(probe);
    const height = probe.getBoundingClientRect().height;
    probe.remove();

    this.el.style.setProperty("--natural-height", `${height}px`);
  }
}

new ComponentType(Accordion, "accordion", ".accordion");
