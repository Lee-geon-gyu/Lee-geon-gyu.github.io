console.clear();

AOS.init();
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
gsap.registerPlugin(SplitText);

// GSAP loading ------------------------------ //
let preventScroll;
let preventKey;

function disableUserInput() {
  $("html, body").css({
    overflow: "hidden",
    height: "100%",
  });

  preventScroll = function (e) {
    e.preventDefault();
  };

  window.addEventListener("wheel", preventScroll, { passive: false });
  window.addEventListener("touchmove", preventScroll, { passive: false });

  preventKey = function (e) {
    const keys = [32, 37, 38, 39, 40];
    if (keys.includes(e.keyCode)) {
      e.preventDefault();
    }
  };

  document.addEventListener("keydown", preventKey);
}

function enableUserInput() {
  $("html, body").css({
    overflow: "",
    height: "",
  });

  window.removeEventListener("wheel", preventScroll);
  window.removeEventListener("touchmove", preventScroll);
  document.removeEventListener("keydown", preventKey);
}

function loading__init() {
  window.addEventListener("load", () => {
    disableUserInput();

    const tl = gsap.timeline();

    tl.to(".loading-text", {
      duration: 1,
      opacity: 1,
    });

    tl.to(".loading-text", {
      y: "-100%",
      duration: 0.8,
      ease: "power2.inOut",
      delay: 1.2,
    })

      .to(
        ".loading-name",
        {
          y: "0%",
          duration: 0.8,
          ease: "power2.inOut",
        },
        "<",
      )

      .to(".loading-name", {
        scaleY: 0,
        duration: 0.6,
        delay: 1.2,
      })

      .to(
        ".door-left",
        {
          x: "-100%",
          duration: 0.6,
          onStart: () => {
            initAfterLoading();
          },
        },
        "open",
      )

      .to(
        ".door-right",
        {
          x: "100%",
          duration: 0.6,
        },
        "open",
      )

      .to(".loading", {
        opacity: 0,
        duration: 0.5,

        onComplete: () => {
          document.querySelector(".loading").remove();

          enableUserInput();

          setTimeout(() => {
            ScrollTrigger.refresh();
          }, 100);
        },
      });
  });
}
// GSAP scrollHorizon ------------------------------ //
let scrollTween;

function scrollHorizon__init() {
  const mm = gsap.matchMedia();

  mm.add("(min-width:1281px)", () => {
    const sections = gsap.utils.toArray(".horizontal-section");

    scrollTween = gsap.to(sections, {
      xPercent: -100 * (sections.length - 1),
      ease: "none",
      scrollTrigger: {
        trigger: ".main",
        pin: true,
        scrub: 1,
        end: () => "+=" + window.innerWidth * (sections.length - 1),
      },
    });

    sections.forEach((section) => {
      ScrollTrigger.create({
        trigger: section,
        containerAnimation: scrollTween,
        start: "left center",
        end: "right center",
        onEnter: () => section.classList.add("active"),
        onLeaveBack: () => section.classList.remove("active"),
      });
    });

    gsap.utils.toArray("[data-ani]").forEach((el) => {
      gsap.from(el, {
        y: 80,
        stagger: 0.2,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: el,
          containerAnimation: scrollTween,
          start: "left 90%",
          toggleActions: "play none none reverse",
        },
      });
    });

    gsap.utils.toArray("[data-ani-2]").forEach((el) => {
      gsap.from(el, {
        x: -320,
        stagger: 0.2,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: el,
          containerAnimation: scrollTween,
          start: "left 90%",
          toggleActions: "play none none reverse",
        },
      });
    });

    return () => {
      scrollTween?.kill();
    };
  });

  mm.add("(max-width:1280px)", () => {
    gsap.set(".horizontal-section", {
      clearProps: "all",
    });
  });
}
// GSAP scrollLeins ------------------------------ //
let lenis;

