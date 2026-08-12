import { ComponentType, ComponentInstance } from "../../lib/component.js";
import { measureScrollbarAndObserve } from "../../lib/measureScrollbar.js";

class Navbar extends ComponentInstance {
  #savedAsOpen = false;
  #scrollRaf = 0;

  init() {
    this.closeButton = this.el.querySelector(".navbar--hide-menu");
    this.menuButton = this.el.querySelector(".navbar--hamburger");
    this.menu = this.el.querySelector(".navbar--menu");

    measureScrollbarAndObserve(this.el.querySelector(".navbar--dropdown-menu"));

    this.onKeydown = (e) => {
      if (e.key !== "Escape" || !this.#savedAsOpen || this.desktopMQ.matches) {
        return;
      }

      const megaOpen = window.drupalorgComponents?.megaMenu?.instances?.some((menu) => menu.openItem);
      if (megaOpen) {
        return;
      }

      e.preventDefault();
      this.closeDrawer({ restoreFocus: true });
    };

    this.menuButton.addEventListener("click", () => {
      this.closeMegaMenus();
      this.isOpen = true;
    });

    this.closeButton.addEventListener("click", () => {
      this.closeDrawer({ restoreFocus: true });
    });

    this.onScroll = this.measureScrollTop.bind(this);
    this.desktopMQ = window.matchMedia("(min-width: 48rem)");

    if (!this.desktopMQ.matches && this.el.getBoundingClientRect().bottom > 0) {
      this.measureScrollTop();
      this.listenScroll();
    }

    this.desktopMQ.addEventListener("change", (e) => {
      if (!e.matches && this.el.getBoundingClientRect().bottom > 0) {
        this.measureScrollTop();
        this.listenScroll();
      } else {
        this.unlistenScroll();
        this.closeMegaMenus();
        this.isOpen = false;
      }
    });

    const intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !this.desktopMQ.matches) {
          this.measureScrollTop();
          this.listenScroll();
        } else {
          this.unlistenScroll();
        }
      }
    });

    intersectionObserver.observe(this.el);
  }

  listenScroll() {
    if (this.scrollBound) {
      return;
    }

    window.addEventListener("scroll", this.onScroll, { passive: true });
    this.scrollBound = true;
  }

  unlistenScroll() {
    if (!this.scrollBound) {
      return;
    }

    window.removeEventListener("scroll", this.onScroll);
    this.scrollBound = false;
  }

  closeMegaMenus() {
    window.drupalorgComponents?.megaMenu?.instances?.forEach((menu) => menu.closeAll());
  }

  closeDrawer({ restoreFocus = false } = {}) {
    this.isOpen = false;
    if (restoreFocus && !this.desktopMQ.matches) {
      this.menuButton.focus();
    }
  }

  bindDrawerListeners() {
    if (this.drawerBound) {
      return;
    }

    document.addEventListener("keydown", this.onKeydown);
    this.drawerBound = true;
  }

  unbindDrawerListeners() {
    if (!this.drawerBound) {
      return;
    }

    document.removeEventListener("keydown", this.onKeydown);
    this.drawerBound = false;
  }

  set isOpen(value) {
    const next = !!value;
    if (next === this.#savedAsOpen) {
      return;
    }

    if (next) {
      this.menu.classList.add("navbar--menu--open");
      this.menu.querySelector("a, button")?.focus();
      document.documentElement.classList.add("navbar-modal-open");
      this.menuButton.setAttribute("aria-expanded", "true");
      this.bindDrawerListeners();
    } else {
      this.menu.classList.remove("navbar--menu--open");
      document.documentElement.classList.remove("navbar-modal-open");
      this.menuButton.setAttribute("aria-expanded", "false");
      this.unbindDrawerListeners();
      this.closeMegaMenus();
    }

    this.#savedAsOpen = next;
  }

  get isOpen() {
    return this.#savedAsOpen;
  }

  measureScrollTop() {
    if (this.#scrollRaf) {
      return;
    }

    this.#scrollRaf = requestAnimationFrame(() => {
      this.#scrollRaf = 0;
      document.documentElement.style.setProperty("--navbar-scroll-top", `${window.scrollY}px`);
    });
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
    this.items = Array.from(this.el.querySelectorAll("[data-mega-menu-item]"))
      .map((el) => ({
        el,
        trigger: el.querySelector("[data-mega-menu-trigger]"),
        panel: el.querySelector("[data-mega-menu-panel]"),
      }))
      .filter((item) => item.trigger && item.panel);

    this.desktopMQ = window.matchMedia("(min-width: 48rem)");
    this.closeTimer = null;
    this.openTimer = null;
    this.pendingItem = null;
    this.openItem = null;
    this.dim = null;
    this.header = this.el.closest("header") || this.el.closest(".region-header") || this.el.closest(".navbar");
    this.pageBound = false;

    this.onKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.closeAll({ restoreFocus: true });
      }
    };
    this.onDocumentClick = (e) => {
      if (!this.el.contains(e.target)) {
        this.closeAll();
      }
    };

    this.items.forEach((item) => {
      item.trigger.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.clearOpenTimer();
        this.clearCloseTimer();
        if (this.openItem === item) {
          this.close(item);
        } else {
          this.open(item);
        }
      });

      item.el.addEventListener("mouseenter", () => {
        if (!this.desktopMQ.matches) return;
        this.clearCloseTimer();
        this.scheduleOpen(item);
      });

      item.el.addEventListener("mouseleave", () => {
        if (!this.desktopMQ.matches) return;
        if (this.pendingItem === item) {
          this.clearOpenTimer();
        }
      });
    });

    this.el.addEventListener("mouseleave", () => {
      if (!this.desktopMQ.matches) return;
      if (this.hasFocusInside()) return;
      this.clearOpenTimer();
      this.scheduleClose();
    });

    this.el.addEventListener("mouseenter", () => {
      this.clearCloseTimer();
    });

    this.el.addEventListener("focusout", (e) => {
      if (this.el.contains(e.relatedTarget)) {
        return;
      }

      requestAnimationFrame(() => {
        if (!this.hasFocusInside()) {
          this.closeAll();
        }
      });
    });

    this.desktopMQ.addEventListener("change", () => this.closeAll());
  }

  bindPageListeners() {
    if (this.pageBound) {
      return;
    }

    document.addEventListener("keydown", this.onKeydown);
    document.addEventListener("click", this.onDocumentClick);
    this.pageBound = true;
  }

  unbindPageListeners() {
    if (!this.pageBound) {
      return;
    }

    document.removeEventListener("keydown", this.onKeydown);
    document.removeEventListener("click", this.onDocumentClick);
    this.pageBound = false;
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

  hasFocusInside() {
    return this.el.contains(document.activeElement);
  }

  scheduleClose() {
    this.clearCloseTimer();
    this.closeTimer = window.setTimeout(() => {
      if (this.hasFocusInside()) {
        return;
      }
      this.closeAll();
    }, MegaMenu.closeDelay);
  }

  ensureDim() {
    if (this.dim?.isConnected) {
      return this.dim;
    }

    const dim = document.createElement("div");
    dim.id = "mega-menu-dim";
    dim.hidden = true;
    dim.className =
      "pointer-events-none fixed inset-0 top-[var(--mega-menu-offset-top,80px)] z-40 bg-[rgba(10,26,58,0.16)] opacity-100 transition-opacity duration-200 motion-reduce:transition-none";
    dim.setAttribute("aria-hidden", "true");
    const host = document.querySelector(".layout-container") || document.body;
    host.appendChild(dim);
    this.dim = dim;
    return dim;
  }

  setDim(on) {
    if (!on) {
      if (this.dim) {
        this.dim.hidden = true;
      }
      this.unbindPageListeners();
      return;
    }

    const dim = this.ensureDim();
    const top = this.header ? Math.round(this.header.getBoundingClientRect().bottom) : 80;
    document.documentElement.style.setProperty("--mega-menu-offset-top", `${top}px`);
    dim.hidden = false;
    this.bindPageListeners();
  }

  open(item) {
    this.clearOpenTimer();
    this.clearCloseTimer();

    if (this.openItem && this.openItem !== item) {
      this.close(this.openItem, false);
    }

    item.el.classList.add("is-open");
    item.trigger.setAttribute("aria-expanded", "true");
    item.panel.hidden = false;
    this.openItem = item;
    if (this.desktopMQ.matches) {
      this.setDim(true);
    } else {
      this.bindPageListeners();
    }
  }

  close(item, updateDim = true) {
    item.el.classList.remove("is-open");
    item.trigger.setAttribute("aria-expanded", "false");
    item.panel.hidden = true;
    if (this.openItem === item) {
      this.openItem = null;
    }
    if (updateDim && !this.openItem) {
      this.setDim(false);
    }
  }

  closeAll({ restoreFocus = false } = {}) {
    const trigger = restoreFocus && this.hasFocusInside() ? this.openItem?.trigger : null;
    this.clearOpenTimer();
    this.clearCloseTimer();
    if (this.openItem) {
      this.close(this.openItem, false);
    }
    this.openItem = null;
    this.setDim(false);
    trigger?.focus();
  }

  remove() {
    this.closeAll();
    this.dim?.remove();
    this.dim = null;
  }
}

window.megaMenu = new ComponentType(MegaMenu, "megaMenu", "[data-mega-menu]");
window.navbar = new ComponentType(Navbar, "navbar", ".navbar");
