import { ComponentType, ComponentInstance } from "../../lib/component.js";
import { measureScrollbarAndObserve } from "../../lib/measureScrollbar.js";

class Navbar extends ComponentInstance {
  #savedAsOpen = false;

  init() {
    this.closeButton = this.el.querySelector(".navbar--hide-menu");
    this.menuButton = this.el.querySelector(".navbar--hamburger");
    this.menu = this.el.querySelector(".navbar--menu");

    measureScrollbarAndObserve(this.el.querySelector(".navbar--dropdown-menu"));

    this.menuButton.addEventListener("click", () => {
      this.menu.querySelectorAll(".dropdown-menu__expand-button--has-been-opened").forEach((button) => {
        button.classList.remove("dropdown-menu__expand-button--has-been-opened");
      });
      this.closeMegaMenus();
      this.isOpen = true;
    });

    this.closeButton.addEventListener("click", () => {
      this.isOpen = false;
    });

    // Keep up with scroll amount for mobile menu positioning.
    const scrollHandler = this.measureScrollTop.bind(this);
    const desktopMQ = window.matchMedia("(min-width: 48rem)");

    // Attach on page load only if less than desktop width AND navbar is visible.
    if (!desktopMQ.matches && this.el.getBoundingClientRect().bottom > 0) {
      scrollHandler();
      window.addEventListener("scroll", scrollHandler);
    }

    // Respond to window width changes, also checking scroll position.
    desktopMQ.addEventListener("change", (e) => {
      if (!e.matches && this.el.getBoundingClientRect().bottom > 0) {
        scrollHandler();
        window.addEventListener("scroll", scrollHandler);
      } else {
        window.removeEventListener("scroll", scrollHandler);
        this.closeMegaMenus();
      }
    });

    // Respond to scroll position changes, also checking window width.
    const intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !desktopMQ.matches) {
          scrollHandler();
          window.addEventListener("scroll", scrollHandler);
        } else {
          window.removeEventListener("scroll", scrollHandler);
        }
      }
    });

    intersectionObserver.observe(this.el);
  }

  closeMegaMenus() {
    this.el.querySelectorAll("[data-mega-menu-item].is-open").forEach((item) => {
      const trigger = item.querySelector("[data-mega-menu-trigger]");
      const panel = item.querySelector("[data-mega-menu-panel]");
      item.classList.remove("is-open");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (panel) panel.hidden = true;
    });
    document.getElementById("mega-menu-dim")?.remove();
  }

  set isOpen(value) {
    if (value) {
      this.menu.classList.add("navbar--menu--open");
      this.menu.querySelector("a, button")?.focus();
      document.documentElement.classList.add("navbar-modal-open");
    } else {
      this.menu.classList.remove("navbar--menu--open");
      document.documentElement.classList.remove("navbar-modal-open");
      this.closeMegaMenus();
    }

    this.#savedAsOpen = !!value;
  }

  get isOpen() {
    return this.#savedAsOpen;
  }

  measureScrollTop() {
    document.documentElement.style.setProperty("--navbar-scroll-top", `${window.scrollY}px`);
  }
}

class DropdownMenu extends ComponentInstance {
  init() {
    this.button = this.el.querySelector(".dropdown-menu__expand-button");
    this.isOpen = false;
    if (!this.button) return;

    const desktopMQ = window.matchMedia("(min-width: 48rem)");

    this.el.addEventListener("mouseenter", () => {
      if (desktopMQ.matches) {
        this.open();
      }
    });

    this.el.addEventListener("mouseleave", () => {
      if (desktopMQ.matches) {
        this.close();
      }
    });

    this.button.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    });

    document.addEventListener("click", (e) => {
      if (!desktopMQ.matches && !this.el.contains(e.target)) {
        this.close();
      }
    });
  }

  open() {
    this.el.classList.add("is-open");
    this.button.setAttribute("aria-expanded", "true");
    this.button.classList.add("dropdown-menu__expand-button--has-been-opened");
    this.isOpen = true;
  }

  close() {
    this.el.classList.remove("is-open");
    this.button.setAttribute("aria-expanded", "false");
    this.isOpen = false;
  }
}

/**
 * Desktop mega menu: hover-open with open intent + leave grace, click toggle,
 * Escape to close. Mobile uses the same triggers inside the drawer (click only).
 */
class MegaMenu extends ComponentInstance {
  static openDelay = 200;
  static closeDelay = 140;

