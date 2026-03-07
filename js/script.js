console.clear();

AOS.init();
gsap.registerPlugin(ScrollTrigger);

// GSAP scrollHorizon ------------------------------ //
function scrollHorizon__init() {
  const sections = gsap.utils.toArray(".section");

  const scrollTween = gsap.to(sections, {
    xPercent: -100 * (sections.length - 1),
    ease: "none",
    scrollTrigger: {
      trigger: ".main",
      pin: true,
      scrub: 0.2,
      snap: 1 / (sections.length - 1),
      end: () => "+=" + document.querySelector(".main").offsetWidth,
    },
  });

  sections.forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      containerAnimation: scrollTween,
      start: "center 90%",
      onEnter: () => {
        section.classList.add("active");
      },
      onLeaveBack: () => {
        section.classList.remove("active");
      },
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
  const sections = gsap.utils.toArray(".section");

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
// Functions Operate Key ------------------------------ //
scrollHorizon__init();
scrollLeins__init();
backSvgMoveTool__init();
scrollToMenu__init();
