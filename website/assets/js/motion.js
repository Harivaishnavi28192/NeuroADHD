/* NeuroADHD: motion layer (loader, smooth scroll, reveals, cursor, WebGL hero).
   Everything here is progressive: without GSAP/Lenis/Three, or with reduced motion,
   the page simply shows all content without animation. */
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

  /* ---------- nav: solid after the hero, hide on scroll down, menu state ---------- */
  let lastY = window.scrollY;
  function navState() {
    const y = window.scrollY;
    const limit = hero ? hero.offsetHeight - nav.offsetHeight - 10 : 200;
    nav.classList.toggle("is-solid", y > limit);
    const goingDown = y > lastY + 2, goingUp = y < lastY - 2;
    if (goingDown && y > limit + 300 && !menu.classList.contains("open")) nav.classList.add("is-hidden");
    if (goingUp || y < limit) nav.classList.remove("is-hidden");
    lastY = y;
  }
  window.addEventListener("scroll", navState, { passive: true });
  navState();

  new MutationObserver(() => {
    const open = menu.classList.contains("open");
    nav.classList.toggle("menu-open", open);
    if (open) nav.classList.remove("is-hidden");
    if (lenis) { open ? lenis.stop() : lenis.start(); } else { document.body.style.overflow = open ? "hidden" : ""; }
  }).observe(menu, { attributes: true, attributeFilter: ["class"] });

  // pause smooth scrolling while the figure lightbox is open
  const lb = $("#lightbox");
  if (lb) new MutationObserver(() => { if (lenis) { lb.hidden ? lenis.start() : lenis.stop(); } }).observe(lb, { attributes: true, attributeFilter: ["hidden"] });

  /* ---------- WebGL hero: a slowly morphing "brain" blob ---------- */
  initBlob();

  if (!MOTION) {
    root.classList.remove("motion");
    if (loader) loader.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scrolling ---------- */
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  // in-page links glide to their section (header lands just below the menu bar)
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !lenis) return;
    const id = a.getAttribute("href");
    if (id === "#" ) return;
    const target = id === "#top" ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    lenis.start();
    const dest = typeof target === "number" ? 0 : (target.querySelector(".section__head") || target);
    const offset = typeof dest === "number" ? 0 : -(nav.offsetHeight + 24);
    // glide there, then re-aim once in case images above finished loading on the way
    lenis.scrollTo(dest, { offset, duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4),
      onComplete: () => { if (typeof dest !== "number" && Math.abs(dest.getBoundingClientRect().top + offset) > 4) lenis.scrollTo(dest, { offset, duration: 0.6 }); } });
  });

  /* ---------- split text into words that slide up ---------- */
  function split(el) {
    const words = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const outer = document.createElement("span"); outer.className = "sw";
            const inner = document.createElement("span"); inner.textContent = part;
            outer.appendChild(inner); frag.appendChild(outer); words.push(inner);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return words;
  }

  /* ---------- count-up numbers ---------- */
  function countUp(el, delay) {
    const txt = el.textContent.trim(), target = parseFloat(txt);
    if (Number.isNaN(target)) return;
    const decimals = (txt.split(".")[1] || "").length, o = { v: 0 };
    el.textContent = (0).toFixed(decimals);
    gsap.to(o, { v: target, duration: 1.8, delay, ease: "power3.out", onUpdate: () => { el.textContent = o.v.toFixed(decimals); } });
  }

  /* ---------- intro: loader, then hero ---------- */
  const heroTitleWords = split($(".hero__title"));
  gsap.set(heroTitleWords, { yPercent: 115 });
  gsap.set([".hero__eyebrow", ".hero__lead", ".hero__cta > *", ".stats .stat"], { y: 30, autoAlpha: 0 });
  gsap.set([".nav__inner"], { y: -20, autoAlpha: 0 });

  function playHero() {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.to(".nav__inner", { y: 0, autoAlpha: 1, duration: 1 }, 0)
      .to(".hero__eyebrow", { y: 0, autoAlpha: 1, duration: 1 }, 0.1)
      .to(heroTitleWords, { yPercent: 0, duration: 1.3, stagger: 0.06 }, 0.15)
      .to(".hero__lead", { y: 0, autoAlpha: 1, duration: 1.1 }, 0.55)
      .to(".hero__cta > *", { y: 0, autoAlpha: 1, duration: 1, stagger: 0.08 }, 0.7)
      .to(".stats .stat", { y: 0, autoAlpha: 1, duration: 1, stagger: 0.06 }, 0.8)
      .add(() => { $$(".stats [data-count]").forEach((el, i) => countUp(el, i * 0.05)); if (lenis) lenis.start(); }, 0.8);
  }

  if (loader) {
    const count = $(".loader__count", loader), barFill = $(".loader__bar span", loader), o = { v: 0 };
    loader.style.animation = "none";
    gsap.timeline()
      .to(o, { v: 100, duration: 1.7, ease: "power2.inOut", onUpdate: () => { count.textContent = Math.round(o.v); barFill.style.width = o.v + "%"; } })
      .to(loader, { yPercent: -100, duration: 1, ease: "power4.inOut" }, "+=0.15")
      .add(playHero, "-=0.45")
      .add(() => loader.remove());
  } else {
    playHero();
  }

  /* ---------- hero parallax on scroll ---------- */
  gsap.to(".hero__inner", { yPercent: -18, autoAlpha: 0.15, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  /* ---------- marquee leans with scroll speed ---------- */
  const track = $(".marquee__track");
  if (lenis && track) {
    const skew = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3" });
    lenis.on("scroll", ({ velocity }) => skew(Math.max(-12, Math.min(12, -velocity * 0.4))));
  }

  /* ---------- section headings ---------- */
  $$("main h2[data-split]").forEach((h) => {
    const words = split(h);
    gsap.from(words, { yPercent: 115, duration: 1.2, stagger: 0.05, ease: "power4.out", scrollTrigger: { trigger: h, start: "top 88%" } });
  });
  $$(".section__head .eyebrow, .section__intro, .subhead").forEach((el) => {
    gsap.from(el, { y: 30, autoAlpha: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } });
  });

  /* ---------- cards & blocks fade up in sequence ---------- */
  const blocks = $$([
    ".grid > .card", ".grid > figure", ".stack > figure", ".fig--wide", ".insight", ".chips .chip", ".pipeline li",
    ".chart-card", ".callout", ".demo > .card", ".tree", ".tabs", "#nbGrid > .card", "#testCards > .card"
  ].join(",")).filter((el) => !el.closest(".hero") && !el.closest(".tabpanel"));
  gsap.set(blocks, { y: 60, autoAlpha: 0 });
  ScrollTrigger.batch(blocks, {
    start: "top 92%",
    onEnter: (batch) => gsap.to(batch, {
      y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.08, ease: "power3.out", overwrite: true,
      onStart() { batch.forEach((b) => { b.style.transition = "none"; }); },
      onComplete() { gsap.set(batch, { clearProps: "transform,transition" }); },
    }),
  });

  /* ---------- figures wipe in, with a gentle zoom ---------- */
  $$(".fig img").filter((img) => !img.closest(".tabpanel")).forEach((img) => {
    gsap.fromTo(img, { clipPath: "inset(0 0 100% 0)", scale: 1.12 }, {
      clipPath: "inset(0 0 0% 0)", scale: 1, duration: 1.5, ease: "power4.out",
      scrollTrigger: { trigger: img.closest("figure"), start: "top 85%" },
      onStart() { img.style.transition = "none"; },
      onComplete() { gsap.set(img, { clearProps: "transform,transition" }); },
    });
  });

  // layout changes (tabs, tables, images) need the trigger positions recalculated
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  $$(".tabs button, .seg button").forEach((b) => b.addEventListener("click", () => setTimeout(refresh, 60)));
  $$("details").forEach((d) => d.addEventListener("toggle", refresh));

  /* ---------- magnetic buttons ---------- */
  if (FINE) {
    $$(".btn, .nav__toggle").forEach((btn) => {
      const xTo = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3" }), yTo = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3" });
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25); yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      btn.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- custom cursor ---------- */
  const cursor = $(".cursor");
  if (cursor && FINE) {
    const dot = $(".cursor__dot", cursor), ring = $(".cursor__ring", cursor);
    const dx = gsap.quickTo(dot, "x", { duration: 0.1 }), dy = gsap.quickTo(dot, "y", { duration: 0.1 });
    const rx = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
    window.addEventListener("mousemove", (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); cursor.classList.remove("is-hidden"); }, { passive: true });
    document.addEventListener("mouseleave", () => cursor.classList.add("is-hidden"));
    document.addEventListener("mouseover", (e) => {
      const t = e.target;
      cursor.classList.toggle("is-view", !!t.closest(".fig img"));
      cursor.classList.toggle("is-link", !t.closest(".fig img") && !!t.closest("a, button, select, input, label, summary, .chip"));
    });
  }

  /* ======================================================================
     WebGL blob (Three.js r128): noise-displaced sphere + neuron particles
     ====================================================================== */
  function initBlob() {
    const canvas = $(".hero__canvas");
    if (!canvas || !window.THREE) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); }
    catch (err) { return; }
    if (!renderer.getContext()) return;
    root.classList.add("has-webgl");

    const small = window.innerWidth < 760;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.z = 6;

    const noise = `
      vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
      float snoise(vec3 v){
        const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
        vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
        vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
        vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
        i=mod289(i);
        vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
        float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
        vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
        vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
        vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
        vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
        vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
        vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
        vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
        p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
        vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
        return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
      }`;
    const uniforms = {
      uTime: { value: 0 }, uAmp: { value: 0.32 }, uFreq: { value: 1.25 }, uMouse: { value: new THREE.Vector2() },
      uColA: { value: new THREE.Color("#0b2234") }, uColB: { value: new THREE.Color("#2779a7") }, uColC: { value: new THREE.Color("#a9dcff") },
    };
    const vertex = noise + `
      uniform float uTime; uniform float uAmp; uniform float uFreq; uniform vec2 uMouse;
      varying float vDist; varying vec3 vNormal; varying vec3 vView;
      void main(){
        float n = snoise(normal*uFreq + vec3(uTime*0.22, uTime*0.17, uTime*0.11) + vec3(uMouse, 0.0)*0.5);
        float n2 = snoise(normal*uFreq*2.4 - uTime*0.14) * 0.35;
        float d = (n + n2) * uAmp;
        vDist = d;
        vec3 p = position + normal * d;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vView = -mv.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`;
    const fragment = `
      uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC;
      varying float vDist; varying vec3 vNormal; varying vec3 vView;
      void main(){
        float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.2);
        vec3 col = mix(uColA, uColB, smoothstep(-0.3, 0.35, vDist));
        col = mix(col, uColC, fres * 0.85);
        gl_FragColor = vec4(col, 1.0);
      }`;
    const wireFragment = `varying float vDist; void main(){ gl_FragColor = vec4(0.75, 0.9, 1.0, 0.07 + smoothstep(0.0, 0.4, vDist) * 0.12); }`;

    const geo = new THREE.IcosahedronGeometry(1.45, small ? 24 : 44);
    const blob = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment }));
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.452, small ? 10 : 18),
      new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: wireFragment, wireframe: true, transparent: true, depthWrite: false }));
    const group = new THREE.Group();
    group.add(blob); group.add(wire);

    // "neurons": a halo of particles
    const N = small ? 500 : 1100, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 2.1 + Math.random() * 1.4, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); pos[i * 3 + 2] = r * Math.cos(ph);
    }
    const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0x6fb7e3, size: 0.022, transparent: true, opacity: 0.55, depthWrite: false }));
    group.add(points);
    scene.add(group);

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const wide = w / h > 1.15;
      // keep the blob in the upper right, clear of the text and the number boxes
      group.position.set(wide ? Math.min(2.8, 1.32 * camera.aspect) : 0.6, wide ? 0.42 : 0.9, 0);
      group.scale.setScalar(wide ? 0.86 : 0.8);
    }
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener("pointermove", (e) => { mouse.tx = e.clientX / window.innerWidth - 0.5; mouse.ty = e.clientY / window.innerHeight - 0.5; }, { passive: true });

    let visible = true, raf = 0, last = performance.now(), t = 0;
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
      const heroH = hero ? hero.offsetHeight : window.innerHeight;
      const progress = Math.min(1, Math.max(0, window.scrollY / heroH));
      uniforms.uTime.value = t;
      uniforms.uMouse.value.set(mouse.x, mouse.y);
      uniforms.uAmp.value = 0.32 + progress * 0.35;
      group.rotation.y = t * 0.08 + mouse.x * 0.6;
      group.rotation.x = mouse.y * 0.4;
      points.rotation.y = -t * 0.03;
      renderer.render(scene, camera);
      if (visible && !REDUCED) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    if (hero) new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !REDUCED) { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }
    }).observe(hero);
  }
})();
