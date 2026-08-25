import { ComponentType, ComponentInstance } from "../../lib/component.js";
import currentlyInCanvasEditor from "../../lib/currentlyInCanvasEditor.js";

// Ensures unique ids when several Tabs components share a page.
let groupCounter = 0;

class Tabs extends ComponentInstance {
  init() {
    if (currentlyInCanvasEditor()) {
      // Leave every panel stacked and visible while editing in Canvas.
      return;
    }

    this.tablist = this.el.querySelector(".tabs__tablist");
    const tabEls = Array.from(this.el.querySelectorAll(".tab"));

    // Not one of our tabbed-content blocks (e.g. core's local-task `.tabs`),
    // or nothing to do.
    if (!this.tablist || tabEls.length === 0) {
      return;
    }

    // Reveal the tablist. Its `hidden` class is the no-JS fallback; we remove
    // it directly rather than relying on a CSS variant to override `hidden`.
    this.tablist.classList.remove("hidden");

    const groupId = `tabs-${groupCounter++}`;

    this.tabs = tabEls.map((tabEl, index) => {
      const button = tabEl.querySelector(".tab__nav");
      const panel = tabEl.querySelector(".tab__panel");
      const tabId = `${groupId}-tab-${index}`;
      const panelId = `${groupId}-panel-${index}`;

      button.setAttribute("role", "tab");
      button.id = tabId;
      button.setAttribute("aria-controls", panelId);

      panel.setAttribute("role", "tabpanel");
      panel.id = panelId;
      panel.setAttribute("aria-labelledby", tabId);
      panel.setAttribute("tabindex", "0");

      // Move the server-rendered nav button (with its icon) into the tablist
      // and reveal it (its `hidden` class is the no-JS fallback).
      this.tablist.appendChild(button);
      button.classList.remove("hidden");

      button.addEventListener("click", () => this.activate(index));
      button.addEventListener("keydown", (e) => this.onKeydown(e, index));

      return { tabEl, button, panel };
    });

    // Switch CSS from the stacked fallback to the tabbed presentation.
    this.el.classList.add("tabs--js");

    // Activate the first tab without stealing focus on page load.
    this.activate(0, false);
  }

  activate(index, focus = true) {
    this.tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.button.setAttribute("aria-selected", selected ? "true" : "false");
      tab.button.tabIndex = selected ? 0 : -1;
      // Hiding the wrapper hides the panel; the nav button already lives in the
      // tablist, so it stays visible.
      tab.tabEl.hidden = !selected;
    });

    this.activeIndex = index;

    if (focus) {
      this.tabs[index].button.focus();
    }
  }

  onKeydown(e, index) {
    const last = this.tabs.length - 1;
    let next;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = index === 0 ? last : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }

    e.preventDefault();
    this.activate(next);
  }
}

new ComponentType(Tabs, "tabs", ".tabs");
