/* =========================================================
   NeuroADHD: Motion Layer & 3D Neural Connectome Visualization
   Integrations: Three.js r128 · GSAP 3.12 · ScrollTrigger · Lenis
   ========================================================= */

(function () {
  "use strict";

  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const MOTION = root.classList.contains("motion") && hasGSAP && !REDUCED;

  const nav = $(".nav"), menu = $("#nav-links"), hero = $(".hero"), loader = $(".loader");
  let lenis = null;

  /* =========================================================
     1. Navigation State on Scroll
     ========================================================= */
  let lastY = window.scrollY;
  function navState() {
    if (!nav) return;
    const y = window.scrollY;
    const limit = hero ? hero.offsetHeight - nav.offsetHeight - 20 : 180;
    nav.classList.toggle("is-solid", y > limit);
    const goingDown = y > lastY + 3;
    const goingUp = y < lastY - 3;
    if (goingDown && y > limit + 250 && (!menu || !menu.classList.contains("open"))) {
      nav.classList.add("is-hidden");
    }
    if (goingUp || y < limit) {
      nav.classList.remove("is-hidden");
    }
    lastY = y;
  }
  window.addEventListener("scroll", navState, { passive: true });
  navState();

  if (menu) {
    new MutationObserver(() => {
      const open = menu.classList.contains("open");
      if (nav) nav.classList.toggle("menu-open", open);
      if (open && nav) nav.classList.remove("is-hidden");
      if (lenis) {
        open ? lenis.stop() : lenis.start();
      } else {
        document.body.style.overflow = open ? "hidden" : "";
      }
    }).observe(menu, { attributes: true, attributeFilter: ["class"] });
  }

  // Pause smooth scroll while lightbox is open
  const lb = $("#lightbox");
  if (lb) {
    new MutationObserver(() => {
      if (lenis) {
        lb.hidden ? lenis.start() : lenis.stop();
      }
    }).observe(lb, { attributes: true, attributeFilter: ["hidden"] });
  }

  /* =========================================================
     2. Initialize 3D Neural Connectome (Three.js)
     ========================================================= */
  initConnectome();

  if (!MOTION) {
    root.classList.remove("motion");
    if (loader) loader.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* =========================================================
     3. Smooth Scrolling (Lenis)
     ========================================================= */
  if (window.Lenis) {
    try {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1.05 });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      // Ensure Lenis starts immediately so user can always scroll
      lenis.start();
    } catch (e) {
      console.warn("Lenis init skipped", e);
    }
  }

  // Smooth scroll click handler
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !lenis) return;
    const id = a.getAttribute("href");
    if (id === "#") return;
    const target = id === "#top" ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    lenis.start();
    const dest = typeof target === "number" ? 0 : (target.querySelector(".section__head") || target);
    const offset = typeof dest === "number" ? 0 : -(nav ? nav.offsetHeight + 18 : 80);
    lenis.scrollTo(dest, {
      offset,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });
  });

  /* =========================================================
     4. Split-Text Animation Helper
     ========================================================= */
  function split(el) {
    if (!el) return [];
    const words = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const outer = document.createElement("span");
            outer.className = "sw";
            const inner = document.createElement("span");
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
            words.push(inner);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
    return words;
  }

  /* =========================================================
     5. Hero Animation & Snappy Loader
     ========================================================= */
  const heroTitle = $(".hero__title");
  const heroTitleWords = heroTitle ? split(heroTitle) : [];
  if (heroTitleWords.length) gsap.set(heroTitleWords, { yPercent: 110 });
  gsap.set([".hero-badge", ".hero__lead", ".hero__cta > *", ".stats .stat"], { y: 25, autoAlpha: 0 });
  gsap.set([".nav__inner"], { y: -15, autoAlpha: 0 });

  function countUp(el, delay = 0) {
    const txt = el.textContent.trim(), target = parseFloat(txt);
    if (Number.isNaN(target)) return;
    const decimals = (txt.split(".")[1] || "").length, o = { v: 0 };
    el.textContent = (0).toFixed(decimals);
    gsap.to(o, {
      v: target,
      duration: 1.5,
      delay,
      ease: "power2.out",
      onUpdate: () => { el.textContent = o.v.toFixed(decimals); }
    });
  }

  function playHero() {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.to(".nav__inner", { y: 0, autoAlpha: 1, duration: 0.8 }, 0)
      .to(".hero-badge", { y: 0, autoAlpha: 1, duration: 0.8 }, 0.05)
      .to(heroTitleWords, { yPercent: 0, duration: 1.0, stagger: 0.04 }, 0.1)
      .to(".hero__lead", { y: 0, autoAlpha: 1, duration: 0.9 }, 0.35)
      .to(".hero__cta > *", { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.06 }, 0.45)
      .to(".stats .stat", { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.05 }, 0.5)
      .add(() => {
        $$(".stats [data-count]").forEach((el, i) => countUp(el, i * 0.04));
        if (lenis) lenis.start();
      }, 0.55);
  }

  if (loader) {
    const count = $(".loader__count", loader);
    const barFill = $(".loader__bar span", loader);
    const o = { v: 0 };
    loader.style.animation = "none";
    gsap.timeline()
      .to(o, {
        v: 100,
        duration: 0.75, // Snappy & instant feel
        ease: "power2.inOut",
        onUpdate: () => {
          if (count) count.textContent = Math.round(o.v);
          if (barFill) barFill.style.width = o.v + "%";
        }
      })
      .to(loader, { yPercent: -100, duration: 0.65, ease: "power3.inOut" }, "+=0.05")
      .add(playHero, "-=0.35")
      .add(() => {
        loader.remove();
        if (lenis) lenis.start();
      });
  } else {
    playHero();
  }

  // Hero Parallax on Scroll
  gsap.to(".hero__inner", {
    yPercent: -15,
    autoAlpha: 0.2,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

  /* =========================================================
     6. Marquee Skew on Scroll
     ========================================================= */
  const track = $(".marquee__track");
  if (lenis && track) {
    const skew = gsap.quickTo(track, "skewX", { duration: 0.4, ease: "power3" });
    lenis.on("scroll", ({ velocity }) => {
      skew(Math.max(-8, Math.min(8, -velocity * 0.25)));
    });
  }

  /* =========================================================
     7. Section Headings & Card Reveals
     ========================================================= */
  $$("main h2[data-split]").forEach((h) => {
    const words = split(h);
    if (words.length) {
      gsap.from(words, {
        yPercent: 105,
        duration: 1.0,
        stagger: 0.04,
        ease: "power4.out",
        scrollTrigger: { trigger: h, start: "top 88%" }
      });
    }
  });

  $$(".section__head .eyebrow, .section__intro, .subhead").forEach((el) => {
    gsap.from(el, {
      y: 25,
      autoAlpha: 0,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%" }
    });
  });

  // Staggered Block Reveal
  const blocks = $$([
    ".grid > .card", ".grid > figure", ".stack > figure", ".fig--wide", ".insight-card",
    ".chips .chip", ".pipeline li", ".chart-card", ".callout", ".demo-presets",
    ".demo > .card", ".tree-card", ".tabs", "#nbGrid > .card", "#testCards > .card"
  ].join(",")).filter((el) => !el.closest(".hero") && !el.closest(".tabpanel"));

  gsap.set(blocks, { y: 40, autoAlpha: 0 });
  ScrollTrigger.batch(blocks, {
    start: "top 92%",
    onEnter: (batch) => gsap.to(batch, {
      y: 0,
      autoAlpha: 1,
      duration: 0.9,
      stagger: 0.06,
      ease: "power3.out",
      overwrite: true,
      onStart() { batch.forEach((b) => { b.style.transition = "none"; }); },
      onComplete() { gsap.set(batch, { clearProps: "transform,transition" }); }
    })
  });

  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  $$(".tabs button, .seg button").forEach((b) => b.addEventListener("click", () => setTimeout(refresh, 80)));
  $$("details").forEach((d) => d.addEventListener("toggle", refresh));

  /* =========================================================
     8. Magnetic Buttons (Fine pointer only)
     ========================================================= */
  if (FINE) {
    $$(".btn, .nav__toggle, .nav__github").forEach((btn) => {
      const xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" });
      const yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" });
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.2);
        yTo((e.clientY - r.top - r.height / 2) * 0.25);
      });
      btn.addEventListener("mouseleave", () => {
        xTo(0);
        yTo(0);
      });
    });
  }

  /* =========================================================
     9. Custom Interactive Cursor
     ========================================================= */
  const cursor = $(".cursor");
  if (cursor && FINE) {
    const dot = $(".cursor__dot", cursor), ring = $(".cursor__ring", cursor);
    const dx = gsap.quickTo(dot, "x", { duration: 0.08 });
    const dy = gsap.quickTo(dot, "y", { duration: 0.08 });
    const rx = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
    const ry = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });

    window.addEventListener("mousemove", (e) => {
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      cursor.classList.remove("is-hidden");
    }, { passive: true });

    document.addEventListener("mouseleave", () => cursor.classList.add("is-hidden"));

    document.addEventListener("mouseover", (e) => {
      const t = e.target;
      cursor.classList.toggle("is-view", !!t.closest(".fig img"));
      cursor.classList.toggle("is-link", !t.closest(".fig img") && !!t.closest("a, button, select, input, label, summary, .chip, .preset-btn"));
    });
  }

  /* ======================================================================
     10. 3D Neural Connectome / Brain Network (Three.js r128)
     A 3D biological connectome with anatomical nodes, axonal tracts & synapses
     ====================================================================== */
  function initConnectome() {
    const canvas = $(".hero__canvas");
    if (!canvas || !window.THREE) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
    } catch (e) {
      return;
    }

    if (!renderer.getContext()) return;
    root.classList.add("has-webgl");

    const small = window.innerWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 7;

    const group = new THREE.Group();
    scene.add(group);

    // Generate 48 anatomical brain coordinates (left & right hemispheres)
    const baseNodes = [
      // Prefrontal Cortex
      [0.6, 0.8, 1.2], [-0.6, 0.8, 1.2],
      [1.1, 0.5, 0.9], [-1.1, 0.5, 0.9],
      [0.3, 1.2, 0.6], [-0.3, 1.2, 0.6],
      [0.9, 1.0, 0.3], [-0.9, 1.0, 0.3],
      // Parietal & Motor Cortex
      [1.4, 0.7, -0.2], [-1.4, 0.7, -0.2],
      [0.6, 1.4, -0.4], [-0.6, 1.4, -0.4],
      [1.2, 1.1, -0.8], [-1.2, 1.1, -0.8],
      // Temporal Lobes
      [1.7, -0.2, 0.2], [-1.7, -0.2, 0.2],
      [1.6, -0.5, -0.6], [-1.6, -0.5, -0.6],
      [1.4, -0.1, 0.8], [-1.4, -0.1, 0.8],
      // Occipital Cortex (Visual)
      [0.5, 0.2, -1.6], [-0.5, 0.2, -1.6],
      [0.9, 0.6, -1.4], [-0.9, 0.6, -1.4],
      [0.3, 0.8, -1.5], [-0.3, 0.8, -1.5],
      // Subcortical & Thalamic Regions
      [0.4, 0.1, 0.1], [-0.4, 0.1, 0.1],
      [0.5, -0.4, -0.2], [-0.5, -0.4, -0.2],
      [0.2, -0.2, 0.5], [-0.2, -0.2, 0.5],
      // Cerebellum & Brainstem
      [0.7, -1.1, -1.1], [-0.7, -1.1, -1.1],
      [0.4, -1.3, -0.8], [-0.4, -1.3, -0.8],
      [0.1, -1.4, -0.3], [-0.1, -1.4, -0.3]
    ];

    const nodePositions = baseNodes.map(([x, y, z]) => new THREE.Vector3(x * 1.35, y * 1.35, z * 1.35));

    // Connectome Tracts (Lines between nearby nodes)
    const linePositions = [];
    const lineColors = [];
    const tracts = [];

    const colorA = new THREE.Color("#06b6d4"); // Electric Cyan
    const colorB = new THREE.Color("#2563eb"); // Neural Blue
    const colorC = new THREE.Color("#f97316"); // ADHD signal orange

    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        const d = nodePositions[i].distanceTo(nodePositions[j]);
        // Connect if close enough or contralateral homologous connection
        const isHomolog = Math.abs(nodePositions[i].x + nodePositions[j].x) < 0.2 && Math.abs(nodePositions[i].y - nodePositions[j].y) < 0.2;
        if (d < 1.6 || (isHomolog && d < 2.8)) {
          linePositions.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
          linePositions.push(nodePositions[j].x, nodePositions[j].y, nodePositions[j].z);

          const c = isHomolog ? colorC : (i % 3 === 0 ? colorA : colorB);
          lineColors.push(c.r, c.g, c.b);
          lineColors.push(c.r, c.g, c.b);

          tracts.push({ p1: nodePositions[i], p2: nodePositions[j], color: c });
        }
      }
    }

    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    linesGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));

    const linesMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending
    });
    const connectomeLines = new THREE.LineSegments(linesGeo, linesMat);
    group.add(connectomeLines);

    // Glowing Neural Nodes (Spheres)
    const nodeSpheres = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(0.065, 16, 16);
    nodePositions.forEach((pos, idx) => {
      const isAdhdHub = idx % 5 === 0;
      const mat = new THREE.MeshBasicMaterial({
        color: isAdhdHub ? 0xf97316 : (idx % 2 === 0 ? 0x22d3ee : 0x3b82f6),
        transparent: true,
        opacity: 0.95
      });
      const sphere = new THREE.Mesh(sphereGeo, mat);
      sphere.position.copy(pos);
      nodeSpheres.add(sphere);
    });
    group.add(nodeSpheres);

    // Synaptic Signal Impulses (Particles moving along tracts)
    const N_SIGNALS = 40;
    const signalData = [];
    const sigGeo = new THREE.BufferGeometry();
    const sigPos = new Float32Array(N_SIGNALS * 3);

    for (let i = 0; i < N_SIGNALS; i++) {
      const tract = tracts[Math.floor(Math.random() * tracts.length)] || tracts[0];
      signalData.push({
        tract,
        progress: Math.random(),
        speed: 0.35 + Math.random() * 0.45
      });
    }

    sigGeo.setAttribute("position", new THREE.BufferAttribute(sigPos, 3));
    const sigMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const signalPoints = new THREE.Points(sigGeo, sigMat);
    group.add(signalPoints);

    // Ambient Micro-Particle Halo
    const N_PARTICLES = small ? 400 : 900;
    const pPos = new Float32Array(N_PARTICLES * 3);
    for (let i = 0; i < N_PARTICLES; i++) {
      const r = 2.2 + Math.random() * 2.2;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pPos[i * 3 + 2] = r * Math.cos(ph);
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.024,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(partGeo, partMat);
    group.add(particles);

    // Responsive Canvas Resize
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      const wide = w / h > 1.2;
      // Position brain in right hemisphere of hero view
      group.position.set(wide ? Math.min(2.7, 1.25 * camera.aspect) : 0.4, wide ? 0.3 : 0.8, 0);
      group.scale.setScalar(wide ? 1.05 : 0.82);
    }
    resize();
    window.addEventListener("resize", resize);

    // Mouse Tracking
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener("pointermove", (e) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 1.5;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 1.5;
    }, { passive: true });

    // Animation Loop
    let visible = true, last = performance.now(), t = 0;
    function animate(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      const heroH = hero ? hero.offsetHeight : window.innerHeight;
      const scrollRatio = Math.min(1, Math.max(0, window.scrollY / heroH));

      // Gentle organic rotation + mouse tilt
      group.rotation.y = t * 0.15 + mouse.x * 0.5;
      group.rotation.x = Math.sin(t * 0.1) * 0.1 - mouse.y * 0.4 + scrollRatio * 0.3;
      particles.rotation.y = -t * 0.03;

      // Animate synaptic signal impulses along connectome tracts
      const posAttr = sigGeo.attributes.position;
      for (let i = 0; i < N_SIGNALS; i++) {
        const sig = signalData[i];
        sig.progress += sig.speed * dt;
        if (sig.progress >= 1) {
          sig.progress = 0;
          sig.tract = tracts[Math.floor(Math.random() * tracts.length)] || tracts[0];
        }
        const p = new THREE.Vector3().lerpVectors(sig.tract.p1, sig.tract.p2, sig.progress);
        posAttr.setXYZ(i, p.x, p.y, p.z);
      }
      posAttr.needsUpdate = true;

      // Pulse node spheres gently
      nodeSpheres.children.forEach((sphere, i) => {
        const s = 1 + Math.sin(t * 2 + i) * 0.25;
        sphere.scale.setScalar(s);
      });

      renderer.render(scene, camera);
      if (visible && !REDUCED) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    if (hero) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !REDUCED) {
          last = performance.now();
          requestAnimationFrame(animate);
        }
      }).observe(hero);
    }
  }
})();
