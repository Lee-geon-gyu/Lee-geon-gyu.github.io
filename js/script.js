console.clear();

AOS.init();
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
gsap.registerPlugin(SplitText);

// Header Scroll slide ------------------------------ //
function HeaderSlider__init() {
  const header = document.querySelector("header");

  let lastScroll = 0;

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll <= 0) {
      header.classList.remove("hide");
      return;
    }
    if (currentScroll > lastScroll) {
      header.classList.add("hide");
    } else {
      header.classList.remove("hide");
    }

    lastScroll = currentScroll;
  });
}
// GSAP loading ------------------------------ //
let preventScroll;
let preventKey;
let cancelLoadingTyping;

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

function typeLoadingText(element, cursorElement = element, interval = 200) {
  const text = element.textContent.trim();
  element.textContent = "";
  element.style.opacity = 1;
  cursorElement.classList.add("is-typing");

  return new Promise((resolve) => {
    let index = 0;
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      clearInterval(timer);
      cancelLoadingTyping = undefined;
      cursorElement.classList.remove("is-typing");
      resolve();
    };
    const timer = setInterval(() => {
      element.textContent += text[index] || "";
      index += 1;
      if (index >= text.length) {
        setTimeout(finish, interval);
      }
    }, interval);
    cancelLoadingTyping = finish;
  });
}

function loading__init() {
  window.addEventListener("load", async () => {
    disableUserInput();

    const loading = document.querySelector(".loading");
    const loadingText = [...document.querySelectorAll(".loading-text")].find(
      (element) => window.getComputedStyle(element).display !== "none",
    );
    const loadingName = document.querySelector(".loading-name");
    const loadingNameText = loadingName?.querySelector("i");
    const skipButton = document.querySelector(".loading-skip");
    let finished = false;

    const finishLoading = (skipped = false) => {
      if (!loading || finished) return;
      finished = true;
      cancelLoadingTyping?.();
      skipButton?.removeEventListener("click", skipLoading);
      document.removeEventListener("keydown", handleSkipKeydown);

      if (skipped) {
        gsap.set(".loading-text-wrapper", { opacity: 0 });
      }

      gsap
        .timeline()
        .to(".loading-reveal", {
          scale: 80,
          duration: 0.75,
          ease: "power4.in",
          onStart: initAfterLoading,
        })
        .to(loading, {
          opacity: 0,
          duration: 0.1,
          onComplete: () => {
            loading.remove();
            enableUserInput();
            setTimeout(() => ScrollTrigger.refresh(), 100);
          },
        });
    };

    const skipLoading = () => finishLoading(true);
    const handleSkipKeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        skipLoading();
      }
    };
    skipButton?.addEventListener("click", skipLoading);
    document.addEventListener("keydown", handleSkipKeydown);

    if (loadingText) {
      await typeLoadingText(loadingText);
      if (finished) return;
      await gsap.to(loadingText, {
        y: "-100%",
        duration: 0.8,
        ease: "power2.inOut",
      });
    }

    if (loadingName && loadingNameText) {
      gsap.set(loadingName, { y: "0%", opacity: 1 });
      await typeLoadingText(loadingNameText, loadingName);
      if (finished) return;
      await gsap.to(loadingName, {
        scaleY: 0,
        duration: 0.6,
        delay: 0.7,
      });
    }

    finishLoading();
  });
}
// GSAP scrollHorizon ------------------------------ //
let scrollTween;

function scrollHorizon__init() {
  const mm = gsap.matchMedia();

  mm.add("(min-width:1281px)", () => {
    const sections = gsap.utils.toArray(".horizontal-section");

    const holdDuration = 0.25;
    scrollTween = gsap.timeline({
      scrollTrigger: {
        trigger: ".main",
        pin: true,
        scrub: 1,
        end: () =>
          "+=" +
          window.innerWidth *
            (sections.length - 1 + sections.length * holdDuration),
      },
    });

    scrollTween.addLabel("slide-0").to({}, { duration: holdDuration });
    sections.slice(1).forEach((_, index) => {
      const slide = index + 1;
      scrollTween
        .to(sections, {
          xPercent: -100 * slide,
          duration: 1,
          ease: "none",
        })
        .addLabel(`slide-${slide}`)
        .to({}, { duration: holdDuration });
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

    gsap.from(".sec-cover [data-ani-2]", {
      x: -320,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power2.out",
    });

    gsap.utils
      .toArray("[data-ani-2]")
      .filter((el) => !el.closest(".sec-cover"))
      .forEach((el) => {
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

// Header color in project list ------------------------------ //
function HeaderProjectColor__init() {
  const header = document.querySelector("header");
  const projectList = document.querySelector("#sec-project-list");

  if (!header || !projectList) return;

  ScrollTrigger.create({
    id: "header-project-color",
    trigger: projectList,
    start: "top bottom",
    onEnter: () => header.classList.add("is-project-list"),
    onLeaveBack: () => header.classList.remove("is-project-list"),
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
  const footer = document.querySelector("footer");

  if (!section || items.length === 0 || !footer) return;

  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  ScrollTrigger.getById("proj-pin")?.kill();
  gsap.killTweensOf([...items, footer]);

  gsap.set([...items, footer], { clearProps: "all" });

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
    filter: "blur(0px)",
    willChange: "clip-path, opacity, filter",
  });

  gsap.set(items[0], {
    clipPath: "inset(0% 0% 0% 0%)",
  });

  gsap.set(footer, {
    position: "fixed",
    left: 0,
    bottom: 0,
    width: "100%",
    yPercent: 100,
    zIndex: 20,
    willChange: "transform",
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      id: "proj-pin",
      trigger: section,
      start: "top top",
      end: () => "+=" + window.innerHeight * (items.length + 1),
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
        filter: "blur(16px)",
        opacity: 0.45,
        duration: 0.2,
        ease: "power1.out",
      },
      i,
    );
  });

  const footerStart = items.length;
  tl.to(
    items[items.length - 1],
    {
      filter: "blur(16px)",
      opacity: 0.45,
      duration: 0.2,
      ease: "power1.out",
    },
    footerStart,
  ).to(
    footer,
    {
      yPercent: 0,
      duration: 1,
      ease: "power3.out",
    },
    footerStart,
  );
}
// Functions Operate Key ------------------------------ //
loading__init();
function initAfterLoading() {
  HeaderSlider__init();
  scrollHorizon__init();
  scrollLeins__init();
  HeaderProjectColor__init();
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
