import { ComponentType, ComponentInstance } from "../../lib/component.js";

const STORAGE_KEY = "drupalorg.codeCommandEnv";
const ENV_EVENT = "drupalorg:code-command-env";
const DEFAULT_ENV = "ddev";

function readStoredEnv() {
  try {
    const value = window.localStorage?.getItem(STORAGE_KEY);
    if (value === "ddev" || value === "local") {
      return value;
    }
  } catch (error) {
    // Ignore storage access errors (private mode, etc.).
  }
  return DEFAULT_ENV;
}

function writeStoredEnv(env) {
  try {
    window.localStorage?.setItem(STORAGE_KEY, env);
  } catch (error) {
    // Ignore storage access errors.
  }
}

class CodeCommand extends ComponentInstance {
  init() {
    this.button = this.el.querySelector("[data-code-command-copy]");
    this.label = this.el.querySelector("[data-code-command-label]");
    this.live = this.el.querySelector("[data-code-command-live]");
    this.code = this.el.querySelector("[data-code-command-text]");
    this.segments = Array.from(this.el.querySelectorAll("[data-code-command-env]"));

    if (!this.button || !this.label || !this.code) {
      return;
    }

    this.commands = {
      ddev: this.el.getAttribute("data-command-ddev") || "",
      local: this.el.getAttribute("data-command-local") || "",
    };

    this.button.addEventListener("click", () => this.copy());
    this.segments.forEach((segment) => {
      segment.addEventListener("click", () => {
        this.setEnv(segment.getAttribute("data-code-command-env"), true);
      });
      segment.addEventListener("keydown", (event) => this.onSegmentKeydown(event));
    });

    this.onEnvEvent = (event) => {
      const env = event.detail?.env;
      if (env === "ddev" || env === "local") {
        this.applyEnv(env, true);
      }
    };
    window.addEventListener(ENV_EVENT, this.onEnvEvent);

    this.applyEnv(readStoredEnv(), false);
  }

  onSegmentKeydown(event) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const currentIndex = this.segments.indexOf(event.currentTarget);
    if (currentIndex < 0) {
      return;
    }

    const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const nextIndex = (currentIndex + delta + this.segments.length) % this.segments.length;
    const next = this.segments[nextIndex];
    next.focus();
    this.setEnv(next.getAttribute("data-code-command-env"), true);
  }

  setEnv(env, broadcast) {
    if (env !== "ddev" && env !== "local") {
      return;
    }

    writeStoredEnv(env);
    this.applyEnv(env, true);

    if (broadcast) {
      window.dispatchEvent(
        new CustomEvent(ENV_EVENT, {
          detail: { env },
        }),
      );
    }
  }

  applyEnv(env, clearCopied) {
    this.el.setAttribute("data-env", env);
    this.code.textContent = this.commands[env] || "";

    this.segments.forEach((segment) => {
      const selected = segment.getAttribute("data-code-command-env") === env;
      segment.setAttribute("aria-checked", selected ? "true" : "false");
      segment.tabIndex = selected ? 0 : -1;
    });

    if (clearCopied) {
      this.clearCopied();
    }
  }

  getText() {
    return this.code.innerText.trim();
  }

  async copy() {
    const text = this.getText();
    let copied = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (error) {
        copied = this.copyFallback(text);
      }
    } else {
      copied = this.copyFallback(text);
    }

    if (copied) {
      this.setCopied();
    }
  }

  copyFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }

    textarea.remove();
    return ok;
  }

  setCopied() {
    this.label.textContent = "Copied";
    if (this.live) {
      this.live.textContent = "Copied";
    }
    this.button.setAttribute("aria-label", "Copied");

    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.clearCopied(), 2000);
  }

  clearCopied() {
    clearTimeout(this._timer);
    this.label.textContent = "Copy";
    if (this.live) {
      this.live.textContent = "";
    }
    this.button.removeAttribute("aria-label");
  }

  remove() {
    clearTimeout(this._timer);
    window.removeEventListener(ENV_EVENT, this.onEnvEvent);
  }
}

new ComponentType(CodeCommand, "codeCommand", ".code-command");
