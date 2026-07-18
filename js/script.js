console.clear();

AOS.init();
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
gsap.registerPlugin(SplitText);

// Header Scroll slide ------------------------------ //
function HeaderSlider__init() {
  const header = document.querySelector("header");
  if (!header) return;

  let lastScroll = 0;
  let scrollFrame;

  window.addEventListener(
    "scroll",
    () => {
      if (scrollFrame) return;

      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = undefined;

        const currentScroll = window.pageYOffset;
        const isPinActive = ScrollTrigger.getAll().some(
          (trigger) => trigger.pin && trigger.isActive,
        );

        if (currentScroll <= 0 || isPinActive) {
          header.classList.remove("hide");
          lastScroll = currentScroll;
          return;
        }

        header.classList.toggle("hide", currentScroll > lastScroll);
        lastScroll = currentScroll;
      });
    },
    { passive: true },
  );
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

function typeLoadingText(
  element,
  cursorElement = element,
  interval = 150,
  onFirstCharacter,
) {
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
      if (index === 0) onFirstCharacter?.();
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
    const loadingVideo = document.querySelector("video.loading-video");
    const loadingVideoShade = document.querySelector(".loading-video-shade");
    let finished = false;

    if (loadingVideo) {
      loadingVideo.pause();
      loadingVideo.currentTime = 0;
      loadingVideo.muted = true;
      loadingVideo.volume = 0;
      loadingVideo.playsInline = true;
    }

    const playLoadingVideoToReveal = () => {
      if (!loadingVideo) return Promise.resolve();

      const videoStyle = getComputedStyle(loadingVideo);
      const croppedScale =
        Number.parseFloat(
          videoStyle.getPropertyValue("--loading-video-scale"),
        ) || 1.18;
      const croppedY =
        Number.parseFloat(videoStyle.getPropertyValue("--loading-video-y")) ||
        -2.5;

      gsap.to(loadingVideo, {
        scale: croppedScale,
        xPercent: 0,
        yPercent: croppedY,
        duration: 1,
        ease: "power2.out",
      });

      gsap.to(loadingVideoShade, {
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
      });

      return new Promise((resolve) => {
        let settled = false;
        const complete = () => {
          if (settled) return;
          settled = true;
          loadingVideo.removeEventListener("timeupdate", checkRevealTime);
          loadingVideo.removeEventListener("ended", complete);
          loadingVideo.removeEventListener("error", complete);
          resolve();
        };
        const checkRevealTime = () => {
          if (loadingVideo.currentTime >= 4.25) complete();
        };

        loadingVideo.addEventListener("timeupdate", checkRevealTime);
        loadingVideo.addEventListener("ended", complete, { once: true });
        loadingVideo.addEventListener("error", complete, { once: true });

        const playPromise = loadingVideo.play();
        playPromise?.catch((error) => {
          console.warn("Loading video playback was prevented:", error);
          complete();
        });
      });
    };

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
          duration: 0.5,
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

    let revealTimeReached = Promise.resolve();
    let loadingVideoStarted = false;
    const startLoadingVideo = () => {
      if (loadingVideoStarted) return;
      loadingVideoStarted = true;
      revealTimeReached = playLoadingVideoToReveal();
    };

    if (loadingText) {
      await gsap.to(loadingText, {
        opacity: 1,
        duration: 1,
      });
      if (finished) return;
      await gsap.to(loadingText, {
        y: "-100%",
        duration: 0.8,
        delay: 1.2,
        ease: "power2.inOut",
        onStart: startLoadingVideo,
      });
    }

    if (loadingName && loadingNameText) {
      gsap.set(loadingName, { y: "0%", opacity: 1 });
      await typeLoadingText(loadingNameText, loadingName, 150, () => {
        if (!loadingText) startLoadingVideo();
      });
      if (finished) return;
      await gsap.to(loadingName, {
        scaleY: 0,
        duration: 0.6,
        delay: 0.7,
      });
      await revealTimeReached;
      if (finished) return;
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
        trigger: ".horizontal-wrap",
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
        .addLabel(`slide-${slide}`);

      scrollTween.to({}, { duration: holdDuration });
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

    gsap.utils.toArray(".horizontal-section [data-ani]").forEach((el) => {
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

// Vertical project section ------------------------------ //
function projectVerticalScroll__init() {
  const project = document.querySelector(".sec-project.vertical-section");
  const header = document.querySelector("header");
  const category = project?.querySelector(".category-box");
  const lineWrapper = project?.querySelector(".bg-line-wrapper");
  const projectList = document.querySelector("#sec-project-list");
  const blurTargets = project
    ? [...project.children].filter(
        (element) => !element.classList.contains("bg-line-wrapper"),
      )
    : [];
  if (!project) return;

  lineWrapper?.remove();
  gsap.set(category, { autoAlpha: 1 });
  gsap.set(project, { "--project-blur-opacity": 0 });

  if (category) {
    gsap.fromTo(
      category,
      { y: 60, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: project,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      },
    );
  }

  ScrollTrigger.create({
    id: "project-vertical-pin",
    trigger: project,
    start: "top top",
    end: "+=150%",
    pin: true,
    pinSpacing: false,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onEnter: () => header?.classList.add("is-project-section"),
    onEnterBack: () => header?.classList.add("is-project-section"),
    onLeave: () => header?.classList.remove("is-project-section"),
    onLeaveBack: () => header?.classList.remove("is-project-section"),
  });

  if (projectList) {
    gsap.fromTo(
      blurTargets,
      { filter: "blur(0px)", opacity: 1 },
      {
        filter: "blur(18px)",
        opacity: 0.45,
        ease: "none",
        scrollTrigger: {
          id: "project-list-backdrop-blur",
          trigger: projectList,
          start: "top bottom",
          end: "top 20%",
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      },
    );

    gsap.to(project, {
      "--project-blur-opacity": 1,
      ease: "none",
      scrollTrigger: {
        trigger: projectList,
        start: "top bottom",
        end: "top 20%",
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });
  }
}

// Project marquee ------------------------------ //
function projectMarquee__init() {
  const marquee = document.querySelector(".sec-project .marquee");
  const marqueeControl = document.querySelector(".marquee-control");
  const projectSection = document.querySelector(".sec-project");
  const stateText = document.querySelector(".marquee-control__state");
  const prevButton = document.querySelector(".marquee-control__prev");
  const toggleButton = document.querySelector(".marquee-control__toggle");
  const nextButton = document.querySelector(".marquee-control__next");
  if (!marquee || marquee.dataset.marqueeReady === "true") return;

  const items = [...marquee.children];
  if (!items.length) return;

  const track = document.createElement("div");
  const group = document.createElement("div");
  track.className = "marquee-track";
  group.className = "marquee-group";

  items.forEach((item, index) => {
    item.dataset.projectIndex = index;
    group.appendChild(item);
  });

  const clone = group.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  clone.querySelectorAll("a").forEach((link) => {
    link.tabIndex = -1;
  });

  track.append(group, clone);
  marquee.appendChild(track);
  marquee.dataset.marqueeReady = "true";
  marquee.dataset.marqueeState = "normal";

  const speeds = [
    { label: "NORMAL", rate: 1 },
    { label: "FAST ×2", rate: 2 },
    { label: "FAST ×4", rate: 4 },
    { label: "FAST ×6", rate: 6 },
    { label: "FAST ×8", rate: 8 },
  ];
  let speedIndex = 0;
  let isPaused = false;
  let isMarqueeHovered = false;
  let gradientPopTimer;

  const getMarqueeMetersPerSecond = (animation, rate) => {
    const loopDistancePx = group.getBoundingClientRect().width;
    const durationMs = Number(animation.effect?.getTiming().duration) || 36000;
    const pixelsPerSecond = (loopDistancePx / (durationMs / 1000)) * rate;
    const metersPerCssPixel = 0.0254 / 96;
    return pixelsPerSecond * metersPerCssPixel;
  };

  const updateMarqueeControl = () => {
    const marqueeAnimation = track.getAnimations()[0];
    const speed = speeds[speedIndex];
    if (!marqueeAnimation) return;

    const hoverRate = isMarqueeHovered ? 0.5 : 1;
    const effectiveRate = isPaused ? 0 : speed.rate * hoverRate;
    marqueeAnimation.updatePlaybackRate(speed.rate * hoverRate);
    isPaused ? marqueeAnimation.pause() : marqueeAnimation.play();
    const metersPerSecond = getMarqueeMetersPerSecond(
      marqueeAnimation,
      effectiveRate,
    );
    const maximumMetersPerSecond = getMarqueeMetersPerSecond(
      marqueeAnimation,
      speeds.at(-1).rate,
    );
    const speedRatio = maximumMetersPerSecond
      ? Math.min(Math.max(metersPerSecond / maximumMetersPerSecond, 0), 1)
      : 0;
    const needleAngle = -90 + speedRatio * 180;
    stateText.textContent = `${metersPerSecond.toFixed(3)} m/s`;
    projectSection?.classList.toggle(
      "is-gradient-expanded",
      metersPerSecond >= 0.085,
    );
    marqueeControl?.style.setProperty(
      "--marquee-needle-angle",
      `${needleAngle}deg`,
    );
    toggleButton.querySelector("img").src = isPaused
      ? "images/Play_arrow_icon.png"
      : "images/pause_icon.png";
    toggleButton.setAttribute("aria-label", isPaused ? "Play" : "Pause");
    prevButton.disabled = speedIndex === 0;
    nextButton.disabled = speedIndex === speeds.length - 1;
  };

  const triggerGradientPop = () => {
    if (!projectSection) return;

    window.clearTimeout(gradientPopTimer);
    projectSection.classList.remove("is-gradient-pop");
    void projectSection.offsetWidth;
    projectSection.classList.add("is-gradient-pop");

    gradientPopTimer = window.setTimeout(() => {
      projectSection.classList.remove("is-gradient-pop");
    }, 200);
  };

  prevButton?.addEventListener("click", () => {
    if (speedIndex > 0) {
      speedIndex -= 1;
      triggerGradientPop();
    }
    updateMarqueeControl();
  });
  nextButton?.addEventListener("click", () => {
    if (speedIndex < speeds.length - 1) {
      speedIndex += 1;
      triggerGradientPop();
    }
    updateMarqueeControl();
  });
  toggleButton?.addEventListener("click", () => {
    const isStartingPlayback = isPaused;
    isPaused = !isPaused;
    if (isStartingPlayback) triggerGradientPop();
    updateMarqueeControl();
  });
  marquee.addEventListener("pointerenter", () => {
    isMarqueeHovered = true;
    updateMarqueeControl();
  });
  marquee.addEventListener("pointerleave", () => {
    isMarqueeHovered = false;
    updateMarqueeControl();
  });

  marquee.addEventListener("click", (event) => {
    const link = event.target.closest(".center-box");
    const item = link?.closest(".list-item");
    if (!link || !item) return;

    event.preventDefault();

    const projectIndex = Number(item.dataset.projectIndex);
    const projectTrigger = ScrollTrigger.getById("proj-pin");
    const projectTimeline = projectTrigger?.animation;
    if (!Number.isInteger(projectIndex) || !projectTrigger || !projectTimeline) {
      return;
    }

    const panelTime = projectIndex === 0 ? 0 : projectIndex + 0.9;
    const progress = Math.min(panelTime / projectTimeline.duration(), 1);
    const targetY =
      projectTrigger.start +
      (projectTrigger.end - projectTrigger.start) * progress;

    gsap.to(window, {
      scrollTo: { y: targetY, autoKill: false },
      duration: 1.2,
      ease: "power2.inOut",
      overwrite: "auto",
    });
  });

  requestAnimationFrame(updateMarqueeControl);

  const marqueeResizeObserver = new ResizeObserver(updateMarqueeControl);
  marqueeResizeObserver.observe(group);
}

// Project mockup drag & throw ------------------------------ //
function projectMockupDrag__init() {
  const mockups = document.querySelectorAll(
    "#sec-project-list .bottom-box > .right-box > .img-box",
  );
  let dragHintShowCount = 0;

  const showDragHint = (event) => {
    if (dragHintShowCount >= 2) return;
    dragHintShowCount += 1;

    const hint = document.createElement("div");
    const hintText = document.createElement("span");
    hint.className = "drag-it-hint";
    hintText.textContent = "Throw It";
    hint.appendChild(hintText);
    document.body.appendChild(hint);

    const moveHint = (moveEvent) => {
      hint.style.left = `${moveEvent.clientX + 18}px`;
      hint.style.top = `${moveEvent.clientY + 18}px`;
    };

    const removeHint = (animationEvent) => {
      if (animationEvent && animationEvent.target !== hint) return;
      window.removeEventListener("pointermove", moveHint);
      hint.remove();
    };

    moveHint(event);
    window.addEventListener("pointermove", moveHint, { passive: true });
    hint.addEventListener("animationend", removeHint);
    window.setTimeout(removeHint, 3500);
  };

  mockups.forEach((mockup) => {
    const image = mockup.querySelector("img");
    if (image) image.draggable = false;

    mockup.addEventListener("mouseenter", showDragHint, { once: true });

    mockup.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();

      gsap.killTweensOf(mockup);
      mockup.setPointerCapture(event.pointerId);
      mockup.classList.add("is-dragging");
      lenis?.stop();

      const rect = mockup.getBoundingClientRect();
      const startPointer = { x: event.clientX, y: event.clientY };
      const startPosition = {
        x: Number(gsap.getProperty(mockup, "x")) || 0,
        y: Number(gsap.getProperty(mockup, "y")) || 0,
      };
      const bounds = {
        minX: startPosition.x - rect.left,
        maxX: startPosition.x + window.innerWidth - rect.right,
        minY: startPosition.y - rect.top,
        maxY: startPosition.y + window.innerHeight - rect.bottom,
      };
      let previousPointer = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
      };
      let velocity = { x: 0, y: 0 };

      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

      const handlePointerMove = (moveEvent) => {
        const now = performance.now();
        const elapsed = Math.max(now - previousPointer.time, 16);
        velocity.x = ((moveEvent.clientX - previousPointer.x) / elapsed) * 1000;
        velocity.y = ((moveEvent.clientY - previousPointer.y) / elapsed) * 1000;
        previousPointer = {
          x: moveEvent.clientX,
          y: moveEvent.clientY,
          time: now,
        };

        gsap.set(mockup, {
          x: clamp(
            startPosition.x + moveEvent.clientX - startPointer.x,
            bounds.minX,
            bounds.maxX,
          ),
          y: clamp(
            startPosition.y + moveEvent.clientY - startPointer.y,
            bounds.minY,
            bounds.maxY,
          ),
        });
      };

      const handlePointerUp = () => {
        mockup.removeEventListener("pointermove", handlePointerMove);
        mockup.removeEventListener("pointerup", handlePointerUp);
        mockup.removeEventListener("pointercancel", handlePointerUp);
        mockup.classList.remove("is-dragging");
        lenis?.start();

        const currentX = Number(gsap.getProperty(mockup, "x")) || 0;
        const currentY = Number(gsap.getProperty(mockup, "y")) || 0;
        const throwX = clamp(
          currentX + velocity.x * 0.18,
          bounds.minX,
          bounds.maxX,
        );
        const throwY = clamp(
          currentY + velocity.y * 0.18,
          bounds.minY,
          bounds.maxY,
        );

        gsap.to(mockup, {
          x: throwX,
          y: throwY,
          duration: 0.5,
          ease: "power3.out",
        });
      };

      mockup.addEventListener("pointermove", handlePointerMove);
      mockup.addEventListener("pointerup", handlePointerUp);
      mockup.addEventListener("pointercancel", handlePointerUp);
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

// Header color in about section ------------------------------ //
function HeaderAboutColor__init() {
  const header = document.querySelector("header");
  const about = document.querySelector(".sec-about");

  if (!header || !about) return;

  const mm = gsap.matchMedia();

  mm.add("(min-width: 1281px)", () => {
    ScrollTrigger.create({
      id: "header-about-color-desktop",
      trigger: about,
      containerAnimation: scrollTween,
      start: "left center",
      end: "right center",
      onToggle: (self) => {
        header.classList.toggle("is-about", self.isActive);
      },
    });
  });

  mm.add("(max-width: 1280px)", () => {
    ScrollTrigger.create({
      id: "header-about-color-mobile",
      trigger: about,
      start: "top top",
      end: "bottom top",
      onToggle: (self) => {
        header.classList.toggle("is-about", self.isActive);
      },
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
  document.querySelectorAll("[data-scroll-menu]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const menu = btn.dataset.scrollMenu;
      const isDesktop = window.matchMedia("(min-width: 1281px)").matches;
      let targetY = 0;

      if (menu === "about") {
        if (isDesktop && scrollTween?.scrollTrigger) {
          const horizontalTrigger = scrollTween.scrollTrigger;
          const aboutTime = scrollTween.labels["slide-1"] ?? 0;
          const progress = aboutTime / scrollTween.duration();
          targetY =
            horizontalTrigger.start +
            (horizontalTrigger.end - horizontalTrigger.start) * progress;
        } else {
          targetY = document.querySelector(".sec-about")?.offsetTop ?? 0;
        }
      }

      if (menu === "project") {
        targetY =
          ScrollTrigger.getById("project-vertical-pin")?.start ??
          document.querySelector(".sec-project")?.offsetTop ??
          0;
      }

      if (menu === "contact") {
        targetY =
          ScrollTrigger.getById("proj-pin")?.end ??
          document.documentElement.scrollHeight - window.innerHeight;
      }

      isContactScroll = menu === "contact";

      gsap.to(window, {
        scrollTo: { y: targetY, autoKill: false },
        duration: menu === "contact" ? 1.2 : 1,
        ease: "power2.out",
        overwrite: "auto",
        onComplete: () => {
          isContactScroll = false;
        },
      });
    });
  });
}
// setupPinAccordion ------------------------------ //
let resizeTimer;
let resizeRefreshFrame;
let lastAccordionMobile = window.matchMedia("(max-width: 768px)").matches;

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
  projectMarquee__init();
  projectMockupDrag__init();
  scrollHorizon__init();
  projectVerticalScroll__init();
  scrollLeins__init();
  HeaderAboutColor__init();
  HeaderProjectColor__init();
  backSvgMoveTool__init();
  scrollToMenu__init();
  setupPinAccordion();
}
// Resize Loaded ------------------------------ //
history.scrollRestoration = "manual";

ScrollTrigger.config({
  autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
});

window.addEventListener("resize", () => {
  if (!resizeRefreshFrame) {
    resizeRefreshFrame = requestAnimationFrame(() => {
      resizeRefreshFrame = undefined;

      const projectList = document.querySelector("#sec-project-list");
      if (projectList) projectList.style.height = `${window.innerHeight}px`;

      const isAccordionMobile = window.matchMedia("(max-width: 768px)").matches;
      if (isAccordionMobile !== lastAccordionMobile) {
        lastAccordionMobile = isAccordionMobile;
        setupPinAccordion();
      }

      ScrollTrigger.refresh();
      lenis?.resize();
    });
  }

  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    setupPinAccordion();
    ScrollTrigger.refresh();
    lenis?.resize();
  }, 120);
});

window.addEventListener("load", () => {
  ScrollTrigger.refresh();
});
// Resize Lock ------------------------------ //
let isContactScroll = false;

document.addEventListener("DOMContentLoaded", () => {
  setupPinAccordion();
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
