(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const root = document.documentElement;
  const cursorEl = document.createElement("div");
  cursorEl.className = "cursor-fx";
  document.body.appendChild(cursorEl);

  let lastX = 0;
  let lastY = 0;
  let raf = null;

  function setRootPos(x, y) {
    root.style.setProperty("--cursor-x", `${x}px`);
    root.style.setProperty("--cursor-y", `${y}px`);
  }

  function onMove(e) {
    lastX = e.clientX;
    lastY = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      setRootPos(lastX, lastY);
      // transform is controlled by CSS using CSS vars; keep JS minimal to avoid flicker
      raf = null;
    });
  }

  function classifyTarget(target) {
    if (!target) return "default";
    if (
      target.matches(
        [
          "button",
          "[role=button]",
          ".cursor-pointer",
          ".btn",
          "[data-action]",
          "a[href]",
          "[data-action=add-function]",
          "[data-action=code]",
          "[data-action=preview]",
          "[data-action=edit]",
          "[data-action=copy]",
        ].join(",")
      )
    ) {
      return "clickable";
    }
    if (
      target.matches(
        [
          "input[type=text]",
          "input[type=search]",
          "input[type=email]",
          "input[type=password]",
          "textarea",
          ".cursor-text",
          "[contenteditable=true]",
        ].join(",")
      )
    ) {
      return "text";
    }
    return "default";
  }

  function onOverOut(e) {
    const type = classifyTarget(e.target);
    if (type === "clickable") {
      root.setAttribute("data-cursor", "clickable");
    } else if (type === "text") {
      root.setAttribute("data-cursor", "text");
    } else {
      root.removeAttribute("data-cursor");
    }
  }

  function onLeaveWindow() {
    cursorEl.style.opacity = "0";
  }
  function onEnterWindow() {
    cursorEl.style.opacity = "0.85";
  }

  document.addEventListener("mousemove", onMove, { passive: true });
  document.addEventListener("mouseover", onOverOut, { passive: true });
  document.addEventListener("focusin", onOverOut, { passive: true });
  window.addEventListener("blur", onLeaveWindow);
  window.addEventListener("focus", onEnterWindow);

  // Initialize at center to avoid flicker on load
  setRootPos(window.innerWidth / 2, window.innerHeight / 2);
})();