  init() {
    this.items = Array.from(this.el.querySelectorAll("[data-mega-menu-item]"));
    this.desktopMQ = window.matchMedia("(min-width: 48rem)");
    this.closeTimer = null;
    this.openTimer = null;
    this.pendingItem = null;
    this.openItem = null;

    this.items.forEach((item) => {
      const trigger = item.querySelector("[data-mega-menu-trigger]");
      const panel = item.querySelector("[data-mega-menu-panel]");
      if (!trigger || !panel) return;

      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.clearOpenTimer();
        this.clearCloseTimer();
        if (item.classList.contains("is-open")) {
          this.close(item);
        } else {
          this.open(item);
        }
      });

      item.addEventListener("mouseenter", () => {
        if (!this.desktopMQ.matches) return;
        this.clearCloseTimer();
        this.scheduleOpen(item);
      });

      item.addEventListener("mouseleave", () => {
        if (!this.desktopMQ.matches) return;
        // Cancel a pending open if the pointer only brushed this trigger.
        if (this.pendingItem === item) {
          this.clearOpenTimer();
        }
      });
    });

    // Leave grace across the whole mega menu (triggers + panels).
    this.el.addEventListener("mouseleave", () => {
      if (!this.desktopMQ.matches) return;
      this.clearOpenTimer();
      this.scheduleClose();
    });

    this.el.addEventListener("mouseenter", () => {
      this.clearCloseTimer();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeAll();
      }
    });

    document.addEventListener("click", (e) => {
      if (!this.el.contains(e.target)) {
        this.closeAll();
      }
    });

    this.desktopMQ.addEventListener("change", () => this.closeAll());
  }

  clearCloseTimer() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  clearOpenTimer() {
    if (this.openTimer) {
      clearTimeout(this.openTimer);
      this.openTimer = null;
    }
    this.pendingItem = null;
  }

  scheduleOpen(item) {
    this.clearCloseTimer();

    // Pointer is back on the already-open item (e.g. its panel) — cancel any
    // pending switch from brushing a neighbour on the way down.
    if (this.openItem === item) {
      this.clearOpenTimer();
      return;
    }

    this.clearOpenTimer();
    this.pendingItem = item;
    this.openTimer = window.setTimeout(() => {
      this.openTimer = null;
      this.pendingItem = null;
      this.open(item);
    }, MegaMenu.openDelay);
  }

  scheduleClose() {
    this.clearCloseTimer();
    this.closeTimer = window.setTimeout(() => this.closeAll(), MegaMenu.closeDelay);
  }

  setDim(on) {
    const header = this.el.closest("header") || this.el.closest(".region-header") || this.el.closest(".navbar");
    const top = header ? Math.round(header.getBoundingClientRect().bottom) : 80;
    document.documentElement.style.setProperty("--mega-menu-offset-top", `${top}px`);

    let dim = document.getElementById("mega-menu-dim");
    if (on) {
      if (!dim) {
        dim = document.createElement("div");
        dim.id = "mega-menu-dim";
        dim.className =
          "pointer-events-none fixed inset-0 top-[var(--mega-menu-offset-top,80px)] z-40 bg-[rgba(10,26,58,0.16)] opacity-100 transition-opacity duration-200 motion-reduce:transition-none";
        dim.setAttribute("aria-hidden", "true");
        // Stay inside .layout-container so z-index competes with the header,
        // not above the whole page shell (which was greying out the panel).
        const host = document.querySelector(".layout-container") || document.body;
        host.appendChild(dim);
      }
    } else {
      dim?.remove();
    }
  }

  open(item) {
    this.clearOpenTimer();
    this.clearCloseTimer();
    this.items.forEach((other) => {
      if (other !== item) this.close(other, false);
    });

    const trigger = item.querySelector("[data-mega-menu-trigger]");
    const panel = item.querySelector("[data-mega-menu-panel]");
    item.classList.add("is-open");
    trigger?.setAttribute("aria-expanded", "true");
    if (panel) panel.hidden = false;
    this.openItem = item;
    if (this.desktopMQ.matches) {
      this.setDim(true);
    }
  }

  close(item, updateDim = true) {
    const trigger = item.querySelector("[data-mega-menu-trigger]");
    const panel = item.querySelector("[data-mega-menu-panel]");
    item.classList.remove("is-open");
    trigger?.setAttribute("aria-expanded", "false");
    if (panel) panel.hidden = true;
    if (this.openItem === item) {
      this.openItem = null;
    }
    if (updateDim && !this.openItem) {
      this.setDim(false);
    }
  }

  closeAll() {
    this.clearOpenTimer();
    this.clearCloseTimer();
    this.items.forEach((item) => this.close(item, false));
    this.openItem = null;
    this.setDim(false);
  }
}

window.dropdownMenu = new ComponentType(DropdownMenu, "dropdownMenu", ".dropdown-menu");
window.megaMenu = new ComponentType(MegaMenu, "megaMenu", "[data-mega-menu]");
window.navbar = new ComponentType(Navbar, "navbar", ".navbar");