function scrollLeins__init() {
  lenis = new Lenis({
    lerp: 0.055,
    easing: (t) => t,
    smooth: true,
    smoothTouch: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  gsap.registerPlugin(ScrollTrigger);

  lenis.on("scroll", ScrollTrigger.update);

  gsap.utils.toArray("[data-speed]").forEach((el) => {
    gsap.to(el, {
      y: () => -((el.dataset.speed * window.innerHeight) / 5),
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: "top bottom",
        scrub: true,
      },
    });
  });

  ScrollTrigger.addEventListener("refresh", () => lenis.resize());
}
// backSvgMoveTool ------------------------------ //
function backSvgMoveTool__init() {
  const sections = document.querySelectorAll("section");

  window.addEventListener("scroll", checkTrigger);
  checkTrigger();

  function checkTrigger() {
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const paths = section.querySelectorAll(".draw-line");

      if (!paths.length) return;

      const sectionMiddle = rect.left + rect.width / 2;

      if (
        sectionMiddle <= window.innerWidth &&
        sectionMiddle >= 0 &&
        !section.dataset.playing
      ) {
        section.dataset.playing = "true";

        setTimeout(() => {
          runAnimation(section);
        }, 500);
      }

      if (sectionMiddle < 0 || sectionMiddle > window.innerWidth) {
        section.dataset.playing = "";
        resetPaths(section);
      }
    });
  }

  async function runAnimation(section) {
    const paths = section.querySelectorAll(".draw-line");

    for (const path of paths) {
      const hasStroke = path.hasAttribute("stroke");

      if (hasStroke) {
        await drawStroke(path);
      } else {
        await fadeFill(path);
      }
    }
  }

  function drawStroke(path) {
    return new Promise((resolve) => {
      const length = path.getTotalLength();

      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
      path.style.opacity = 1;

      path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
        duration: 300,
        easing: "ease-in-out",
        fill: "forwards",
      });

      setTimeout(resolve, 200);
    });
  }

  function fadeFill(path) {
    return new Promise((resolve) => {
      path.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 500,
        easing: "ease-out",
        fill: "forwards",
      });

      setTimeout(resolve, 0);
    });
  }

  function resetPaths(section) {
    const paths = section.querySelectorAll(".draw-line");

    paths.forEach((path) => {
      const hasStroke = path.hasAttribute("stroke");

      path.getAnimations().forEach((anim) => anim.cancel());

      if (hasStroke) {
        const length = path.getTotalLength();

        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
      }

      path.style.opacity = 0;
    });
  }
}
// GSAP scrollToMenu ------------------------------ //
function scrollToMenu__init() {
  const sections = gsap.utils.toArray(".horizontal-section");

  document.querySelectorAll(".header a").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const index = btn.dataset.target;

      const scrollLength = ScrollTrigger.getAll()[0].end;
      const sectionScroll = scrollLength / (sections.length - 1);

      gsap.to(window, {
        scrollTo: sectionScroll * index,
        duration: 1,
      });
    });
  });
}
// setupPinAccordion ------------------------------ //
let resizeTimer;

function setupPinAccordion() {
  const section = document.querySelector("#sec-project-list");
  const items = gsap.utils.toArray(".sec-project-item");

  if (!section || items.length === 0) return;

  const isMobile = window.innerWidth <= 768;

  ScrollTrigger.getById("proj-pin")?.kill();
  gsap.killTweensOf(items);

  gsap.set(items, { clearProps: "all" });

  gsap.set(section, {
    position: "relative",
    height: window.innerHeight,
    overflow: "hidden",
  });

  gsap.set(items, {
    position: "absolute",
    top: "50%",
    left: "50%",
    xPercent: -50,
    yPercent: -50,
    width: "100%",
    clipPath: "inset(100% 0% 0% 0%)",
    opacity: 1,
    willChange: "clip-path, opacity",
  });

  gsap.set(items[0], {
    clipPath: "inset(0% 0% 0% 0%)",
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      id: "proj-pin",
      trigger: section,
      start: "top top",
      end: () => "+=" + window.innerHeight * items.length,
      pin: true,
      pinSpacing: true,
      scrub: isMobile ? 1.2 : 2.4,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  items.forEach((item, i) => {
    if (i === 0) return;

    tl.to(
      item,
      {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 1,
        ease: "power2.out",
      },
      i,
    );

    tl.to(
      items[i - 1],
      {
        opacity: 0,
        duration: 0.6,
        ease: "power1.out",
      },
      i,
    );
  });
}
// Functions Operate Key ------------------------------ //
loading__init();
function initAfterLoading() {
  scrollHorizon__init();
  scrollLeins__init();
  backSvgMoveTool__init();
  scrollToMenu__init();
  setupPinAccordion();
}
// Resize Loaded ------------------------------ //
history.scrollRestoration = "manual";

ScrollTrigger.config({
  autoRefreshEvents: "visibilitychange,DOMContentLoaded,load,resize",
});

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    setupPinAccordion();
    ScrollTrigger.refresh();
  }, 300);
});

