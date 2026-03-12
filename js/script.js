console.clear();

AOS.init();
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
gsap.registerPlugin(SplitText);

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
function scrollLeins__init() {
  const lenis = new Lenis({
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
  document.addEventListener("DOMContentLoaded", () => {
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
  });

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
function setupPinAccordion() {
  const mm = gsap.matchMedia();

  mm.add("(min-width: 1280px)", () => {
    const section = document.querySelector("#sec-project-list");
    const items = gsap.utils.toArray("#sec-project-list .sec-project-item");

    if (!section || !items.length) return;

    const accordionItems = items.slice(0, -1);

    accordionItems.forEach((li) => (li.style.overflow = "hidden"));

    const tl = gsap.timeline({
      scrollTrigger: {
        id: "proj-pin",
        trigger: section,
        start: "top top",
        end: () =>
          "+=" +
          ((accordionItems.length - 1) * accordionItems[0].offsetHeight +
            window.innerHeight -
            120),
        pin: true,
        pinSpacing: false,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.to(accordionItems, {
      height: 0,
      stagger: 0.5,
      ease: "none",
    }).to(
      accordionItems,
      {
        opacity: 0,
        stagger: 0.5,
        ease: "none",
      },
      "<",
    );
  });
}
// Functions Operate Key ------------------------------ //
scrollHorizon__init();
scrollLeins__init();
backSvgMoveTool__init();
scrollToMenu__init();
setupPinAccordion();
// Resize Loaded ------------------------------ //
history.scrollRestoration = "manual";

ScrollTrigger.config({
  autoRefreshEvents: "visibilitychange,DOMContentLoaded,load,resize",
});

let resizeTimer;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    window.scrollTo(0, 0);
    location.reload();
  }, 300);
});

window.onbeforeunload = function () {
  window.scrollTo(0, 0);
};

window.addEventListener("load", () => {
  window.scrollTo(0, 0);
  ScrollTrigger.refresh();
});
// Resize Lock ------------------------------ //
let isContactScroll = false;

document.addEventListener("DOMContentLoaded", () => {
  const contactBtn = document.querySelector(".btn-3 > a");
  const footer = document.querySelector("footer");

  if (!contactBtn || !footer) return;

  contactBtn.addEventListener("click", (e) => {
    e.preventDefault();

    isContactScroll = true;

    gsap.to(window, {
      scrollTo: footer,
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
          }, 300);
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
          }, 300);
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
          }, 300);
        },
      });
    });
  });
});

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
