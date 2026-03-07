console.clear();

AOS.init();

function backSvgMoveTool__init() {
  document.addEventListener("DOMContentLoaded", () => {
    const sections = document.querySelectorAll("section");

    window.addEventListener("scroll", checkTrigger);
    checkTrigger();

    function checkTrigger() {
      const triggerPoint = window.innerHeight * 0.8;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const paths = section.querySelectorAll(".draw-line");

        if (!paths.length) return;

        const sectionMiddle = rect.top + rect.height / 2;

        if (sectionMiddle <= window.innerHeight && !section.dataset.playing) {
          section.dataset.playing = "true";
          setTimeout(() => {
            runAnimation(section);
          }, 500);
        }

        if (sectionMiddle > window.innerHeight) {
          section.dataset.playing = "";
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
}

backSvgMoveTool__init();