window.addEventListener("load", () => {
  ScrollTrigger.refresh();
});
// Resize Lock ------------------------------ //
let isContactScroll = false;

document.addEventListener("DOMContentLoaded", () => {
  setupPinAccordion();
});

document.addEventListener("DOMContentLoaded", () => {
  const contactBtn = document.querySelector(".btn-3 > a");
  const footer = document.querySelector("footer");

  if (!contactBtn || !footer) return;

  contactBtn.addEventListener("click", (e) => {
    e.preventDefault();

    isContactScroll = true;

    lenis.scrollTo(footer, {
      duration: 1.2,
      onStart: () => {
        ScrollTrigger.getAll().forEach((st) => st.disable());
      },
      onComplete: () => {
        ScrollTrigger.getAll().forEach((st) => st.enable());

        setTimeout(() => {
          isContactScroll = false;
        }, 1000);
      },
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const contactBtn = document.querySelector(".btn-2 > a");
  const project = document.querySelector(".sec-project");

  if (!contactBtn || !project) return;

  const mm = gsap.matchMedia();

  mm.add("(max-width: 1280px)", () => {
    contactBtn.addEventListener("click", (e) => {
      e.preventDefault();

      isContactScroll = true;

      gsap.to(window, {
        scrollTo: {
          y: project,
          autoKill: false,
        },
        duration: 1,
        ease: "power2.out",
        onComplete: () => {
          setTimeout(() => {
            isContactScroll = false;
          }, 1000);
        },
      });
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const contactBtn = document.querySelector(".btn-1 > a");
  const about = document.querySelector(".sec-about");

  if (!contactBtn || !about) return;

  const mm = gsap.matchMedia();

  mm.add("(max-width: 1280px)", () => {
    contactBtn.addEventListener("click", (e) => {
      e.preventDefault();

      isContactScroll = true;

      gsap.to(window, {
        scrollTo: {
          y: about,
          autoKill: false,
        },
        duration: 1,
        ease: "power2.out",
        onComplete: () => {
          setTimeout(() => {
            isContactScroll = false;
          }, 1000);
        },
      });
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const contactBtn = document.querySelector(".btn-home > a");
  const cover = document.querySelector(".sec-cover");

  if (!contactBtn || !cover) return;

  const mm = gsap.matchMedia();

  mm.add("(max-width: 1280px)", () => {
    contactBtn.addEventListener("click", (e) => {
      e.preventDefault();

      isContactScroll = true;

      gsap.to(window, {
        scrollTo: {
          y: cover,
          autoKill: false,
        },
        duration: 1,
        ease: "power2.out",
        onComplete: () => {
          setTimeout(() => {
            isContactScroll = false;
          }, 1000);
        },
      });
    });
  });
});
// Refresh tools ------------------------------ //
ScrollTrigger.addEventListener("refreshInit", () => {
  if (isContactScroll) {
    ScrollTrigger.getAll().forEach((st) => st.disable());
  }
});

ScrollTrigger.addEventListener("refresh", () => {
  if (isContactScroll) {
    ScrollTrigger.getAll().forEach((st) => st.enable());
  }
});
