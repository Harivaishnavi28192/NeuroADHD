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
     10. 3D Neural Connectome (Three.js r128)
     Interactive biological connectome network with anatomical hubs,
     axonal tracts, synaptic signal impulses, and targeting indicator
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
    } catch (err) {
      return;
    }
    if (!renderer.getContext()) return;
    root.classList.add("has-webgl");

    const small = window.innerWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 6.8;

    const group = new THREE.Group();
    scene.add(group);

    // Anatomical Brain Connectome Nodes with custom sizes & colors
    const nodeDefs = [
      // Prefrontal Cortex (Anterior Hubs)
      { pos: [0.65, 0.85, 1.3], size: 0.18, type: "adhd" },
      { pos: [-0.65, 0.85, 1.3], size: 0.15, type: "teal" },
      { pos: [1.2, 0.5, 1.0], size: 0.13, type: "blue" },
      { pos: [-1.2, 0.5, 1.0], size: 0.16, type: "teal" },
      { pos: [0.35, 1.3, 0.7], size: 0.22, type: "adhd" }, // Large anterior hub
      { pos: [-0.35, 1.3, 0.7], size: 0.14, type: "blue" },
      { pos: [0.95, 1.05, 0.35], size: 0.12, type: "teal" },
      { pos: [-0.95, 1.05, 0.35], size: 0.15, type: "blue", hasRing: true }, // Targeted active hub with ring!

      // Motor & Somatosensory (Dorsal Strip)
      { pos: [1.45, 0.75, -0.2], size: 0.19, type: "teal" },
      { pos: [-1.45, 0.75, -0.2], size: 0.13, type: "adhd" },
      { pos: [0.65, 1.45, -0.4], size: 0.16, type: "blue" },
      { pos: [-0.65, 1.45, -0.4], size: 0.12, type: "teal" },
      { pos: [1.25, 1.15, -0.85], size: 0.24, type: "adhd" }, // Large prominent orange hub (top-right)
      { pos: [-1.25, 1.15, -0.85], size: 0.15, type: "blue" },

      // Temporal Lobes (Lateral Inferior)
      { pos: [1.8, -0.2, 0.25], size: 0.17, type: "teal" },
      { pos: [-1.8, -0.2, 0.25], size: 0.21, type: "blue" }, // Large lateral blue hub
      { pos: [1.65, -0.55, -0.65], size: 0.12, type: "teal" },
      { pos: [-1.65, -0.55, -0.65], size: 0.14, type: "adhd" },
      { pos: [1.45, -0.15, 0.85], size: 0.16, type: "blue" },
      { pos: [-1.45, -0.15, 0.85], size: 0.13, type: "teal" },

      // Parietal & Occipital (Posterior Visual)
      { pos: [0.55, 0.25, -1.65], size: 0.15, type: "teal" },
      { pos: [-0.55, 0.25, -1.65], size: 0.17, type: "blue" },
      { pos: [0.95, 0.65, -1.45], size: 0.13, type: "teal" },
      { pos: [-0.95, 0.65, -1.45], size: 0.20, type: "adhd" },
      { pos: [0.35, 0.85, -1.55], size: 0.14, type: "blue" },
      { pos: [-0.35, 0.85, -1.55], size: 0.12, type: "teal" },

      // Subcortical / Default Mode Network (Central Core)
      { pos: [0.45, 0.15, 0.15], size: 0.24, type: "blue" }, // Prominent central blue hub
      { pos: [-0.45, 0.15, 0.15], size: 0.18, type: "teal" },
      { pos: [0.55, -0.45, -0.25], size: 0.15, type: "adhd" },
      { pos: [-0.55, -0.45, -0.25], size: 0.16, type: "blue" },
      { pos: [0.25, -0.25, 0.55], size: 0.17, type: "teal" },
      { pos: [-0.25, -0.25, 0.55], size: 0.14, type: "adhd" },

      // Cerebellum & Brainstem (Inferior Posterior)
      { pos: [0.75, -1.15, -1.15], size: 0.18, type: "blue" },
      { pos: [-0.75, -1.15, -1.15], size: 0.15, type: "teal" },
      { pos: [0.45, -1.35, -0.85], size: 0.19, type: "adhd" },
      { pos: [-0.45, -1.35, -0.85], size: 0.16, type: "teal" },
      { pos: [0.15, -1.45, -0.35], size: 0.17, type: "blue" },
      { pos: [-0.15, -1.45, -0.35], size: 0.13, type: "teal" }
    ];

    const nodePositions = nodeDefs.map((d) => new THREE.Vector3(d.pos[0] * 1.35, d.pos[1] * 1.35, d.pos[2] * 1.35));

    // Connectome Tracts (Lines between nearby and homologous nodes)
    const linePositions = [];
    const lineColors = [];
    const tracts = [];

    const colTeal = new THREE.Color("#22d3ee");
    const colBlue = new THREE.Color("#3b82f6");
    const colOrange = new THREE.Color("#f97316");

    function getNodeColor(type) {
      if (type === "adhd") return colOrange;
      if (type === "teal") return colTeal;
      return colBlue;
    }

    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        const d = nodePositions[i].distanceTo(nodePositions[j]);
        const isHomolog = Math.abs(nodePositions[i].x + nodePositions[j].x) < 0.25 && Math.abs(nodePositions[i].y - nodePositions[j].y) < 0.25;
        if (d < 1.75 || (isHomolog && d < 2.9)) {
          linePositions.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
          linePositions.push(nodePositions[j].x, nodePositions[j].y, nodePositions[j].z);

          const c1 = getNodeColor(nodeDefs[i].type);
          const c2 = getNodeColor(nodeDefs[j].type);
          lineColors.push(c1.r, c1.g, c1.b);
          lineColors.push(c2.r, c2.g, c2.b);

          tracts.push({ p1: nodePositions[i], p2: nodePositions[j] });
        }
      }
    }

    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    linesGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));

    const linesMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending
    });
    const connectomeLines = new THREE.LineSegments(linesGeo, linesMat);
    group.add(connectomeLines);

    // Glowing Neural Nodes (Spheres with custom radius)
    const nodeSpheres = new THREE.Group();
    const ringGroup = new THREE.Group();

    nodeDefs.forEach((def, idx) => {
      const pos = nodePositions[idx];
      const color = getNodeColor(def.type);
      const geo = new THREE.SphereGeometry(def.size, 20, 20);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.copy(pos);
      nodeSpheres.add(sphere);

      // Targeted Active Hub Ring (as seen on the mid-left node in reference screenshot)
      if (def.hasRing) {
        const ringGeo = new THREE.RingGeometry(def.size * 1.55, def.size * 1.72, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: colTeal,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ringGroup.add(ring);
      }
    });
    group.add(nodeSpheres);
    group.add(ringGroup);

    // Synaptic Signal Impulses (Particles streaming along tracts)
    const N_SIGNALS = 55;
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

    // Ambient Micro-Particle Field (Neural voxels / space dust)
    const N_PARTICLES = small ? 350 : 750;
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
      size: 0.035,
      transparent: true,
      opacity: 0.5,
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

      const wide = w / h > 1.15;
      // Position connectome in right hemisphere of hero view
      group.position.set(wide ? Math.min(2.2, 1.15 * camera.aspect) : 0.25, wide ? 0.2 : 0.65, 0);
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

      // Organic rotation + interactive mouse tilt
      group.rotation.y = t * 0.12 + mouse.x * 0.5;
      group.rotation.x = Math.sin(t * 0.08) * 0.08 - mouse.y * 0.35 + scrollRatio * 0.25;
      particles.rotation.y = -t * 0.02;

      // Animate synaptic impulses along tracts
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

      // Gentle rhythmic pulsing of node spheres
      nodeSpheres.children.forEach((sphere, i) => {
        const s = 1 + Math.sin(t * 2 + i * 0.5) * 0.12;
        sphere.scale.setScalar(s);
      });

      // Pulse and orient targeting ring toward camera
      ringGroup.children.forEach((ring) => {
        const s = 1 + Math.sin(t * 3) * 0.14;
        ring.scale.setScalar(s);
        ring.quaternion.copy(camera.quaternion);
      });

      renderer.render(scene, camera);
      if (visible) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    if (hero) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) {
          last = performance.now();
          requestAnimationFrame(animate);
        }
      }).observe(hero);
    }
  }
})();
