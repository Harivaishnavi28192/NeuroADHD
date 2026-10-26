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
     2. Initialize 3D Neural Sphere Blob (Three.js)
     ========================================================= */
  initBlob();

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
     10. WebGL 3D Brain Blob (Three.js r128): noise-displaced sphere + wireframe + neuron particles
     ====================================================================== */
  function initBlob() {
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
      uTime: { value: 0 },
      uAmp: { value: 0.32 },
      uFreq: { value: 1.25 },
      uMouse: { value: new THREE.Vector2() },
      uColA: { value: new THREE.Color("#0a1526") },
      uColB: { value: new THREE.Color("#2563eb") },
      uColC: { value: new THREE.Color("#38bdf8") },
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
    const wireFragment = `varying float vDist; void main(){ gl_FragColor = vec4(0.22, 0.83, 0.93, 0.09 + smoothstep(0.0, 0.4, vDist) * 0.14); }`;

    const geo = new THREE.IcosahedronGeometry(1.45, small ? 24 : 44);
    const blob = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment }));
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.452, small ? 10 : 18),
      new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: wireFragment, wireframe: true, transparent: true, depthWrite: false })
    );
    const group = new THREE.Group();
    group.add(blob);
    group.add(wire);

    // "neurons": a halo of particles
    const N = small ? 500 : 1100, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 2.1 + Math.random() * 1.4, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(
      pgeo,
      new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.024, transparent: true, opacity: 0.65, depthWrite: false })
    );
    group.add(points);
    scene.add(group);

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const wide = w / h > 1.15;
      // keep the blob in the upper right, clear of the text and the number boxes
      group.position.set(wide ? Math.min(2.8, 1.32 * camera.aspect) : 0.6, wide ? 0.38 : 0.85, 0);
      group.scale.setScalar(wide ? 0.95 : 0.82);
    }
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener("pointermove", (e) => {
      mouse.tx = e.clientX / window.innerWidth - 0.5;
      mouse.ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    let visible = true, raf = 0, last = performance.now(), t = 0;
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      const heroH = hero ? hero.offsetHeight : window.innerHeight;
      const progress = Math.min(1, Math.max(0, window.scrollY / heroH));
      uniforms.uTime.value = t;
      uniforms.uMouse.value.set(mouse.x, mouse.y);
      uniforms.uAmp.value = 0.32 + progress * 0.35;
      group.rotation.y = t * 0.08 + mouse.x * 0.6;
      group.rotation.x = mouse.y * 0.4;
      points.rotation.y = -t * 0.03;
      renderer.render(scene, camera);
      if (visible) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    if (hero) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) {
          cancelAnimationFrame(raf);
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      }).observe(hero);
    }
  }
})();
