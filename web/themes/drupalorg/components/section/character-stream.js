/**
 * <character-stream> — vertical glyph stream background.
 *
 * Drop it as the first child of any position:relative dark section:
 *   <character-stream color="#0a1a3a" intensity=".45"></character-stream>
 *
 * Attributes (all optional):
 *   color           background/trail colour            default #0a1a3a
 *   glyphs          "greek" | "code" | "hex"           default greek
 *   density         glyph size in px (column width)    default 16
 *   speed           rows per frame multiplier          default 0.5
 *   intensity       canvas opacity 0–1                 default 0.45
 *   drop-frequency  Drupal drops per 1000 glyphs       default 3
 *   scrim           "on" | "off" — top/bottom fade     default on
 *
 * Pauses when off-screen; renders a single static frame under
 * prefers-reduced-motion. No dependencies.
 */
(function () {
  const SETS = {
    greek:
      "\u0391\u0392\u0393\u0394\u0395\u0396\u0397\u0398\u0399\u039A\u039B\u039C\u039D\u039E\u039F\u03A0\u03A1\u03A3\u03A4\u03A5\u03A6\u03A7\u03A8\u03A9\u03B1\u03B2\u03B3\u03B4\u03B5\u03B6\u03B7\u03B8\u03B9\u03BA\u03BB\u03BC\u03BD\u03BE\u03BF\u03C0\u03C1\u03C3\u03C4\u03C5\u03C6\u03C7\u03C8\u03C90123456789",
    code: "{}[]()<>/\\|;:=+-*&^%$#@!?_.,\u2192\u21B50123456789",
    hex: "0123456789ABCDEF",
  };
  const EGGS = "\u2666\u2B21\u2B22\u00E6\u0251";

  function hexToRgb(hex) {
    const h = String(hex || "").replace("#", "");
    const s =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const n = parseInt(s, 16);
    if (isNaN(n) || s.length !== 6) return [10, 26, 58];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  class CharacterStream extends HTMLElement {
    static get observedAttributes() {
      return ["color", "glyphs", "density", "speed", "intensity", "drop-frequency", "scrim"];
    }
    connectedCallback() {
      if (!this._built) {
        this.style.position = "absolute";
        this.style.inset = "0";
        this.style.zIndex = "0";
        this.style.pointerEvents = "none";
        this.style.overflow = "hidden";
        this._canvas = document.createElement("canvas");
        this._canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
        this._scrim = document.createElement("div");
        this._scrim.style.cssText = "position:absolute;inset:0";
        this.appendChild(this._canvas);
        this.appendChild(this._scrim);
        this._built = true;
      }
      this._start();
    }
    disconnectedCallback() {
      this._stop();
    }
    attributeChangedCallback() {
      if (this._built && this.isConnected) {
        this._stop();
        this._start();
      }
    }

    _num(name, fallback) {
      const v = parseFloat(this.getAttribute(name));
      return isNaN(v) ? fallback : v;
    }

    _stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._obs) this._obs.disconnect();
      if (this._ro) this._ro.disconnect();
      this._raf = this._obs = this._ro = null;
    }

    _start() {
      const host = this; // sized by inset:0 against the nearest positioned ancestor
      const canvas = this._canvas;
      const ctx = canvas.getContext("2d");
      const color = this.getAttribute("color") || "#0a1a3a";
      const [r, g, b] = hexToRgb(color);
      const rgb = r + "," + g + "," + b;
      const chars = (SETS[(this.getAttribute("glyphs") || "greek").toLowerCase()] || SETS.greek).repeat(3) + EGGS;
      const font = Math.max(10, Math.round(this._num("density", 16)));
      const speed = this._num("speed", 0.5);
      const dropRate = this._num("drop-frequency", 3) / 1000;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let cols = 0,
        drops = [];

      canvas.style.opacity = String(this._num("intensity", 0.45));
      this._scrim.style.background =
        this.getAttribute("scrim") === "off"
          ? "none"
          : "linear-gradient(180deg,rgba(" + rgb + ",.85) 0%,rgba(" + rgb + ",.25) 30%,rgba(" + rgb + ",.25) 70%,rgba(" + rgb + ",.85) 100%)";

      const resize = () => {
        const w = host.offsetWidth,
          h = host.offsetHeight;
        if (!w || !h) return;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.floor(w / font);
        const rows = h / font;
        drops = [];
        for (let i = 0; i < cols; i++) drops.push(Math.random() * (rows + 20) - 20);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
      };

      const drupalDrop = (x, y, size) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size / 20, size / 20);
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.bezierCurveTo(-2, -6, -8, 2, -8, 6);
        ctx.bezierCurveTo(-8, 11, -4, 14, 0, 14);
        ctx.bezierCurveTo(4, 14, 8, 11, 8, 6);
        ctx.bezierCurveTo(8, 2, 2, -6, 0, -10);
        ctx.closePath();
        ctx.fillStyle = "rgba(0,119,170,.75)";
        ctx.fill();
        ctx.strokeStyle = "rgba(102,200,239,.9)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      };

      const draw = () => {
        const w = canvas.width / dpr,
          h = canvas.height / dpr;
        ctx.fillStyle = "rgba(" + rgb + ",.06)";
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < cols; i++) {
          const ch = chars[Math.floor(Math.random() * chars.length)];
          const x = i * font,
            y = drops[i] * font;
          const t = Math.random();
          if (EGGS.indexOf(ch) !== -1) {
            ctx.fillStyle = "rgba(102,200,239,.95)";
            ctx.font = "bold " + (font + 2) + "px ui-monospace, monospace";
          } else if (t > 0.95) {
            ctx.fillStyle = "rgba(224,244,251,.9)";
            ctx.font = "bold " + font + "px ui-monospace, monospace";
          } else {
            ctx.fillStyle = "rgba(0,156,222," + (0.15 + t * 0.35) + ")";
            ctx.font = font + "px ui-monospace, monospace";
          }
          if (Math.random() < dropRate) drupalDrop(x + font / 2, y, font * 1.3);
          else ctx.fillText(ch, x, y);
          if (y > h && Math.random() > 0.985) drops[i] = 0;
          drops[i] += speed * (0.6 + Math.random() * 0.8);
        }
      };

      resize();
      this._ro = new ResizeObserver(resize);
      this._ro.observe(host);
      if (reduced) {
        for (let k = 0; k < 40; k++) draw();
        return;
      }

      let last = 0,
        running = true;
      const loop = (t) => {
        this._raf = requestAnimationFrame(loop);
        if (!running || t - last < 45) return;
        last = t;
        draw();
      };
      this._obs = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            running = !(e.isIntersecting === false && e.rootBounds);
          });
        },
        { threshold: 0, rootMargin: "200px" },
      );
      this._obs.observe(host);
      this._raf = requestAnimationFrame(loop);
    }
  }

  if (!customElements.get("character-stream")) customElements.define("character-stream", CharacterStream);
})();
