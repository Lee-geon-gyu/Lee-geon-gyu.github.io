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
  let isSyncingScroll = false;

  const syncHeaderScroll = () => {
    lastScroll = window.pageYOffset;
    isSyncingScroll = true;
    header.classList.remove("hide");
    requestAnimationFrame(() => {
      lastScroll = window.pageYOffset;
      isSyncingScroll = false;
    });
  };

  window.addEventListener("header-scroll-sync", syncHeaderScroll);

  window.addEventListener(
    "scroll",
    () => {
      if (scrollFrame) return;

      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = undefined;

        const currentScroll = window.pageYOffset;

        if (isSyncingScroll) {
          lastScroll = currentScroll;
          return;
        }

        if (currentScroll <= 0) {
          header.classList.remove("hide");
          lastScroll = currentScroll;
          return;
        }

        const scrollDelta = currentScroll - lastScroll;
        if (Math.abs(scrollDelta) < 1) return;

        header.classList.toggle("hide", scrollDelta > 0);
        lastScroll = currentScroll;
      });
    },
    { passive: true },
  );
}

// Mobile Header Navigation ------------------------------ //
function mobileNavigation__init() {
  const header = document.querySelector("header");
  const toggle = header?.querySelector(".mobile-menu-toggle");
  const navigation = header?.querySelector(".mobile-navigation");
  const backdrop = header?.querySelector(".mobile-navigation-backdrop");
  const closeButton = navigation?.querySelector(".mobile-navigation__close");
  if (!header || !toggle || !navigation || !backdrop || !closeButton) return;

  const setOpen = (isOpen) => {
    header.classList.toggle("is-mobile-menu-open", isOpen);
    document.body.classList.toggle("is-mobile-menu-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    navigation.setAttribute("aria-hidden", String(!isOpen));
  };

  const isLenisMoving = () => {
    if (!lenis) return false;
    if (lenis.isScrolling) return true;

    const currentScroll = lenis.animatedScroll ?? window.scrollY;
    const targetScroll = lenis.targetScroll ?? currentScroll;
    return Math.abs(targetScroll - currentScroll) > 0.5;
  };

  toggle.addEventListener("click", () => {
    if (isLenisMoving()) return;
    setOpen(true);
  });
  backdrop.addEventListener("click", () => setOpen(false));
  closeButton.addEventListener("click", () => setOpen(false));
  navigation.querySelectorAll("[data-scroll-menu]").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  window.addEventListener(
    "scroll",
    () => {
      if (!header.classList.contains("is-mobile-menu-open")) return;

      setOpen(false);
      window.dispatchEvent(new Event("header-scroll-sync"));
    },
    { passive: true },
  );

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) setOpen(false);
  });
}

// Custom vertical scrollbar ------------------------------ //
function customScrollbar__init() {
  const track = document.querySelector(".site-scrollbar__track");
  const fill = track?.querySelector(".site-scrollbar__fill");
  const thumb = track?.querySelector(".site-scrollbar__thumb");
  if (!track || !fill || !thumb || track.dataset.scrollbarReady === "true")
    return;

  track.dataset.scrollbarReady = "true";
  let isDragging = false;
  let scrollFrame;

  const getMetrics = () => {
    const scrollHeight = document.documentElement.scrollHeight;
    const nativeMaxScroll = Math.max(scrollHeight - window.innerHeight, 0);
    const projectTrigger = ScrollTrigger.getById("proj-pin");
    const projectTimeline = projectTrigger?.animation;
    const contactTime = projectTimeline?.labels?.footerContactComplete;
    const contactScroll =
      projectTrigger && projectTimeline && contactTime !== undefined
        ? projectTrigger.start +
          (projectTrigger.end - projectTrigger.start) *
            (contactTime / Math.max(projectTimeline.duration(), 1))
        : nativeMaxScroll;
    const maxScroll = Math.min(nativeMaxScroll, contactScroll);
    const trackWidth = track.clientWidth;

    return { maxScroll, trackWidth };
  };

  const render = () => {
    scrollFrame = undefined;
    const { maxScroll, trackWidth } = getMetrics();
    if (window.scrollY > maxScroll + 1) {
      if (lenis) {
        lenis.scrollTo(maxScroll, { immediate: true, force: true });
      } else {
        window.scrollTo(0, maxScroll);
      }
      return;
    }
    const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    const progressX = Math.max(0, Math.min(progress, 1)) * trackWidth;
    fill.style.width = `${progressX}px`;
    thumb.style.left = `${progressX}px`;
    track.parentElement.hidden = maxScroll <= 0;
  };

  const requestRender = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(render);
  };

  const scrollFromPointer = (clientX) => {
    const rect = track.getBoundingClientRect();
    const { maxScroll, trackWidth } = getMetrics();
    const progressX = Math.max(0, Math.min(clientX - rect.left, trackWidth));
    const nextScroll =
      trackWidth > 0 ? (progressX / trackWidth) * maxScroll : 0;
    if (lenis) {
      lenis.scrollTo(nextScroll, { immediate: true, force: true });
    } else {
      window.scrollTo(0, nextScroll);
    }
  };

  thumb.addEventListener("pointerdown", (event) => {
    isDragging = true;
    thumb.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  thumb.addEventListener("pointermove", (event) => {
    if (isDragging) scrollFromPointer(event.clientX);
  });

  const stopDragging = () => {
    isDragging = false;
  };

  thumb.addEventListener("pointerup", stopDragging);
  thumb.addEventListener("pointercancel", stopDragging);
  track.addEventListener("pointerdown", (event) => {
    if (event.target !== thumb) scrollFromPointer(event.clientX);
  });
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender);
  requestRender();
}
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
    e.stopImmediatePropagation();
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
  window.addEventListener("load", async () => {
    const loading = document.querySelector(".loading");
    let skipLoadingAfterResponsiveReload = false;

    try {
      skipLoadingAfterResponsiveReload =
        sessionStorage.getItem("portfolio-responsive-reload") === "true";
      sessionStorage.removeItem("portfolio-responsive-reload");
    } catch (error) {}

    if (skipLoadingAfterResponsiveReload) {
      loading?.remove();
      document.documentElement.classList.remove("skip-loading");
      window.scrollTo(0, 0);
      initAfterLoading();

      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        ScrollTrigger.refresh();
        lenis?.resize();
      });
      return;
    }

    disableUserInput();

    const loadingText = [...document.querySelectorAll(".loading-text")].find(
      (element) => window.getComputedStyle(element).display !== "none",
    );
    const loadingName = document.querySelector(".loading-name");
    const loadingVideo = document.querySelector("video.loading-video");
    const loadingSkip = document.querySelector(".loading-skip");
    const loadingVideoShade = document.querySelector(".loading-video-shade");
    const loadingLensFlare = document.querySelector(".loading-lens-flare");
    const loaderMist = document.querySelector(".loader-mist");
    const loaderMistLayers = gsap.utils.toArray(".loader-mist__layer");
    const loaderMistLayer1 = document.querySelector(".loader-mist__layer--1");
    const loaderMistLayer2 = document.querySelector(".loader-mist__layer--2");
    const loaderMistLayer3 = document.querySelector(".loader-mist__layer--3");
    const coverScene = document.querySelector(".forest-scene");
    const coverContent = gsap.utils.toArray(
      ".sec-cover > .cover-title, .sec-cover > .copy-wrapper, .sec-cover > .cover-status-panel, .sec-cover > .cover-scroll-guide",
    );
    let finished = false;
    let coverInitialized = false;
    let lightBridgeStarted = false;
    let lightBridgeTimeline = null;
    let completeLightBridge = null;

    const initializeCoverScene = () => {
      if (coverInitialized) return;
      coverInitialized = true;
      initAfterLoading();
      lenis?.stop();
    };

    const completeLoadingDom = () => {
      gsap.set(coverScene, {
        clearProps: "opacity,visibility",
      });
      loading?.remove();
      window.scrollTo(0, 0);
      lenis?.scrollTo(0, { immediate: true, force: true });

      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        lenis?.scrollTo(0, { immediate: true, force: true });
        ScrollTrigger.refresh();
        lenis?.resize();

        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          lenis?.scrollTo(0, { immediate: true, force: true });
          ScrollTrigger.update();
          lenis?.start();
          enableUserInput();
          window.dispatchEvent(new Event("header-scroll-sync"));
        });
      });
    };

    if (loadingVideo) {
      loadingVideo.muted = true;
      loadingVideo.volume = 0;
      loadingVideo.playsInline = true;
    }
    gsap.set(loadingSkip, { opacity: 0 });

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

      const startLoadingLightBridge = () => {
        if (lightBridgeStarted) return lightBridgeTimeline;
        lightBridgeStarted = true;
        finished = true;
        document.removeEventListener("keydown", handleSkipKeydown);
        loading.classList.add("loading--light-bridge");
        gsap.set(coverScene, {
          autoAlpha: 0,
          filter: "blur(14px)",
          scale: 1.02,
        });

        lightBridgeTimeline = gsap
          .timeline({
            onComplete: () => {
              completeLoadingDom();
              completeLightBridge?.();
            },
          })
          .to(
            loadingVideo,
            {
              filter: "brightness(1.12) contrast(0.9) saturate(1) blur(2px)",
              scale: croppedScale * 1.008,
              duration: 0.45,
              ease: "power2.inOut",
            },
            0,
          )
          .to(
            loadingLensFlare,
            {
              opacity: 0.9,
              scale: 1.85,
              duration: 0.55,
              ease: "sine.inOut",
            },
            0,
          )
          .to(
            loaderMistLayer1,
            {
              opacity: 0.82,
              scale: 1.13,
              x: "3vw",
              y: "-2vw",
              duration: 1.15,
              ease: "sine.inOut",
            },
            0,
          )
          .to(
            loaderMistLayer2,
            {
              opacity: 0.64,
              scale: 1.18,
              x: "4vw",
              y: "2vw",
              duration: 1.07,
              ease: "sine.inOut",
            },
            0.08,
          )
          .to(
            loaderMistLayer3,
            {
              opacity: 0.58,
              scale: 1.14,
              x: "-3vw",
              y: "-3vw",
              duration: 0.99,
              ease: "sine.inOut",
            },
            0.16,
          )
          .to(
            ".loading-text-wrapper, .loading-skip",
            { opacity: 0, duration: 0.4, ease: "power2.out" },
            0.15,
          )
          .to(
            loadingVideo,
            {
              filter:
                "brightness(1.25) contrast(0.82) saturate(0.82) blur(7px)",
              scale: croppedScale * 1.018,
              duration: 0.75,
              ease: "power2.inOut",
            },
            0.75,
          )
          .set(loading, { backgroundColor: "transparent" }, 1.65)
          .set([loadingVideo, loadingVideoShade], { autoAlpha: 0 }, 1.65)
          .call(initializeCoverScene, null, 1.65)
          .set(coverContent, { autoAlpha: 0, y: 10 }, 1.65)
          .to(
            coverScene,
            {
              autoAlpha: 1,
              filter: "blur(0px)",
              scale: 1,
              duration: 1.15,
              ease: "sine.inOut",
            },
            1.65,
          )
          .to(
            [
              loaderMistLayer1,
              loaderMistLayer2,
              loaderMistLayer3,
              loadingLensFlare,
            ],
            {
              opacity: 0,
              duration: 1.15,
              ease: "sine.inOut",
            },
            1.65,
          )
          .to(
            coverContent,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.4,
              stagger: 0.06,
              ease: "power2.out",
            },
            2.57,
          );

        return lightBridgeTimeline;
      };

      return new Promise((resolve) => {
        let settled = false;
        loadingVideo.addEventListener(
          "playing",
          () => {
            gsap.to(loadingSkip, {
              opacity: 1,
              duration: 0.25,
              ease: "power1.out",
              overwrite: true,
            });
          },
          { once: true },
        );
        const complete = () => {
          if (settled) return;
          settled = true;
          loadingVideo.removeEventListener("timeupdate", checkRevealTime);
          loadingVideo.removeEventListener("ended", complete);
          loadingVideo.removeEventListener("error", complete);
          resolve();
        };
        completeLightBridge = complete;
        const checkRevealTime = () => {
          const duration = loadingVideo.duration;
          const hasDuration = Number.isFinite(duration) && duration > 0;
          const bridgeStart = hasDuration
            ? Math.min(3.5, Math.max(0, duration - 0.05))
            : 3.5;

          if (loadingVideo.currentTime >= bridgeStart) {
            startLoadingLightBridge();
          }
        };

        loadingVideo.addEventListener("timeupdate", checkRevealTime);
        loadingVideo.addEventListener(
          "ended",
          () => {
            const bridgeTimeline = startLoadingLightBridge();
            if (!bridgeTimeline) complete();
          },
          { once: true },
        );
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
      document.removeEventListener("keydown", handleSkipKeydown);

      if (skipped) {
        gsap.set(".loading-text-wrapper", { opacity: 0 });
        gsap.set(loaderMistLayers, { opacity: 0.58, scale: 1.1 });
      }

      gsap.set(coverScene, {
        autoAlpha: 0,
        filter: "blur(14px)",
        scale: 1.02,
      });

      gsap
        .timeline({ onComplete: completeLoadingDom })
        .set(loading, { backgroundColor: "transparent" })
        .set([loadingVideo, loadingVideoShade, loadingLensFlare], {
          autoAlpha: 0,
        })
        .call(initializeCoverScene)
        .to(
          coverScene,
          {
            autoAlpha: 1,
            filter: "blur(0px)",
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
          },
          0,
        )
        .to(
          loaderMistLayers,
          {
            opacity: 0,
            duration: 0.45,
            ease: "power2.out",
          },
          0.25,
        )
        .to(loading, {
          opacity: 0,
          duration: 0.01,
        });
    };

    const skipLoading = () => finishLoading(true);
    const handleSkipKeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        skipLoading();
      }
    };
    document.addEventListener("keydown", handleSkipKeydown);

    let revealTimeReached = Promise.resolve();
    let loadingVideoStarted = false;
    const startLoadingVideo = () => {
      if (loadingVideoStarted) return;
      loadingVideoStarted = true;
      revealTimeReached = playLoadingVideoToReveal();
    };

    startLoadingVideo();

    if (loadingText) {
      await gsap.to(loadingText, {
        opacity: 1,
        duration: 1,
      });
      if (finished) return;
      await Promise.all([
        gsap.to(loadingText, {
          y: "-100%",
          duration: 0.8,
          delay: 0.75,
          ease: "power2.inOut",
          onStart: startLoadingVideo,
        }),
        loadingName
          ? gsap.to(loadingName, {
              y: "0%",
              opacity: 1,
              duration: 0.8,
              delay: 0.75,
              ease: "power2.inOut",
            })
          : Promise.resolve(),
      ]);
    }

    if (loadingName) {
      if (!loadingText) {
        startLoadingVideo();
        await gsap.to(loadingName, {
          y: "0%",
          opacity: 1,
          duration: 0.8,
          ease: "power2.inOut",
        });
      }
      if (finished) return;
      await gsap.to({}, { duration: 0.7 });
      await revealTimeReached;
      if (finished) return;
    }

    finishLoading();
  });
}
// Cover / About horizontal scroll ------------------------------ //
let scrollTween;

function prepareProjectRevealPhraseLines() {
  document
    .querySelectorAll(".project-reveal-copy .cinematic-text")
    .forEach((phrase) => {
      if (phrase.querySelector(".cinematic-text__line")) return;

      const lineGroups = [[]];
      [...phrase.childNodes].forEach((node) => {
        if (node.nodeName === "BR") {
          lineGroups.push([]);
        } else {
          lineGroups.at(-1).push(node.cloneNode(true));
        }
      });

      phrase.replaceChildren();
      lineGroups.forEach((nodes) => {
        const line = document.createElement("span");
        line.className = "cinematic-text__line";
        nodes.forEach((node) => line.appendChild(node));
        phrase.appendChild(line);
      });
    });
}

function introSections__init() {
  const mm = gsap.matchMedia();
  const cover = document.querySelector(".sec-cover");
  const coverTopText = cover?.querySelector(".cover-title > .top-box");
  const coverPortfolio = cover?.querySelector(".cover-title > .bottom-box");
  const coverCopy = cover?.querySelector(".copy-wrapper");
  if (document.documentElement.dataset.projectBackRefreshReady !== "true") {
    document.documentElement.dataset.projectBackRefreshReady = "true";
    const projectBackImage = new Image();
    const refreshProjectBackLayout = () => {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    projectBackImage.addEventListener("load", refreshProjectBackLayout, {
      once: true,
    });
    projectBackImage.src = "images/ProjectBack.png";
    if (projectBackImage.complete) refreshProjectBackLayout();
  }
  const portfolioSplit = coverPortfolio
    ? new SplitText(coverPortfolio, {
        type: "chars",
        charsClass: "cover-title-char",
      })
    : null;
  const playCoverCharacterJump = (character, onComplete) => {
    const jumpState = { progress: 0 };
    character._coverJumpTween = gsap.to(jumpState, {
      progress: 1,
      duration: 1.2,
      ease: "sine.inOut",
      onUpdate: () => {
        const progress = jumpState.progress;
        const jumpCurve = Math.sin(Math.PI * progress);

        gsap.set(character, {
          y: `${-0.16 * jumpCurve}em`,
          rotation: -15 * Math.sin(Math.PI * 2 * progress),
          scale: 1 + 0.035 * jumpCurve,
        });
      },
      onComplete: () => {
        gsap.set(character, { y: 0, rotation: 0, scale: 1 });
        character._coverJumpTween = undefined;
        onComplete?.();
      },
    });
  };

  portfolioSplit?.chars.forEach((character) => {
    character.addEventListener("pointerenter", (event) => {
      if (
        event.pointerType === "touch" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        character._coverJumpTween?.isActive()
      ) {
        return;
      }

      playCoverCharacterJump(character);
    });
  });

  const replayCoverIntro = () => {
    if (!coverTopText || !portfolioSplit?.chars.length || !coverCopy) return;

    portfolioSplit.chars.forEach((character) => {
      character._coverJumpTween?.kill();
      character._coverJumpTween = undefined;
    });
    gsap.killTweensOf([coverTopText, portfolioSplit.chars, coverCopy]);
    const introTimeline = gsap
      .timeline()
      .fromTo(
        coverTopText,
        { x: -320, autoAlpha: 0 },
        {
          x: 0,
          autoAlpha: 1,
          duration: 0.8,
          ease: "power2.out",
        },
      )
      .fromTo(
        portfolioSplit.chars,
        { y: -80, rotation: 0, scale: 1, autoAlpha: 0 },
        {
          y: 0,
          rotation: 0,
          scale: 1,
          autoAlpha: 1,
          duration: 0.65,
          stagger: 0.05,
          ease: "power3.out",
        },
        "-=0.25",
      )
      .fromTo(
        coverCopy,
        { y: 40, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.7,
          ease: "power2.out",
        },
      );
  };

  mm.add("(min-width:769px)", () => {
    const sections = gsap.utils.toArray(".horizontal-section");
    const forestScene = document.querySelector(".forest-scene");
    const forestWorld = document.querySelector(".forest-world");
    const forestImage = document.querySelector(".forest-world__image");
    const about = document.querySelector(".sec-about");
    const aboutContent = about?.querySelector(".section-container");
    const journeyTransition = document.querySelector(".journey-transition");
    const aboutTransitionBackground = document.querySelector(
      ".about-transition-background",
    );
    const projectTransitionBackground = document.querySelector(
      ".about-project-background",
    );
    const cloudTransition = document.querySelector(
      ".about-project-cloud-transition",
    );
    const cloudLeft = cloudTransition?.querySelector(".cloud--left");
    const cloudRight = cloudTransition?.querySelector(".cloud--right");
    const cloudMist = cloudTransition?.querySelector(
      ".about-project-cloud-transition__mist",
    );
    const cloudLight = cloudTransition?.querySelector(
      ".about-project-cloud-transition__light",
    );
    const projectDarkOverlay = document.querySelector(".project-dark-overlay");
    const projectBackViewport = document.querySelector(
      ".project-back-viewport--journey",
    );
    const projectBackScrollLayer = projectBackViewport?.querySelector(
      ".project-back-scroll-layer",
    );
    const projectBackBreatheLayer = projectBackViewport?.querySelector(
      ".project-back-breathe-layer",
    );
    const projectBackColorOverlay = projectBackViewport?.querySelector(
      ".project-back-color-overlay",
    );
    const revealCopy = document.querySelector(".project-reveal-copy");
    const revealPhrases = gsap.utils.toArray(
      ".project-reveal-copy > div > span",
    );
    const revealPhraseDelayedLines = revealPhrases.flatMap((phrase) =>
      [...phrase.querySelectorAll(".cinematic-text__line")].slice(1),
    );
    const project = forestScene?.querySelector(".sec-project");
    const projectReveal = forestScene?.querySelector(".project-reveal");
    const projectRevealMask = forestScene?.querySelector(
      ".project-reveal__mask",
    );
    const projectMagneticField = forestScene?.querySelector(
      ".project-reveal__magnetic-field",
    );
    const revealElements = project?.querySelectorAll(
      ".category-box, .list-up, .marquee-control, .scroll-cue",
    );
    const projectPlanetRevealLayers = gsap.utils.toArray(
      ".sec-project .project-planet__reveal",
    );
    const projectPlanetParallaxLayers = gsap.utils.toArray(
      ".sec-project .project-planet__parallax",
    );
    const aboutRightBox = about?.querySelector(".about-right-box");
    const aboutScreenShutter = about?.querySelector(
      ".mission-screen__boot-shutter",
    );
    const aboutScreenCovers = gsap.utils.toArray(
      ".sec-about .mission-screen__boot-cover",
    );
    const aboutScreenBootLoader = aboutScreenShutter?.querySelector(
      ".mission-screen__boot-loader",
    );
    const aboutScreenBootProgress = aboutScreenShutter?.querySelector(
      ".project-tablet__loading-progress",
    );
    const aboutCardElements = [
      about?.querySelector(".mission-identity"),
      about?.querySelector(".mission-log"),
      about?.querySelector(".mission-modules"),
      about?.querySelector(".mission-certification"),
      about?.querySelector(".mission-achievement"),
    ].filter(Boolean);
    const aboutAniElements = gsap.utils
      .toArray(".sec-about [data-ani]")
      .filter((element) => !aboutCardElements.includes(element));
    const aboutTitleElements = gsap.utils.toArray(".sec-about [data-ani-2]");
    if (
      !forestScene ||
      !forestWorld ||
      !forestImage ||
      !about ||
      !aboutContent ||
      !aboutRightBox ||
      !journeyTransition ||
      !aboutTransitionBackground ||
      !projectTransitionBackground ||
      !cloudTransition ||
      !cloudLeft ||
      !cloudRight ||
      !cloudMist ||
      !cloudLight ||
      !projectDarkOverlay ||
      !projectBackViewport ||
      !projectBackScrollLayer ||
      !projectBackBreatheLayer ||
      !projectBackColorOverlay ||
      !revealCopy ||
      !project ||
      !projectReveal ||
      !projectRevealMask
    )
      return;

    const getMaxX = () => Math.max(0, forestWorld.offsetWidth / 2);
    const getMaxY = () =>
      Math.max(0, forestWorld.offsetHeight - window.innerHeight);
    const cinematicMotion =
      window.matchMedia("(min-width: 1281px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const projectBackReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const projectBackCameraRise = projectBackReducedMotion
      ? 1
      : cinematicMotion
        ? 6
        : 4;
    const projectBackBreatheScale = cinematicMotion ? 1.015 : 1.01;
    const projectBackTextBlur = projectBackReducedMotion
      ? 0
      : cinematicMotion
        ? 8
        : 6;
    const aboutSourceGeometry = {
      imageWidth: 1698,
      imageHeight: 928,
      tabletScreen: {
        minX: 695,
        minY: 491,
        maxX: 748,
        maxY: 545,
      },
    };
    const getTabletCenter = () => {
      const rect = about.getBoundingClientRect();
      const rootFontSize =
        Number.parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        ) || 10;
      const backgroundLeft = -rect.width * 0.12;
      const backgroundWidth = rect.width * 1.12 + rootFontSize * 0.2;
      const coverScale = Math.max(
        backgroundWidth / aboutSourceGeometry.imageWidth,
        rect.height / aboutSourceGeometry.imageHeight,
      );
      const renderedWidth = aboutSourceGeometry.imageWidth * coverScale;
      const renderedHeight = aboutSourceGeometry.imageHeight * coverScale;
      const cropOffsetX =
        backgroundLeft + (backgroundWidth - renderedWidth) / 2;
      const cropOffsetY = (rect.height - renderedHeight) / 2;
      const projectPoint = ({ x, y }) => ({
        x: cropOffsetX + x * coverScale,
        y: cropOffsetY + y * coverScale,
      });
      const tabletBounds = aboutSourceGeometry.tabletScreen;
      const tabletTopLeft = projectPoint({
        x: tabletBounds.minX,
        y: tabletBounds.minY,
      });
      const tabletBottomRight = projectPoint({
        x: tabletBounds.maxX,
        y: tabletBounds.maxY,
      });
      const tabletWidth = tabletBottomRight.x - tabletTopLeft.x;
      const tabletHeight = tabletBottomRight.y - tabletTopLeft.y;

      return {
        x: rect.left + tabletTopLeft.x + tabletWidth / 2,
        y: rect.top + tabletTopLeft.y + tabletHeight / 2,
      };
    };
    const getTabletTransformOrigin = () => {
      if (!cinematicMotion) return "50% 50%";

      const tabletCenter = getTabletCenter();
      const uiRect = aboutRightBox.getBoundingClientRect();

      return `${tabletCenter.x - uiRect.left}px ${tabletCenter.y - uiRect.top}px`;
    };

    if (forestImage.dataset.refreshReady !== "true") {
      forestImage.dataset.refreshReady = "true";
      const refreshForestScene = () => {
        requestAnimationFrame(() => ScrollTrigger.refresh());
      };
      forestImage.addEventListener("load", refreshForestScene, { once: true });
      if (forestImage.complete) refreshForestScene();
    }

    gsap.set(forestWorld, {
      x: 0,
      y: () => -getMaxY(),
    });
    gsap.set(about, {
      autoAlpha: 1,
      "--about-bg-opacity": 1,
    });
    gsap.set(aboutContent, {
      autoAlpha: 1,
      yPercent: 0,
      visibility: "visible",
      pointerEvents: "auto",
    });
    gsap.set(aboutTransitionBackground, {
      autoAlpha: 0,
      xPercent: 0,
      yPercent: 0,
      scale: 1,
      transformOrigin: "50% 50%",
    });
    gsap.set(projectTransitionBackground, {
      autoAlpha: 0,
      xPercent: 0,
      yPercent: 0,
      scale: 1.12,
      transformOrigin: "58% 26%",
    });
    gsap.set(aboutAniElements, { autoAlpha: 0, y: 40 });
    gsap.set(aboutTitleElements, { autoAlpha: 0, x: -120 });
    gsap.set(aboutRightBox, {
      autoAlpha: 0,
      scale: 1,
      transformOrigin: "50% 50%",
      force3D: false,
    });
    gsap.set(aboutCardElements, { autoAlpha: 1, y: 0, scale: 1 });
    gsap.set(aboutScreenShutter, { autoAlpha: 1 });
    gsap.set(aboutScreenCovers, { scaleY: 1 });
    gsap.set(aboutScreenBootLoader, { autoAlpha: 0 });
    gsap.set(aboutScreenBootProgress, {
      scaleX: 0,
      transformOrigin: "left center",
    });
    gsap.set(journeyTransition, { autoAlpha: 0 });
    gsap.set(cloudTransition, {
      opacity: 0,
      visibility: "visible",
    });
    gsap.set(cloudLeft, { xPercent: -10, scale: 0.9 });
    gsap.set(cloudRight, { xPercent: 10, scale: 0.9 });
    gsap.set([cloudMist, cloudLight], { opacity: 0 });
    gsap.set(projectDarkOverlay, { autoAlpha: 0 });
    gsap.set(projectBackScrollLayer, {
      yPercent: 0,
      scale: 1,
      transformOrigin: "50% 50%",
    });
    gsap.set(projectBackBreatheLayer, {
      yPercent: 0,
      scale: 1,
      transformOrigin: "50% 50%",
    });
    gsap.set(projectBackColorOverlay, {
      backgroundColor: "rgba(4, 35, 77, 0)",
      opacity: 0,
    });
    gsap.set(revealCopy, { autoAlpha: 1, y: 0, filter: "none" });
    gsap.set(revealPhrases, {
      autoAlpha: 0,
      y: projectBackReducedMotion ? 0 : 24,
      filter: `blur(${projectBackTextBlur}px)`,
      letterSpacing: "0em",
      pointerEvents: "none",
    });
    gsap.set(revealPhraseDelayedLines, {
      autoAlpha: 1,
      y: 0,
    });
    gsap.set(projectReveal, { pointerEvents: "none" });
    gsap.set(projectRevealMask, {
      visibility: "visible",
      clipPath: "circle(0% at 50% 0%)",
    });
    gsap.set(projectMagneticField, {
      opacity: 0,
      scale: 0.006,
      xPercent: -50,
      yPercent: -50,
    });
    gsap.set(project, { clearProps: "clipPath,transform,filter" });
    gsap.set(revealElements, { autoAlpha: 0, y: 40 });
    gsap.set(projectPlanetRevealLayers, {
      autoAlpha: 0,
      y: 40,
      scale: 0.9,
      transformOrigin: "50% 50%",
    });
    gsap.set(projectPlanetParallaxLayers, { y: 0 });

    const projectBackBreatheTween = projectBackReducedMotion
      ? null
      : gsap.fromTo(
          projectBackBreatheLayer,
          {
            scale: 1,
            yPercent: 0,
            transformOrigin: "50% 50%",
          },
          {
            scale: projectBackBreatheScale,
            yPercent: cinematicMotion ? -1 : -0.75,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            paused: true,
          },
        );
    const projectBackStartTime = 7.05;
    let projectBackEndTime = Infinity;
    let isProjectBackBreathing = false;
    let isAboutEntranceActive = false;
    const resetProjectBackPhrasesForReentry = () => {
      const phraseTargets = [...revealPhrases, ...revealPhraseDelayedLines];
      gsap.getTweensOf(phraseTargets).forEach((tween) => {
        let parent = tween.parent;
        let belongsToMasterTimeline = false;
        while (parent) {
          if (parent === scrollTween) {
            belongsToMasterTimeline = true;
            break;
          }
          parent = parent.parent;
        }
        if (!belongsToMasterTimeline) tween.kill();
      });
      gsap.set(revealPhrases, {
        autoAlpha: 0,
        y: projectBackReducedMotion ? 0 : 24,
        filter: `blur(${projectBackTextBlur}px)`,
      });
      gsap.set(revealPhraseDelayedLines, {
        autoAlpha: 1,
        y: 0,
      });
    };
    window.addEventListener(
      "project-back-phrases-reset",
      resetProjectBackPhrasesForReentry,
    );
    const aboutEntranceTimeline = gsap
      .timeline({ paused: true })
      .to(
        aboutRightBox,
        {
          autoAlpha: 1,
          duration: 0.8,
          ease: "power3.out",
        },
        0,
      )
      .set(aboutScreenBootLoader, { autoAlpha: 1 }, 0.4)
      .to(
        aboutScreenBootProgress,
        {
          scaleX: 1,
          duration: 0.5,
          ease: "power1.inOut",
        },
        0.4,
      )
      .to(
        aboutScreenBootLoader,
        {
          autoAlpha: 0,
          duration: 0.25,
          ease: "power1.out",
        },
        0.8,
      )
      .to(
        aboutScreenCovers,
        {
          scaleY: 0,
          duration: 0.5,
          ease: "power2.inOut",
        },
        1.2,
      )
      .set(aboutScreenShutter, { autoAlpha: 0 }, 2);

    const cloudTransitionPlayback = gsap
      .timeline({ paused: true })
      .set(cloudTransition, { opacity: 0 })
      .set(cloudLeft, { xPercent: -10, scale: 0.9 })
      .set(cloudRight, { xPercent: 10, scale: 0.9 })
      .set([cloudMist, cloudLight], { opacity: 0 })
      .to(
        cloudTransition,
        {
          opacity: cinematicMotion ? 0.86 : 0.7,
          duration: 0.3,
          ease: "none",
        },
        0,
      )
      .to(
        cloudLeft,
        {
          xPercent: 0,
          scale: 1.08,
          duration: 0.65,
          ease: "none",
        },
        0,
      )
      .to(
        cloudRight,
        {
          xPercent: 0,
          scale: 1.1,
          duration: 0.65,
          ease: "none",
        },
        0,
      )
      .to(
        cloudMist,
        {
          opacity: cinematicMotion ? 0.72 : 0.56,
          duration: 0.4,
          ease: "none",
        },
        0.12,
      )
      .to(
        cloudLight,
        {
          opacity: cinematicMotion ? 0.52 : 0.4,
          duration: 0.35,
          ease: "none",
        },
        0.2,
      )
      .to(
        [cloudLeft, cloudRight],
        {
          scale: 1.22,
          duration: 0.65,
          ease: "none",
        },
        0.85,
      )
      .to(
        cloudTransition,
        {
          opacity: 0,
          duration: 0.65,
          ease: "none",
        },
        0.85,
      );
    let previousMasterTime = 0;

    scrollTween = gsap.timeline({
      scrollTrigger: {
        id: "forest-master",
        trigger: forestScene,
        start: "top top",
        pin: true,
        scrub: 0.65,
        end: () => `+=${window.innerHeight * 15}`,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const masterDuration = scrollTween?.duration() || 1;
          const currentMasterTime = scrollTween?.time() || 0;
          const projectedMasterTime = self.progress * masterDuration;
          const aboutStart = scrollTween?.labels.aboutArrived ?? 1;
          const aboutEntranceStart = aboutStart * 0.75;
          const aboutEnd = scrollTween?.labels.aboutContentExit ?? 4.1;
          const isInsideAbout =
            projectedMasterTime >= aboutEntranceStart &&
            projectedMasterTime < aboutEnd;
          if (isInsideAbout && !isAboutEntranceActive) {
            isAboutEntranceActive = true;
            aboutEntranceTimeline.restart();
          } else if (!isInsideAbout && isAboutEntranceActive) {
            isAboutEntranceActive = false;
            if (projectedMasterTime < aboutEntranceStart)
              aboutEntranceTimeline.pause(0);
          }
          const shouldProjectBackBreathe =
            currentMasterTime >= projectBackStartTime &&
            currentMasterTime < projectBackEndTime;
          if (
            projectBackBreatheTween &&
            shouldProjectBackBreathe !== isProjectBackBreathing
          ) {
            isProjectBackBreathing = shouldProjectBackBreathe;
            if (shouldProjectBackBreathe) {
              projectBackBreatheTween.play();
            } else {
              projectBackBreatheTween.pause(0);
            }
          }
          const cloudStart =
            scrollTween?.labels["cloudTransitionIn"] ?? Infinity;
          const cloudEnd =
            scrollTween?.labels["cloudTransitionOut"] ?? Infinity;
          if (
            (self.direction > 0 &&
              previousMasterTime < cloudStart &&
              currentMasterTime >= cloudStart) ||
            (self.direction < 0 &&
              previousMasterTime > cloudEnd &&
              currentMasterTime <= cloudEnd)
          ) {
            cloudTransitionPlayback.restart();
          }
          previousMasterTime = currentMasterTime;

          const revealStart =
            (scrollTween.labels["circle-reveal"] ?? Infinity) / masterDuration;
          const revealEnd =
            (scrollTween.labels["project-ready"] ?? Infinity) / masterDuration;
          projectReveal.classList.toggle(
            "is-revealing",
            self.progress >= revealStart && self.progress < revealEnd,
          );
          document
            .querySelector("header")
            ?.classList.toggle(
              "is-project-section",
              self.progress >=
                (scrollTween.labels["circle-reveal"] ?? Infinity) /
                  masterDuration,
            );
        },
      },
    });

    scrollTween
      .addLabel("slide-0", 0)
      .addLabel("coverHorizontal", 0)
      .to(
        forestWorld,
        {
          x: () => -getMaxX(),
          y: () => -getMaxY(),
          duration: 1,
          ease: "none",
        },
        0,
      )
      .to(
        aboutAniElements,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.06,
          ease: "power2.out",
        },
        0.55,
      )
      .to(
        aboutTitleElements,
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.45,
          ease: "power2.out",
        },
        0.55,
      )
      .addLabel("slide-1", 1)
      .addLabel("aboutArrived", 1)
      .addLabel("aboutStable", 1)
      .to({}, { duration: 0.12 }, "aboutStable")
      .addLabel("aboutUiExpand", 1.3)
      .addLabel("cardsReveal", 2.02)
      .addLabel("aboutContentExit", 2.55)
      .to(
        aboutContent,
        {
          autoAlpha: 0,
          yPercent: -2,
          pointerEvents: "none",
          duration: 0.35,
          ease: "none",
        },
        "aboutContentExit",
      )
      .addLabel("look-up", 2.95)
      .addLabel("cameraUpStart", 2.95)
      .addLabel("aboutLiftOff", 2.95)
      .addLabel("aboutProjectBrightTransition", 2.95)
      .addLabel("aboutHandoff", 2.55)
      .set(journeyTransition, { autoAlpha: 1 }, "aboutHandoff")
      .set(
        aboutTransitionBackground,
        {
          autoAlpha: 0,
          xPercent: 0,
          yPercent: 0,
          scale: 1,
          transformOrigin: "50% 50%",
        },
        "aboutHandoff",
      )
      .set(
        [aboutTransitionBackground, projectTransitionBackground],
        { willChange: "transform,opacity" },
        "aboutHandoff",
      )
      .to(
        aboutTransitionBackground,
        {
          autoAlpha: 1,
          duration: 0.5,
          ease: "sine.inOut",
        },
        "aboutHandoff",
      )
      .to(
        about,
        {
          "--about-bg-opacity": 0,
          duration: 0.5,
          ease: "sine.inOut",
        },
        "aboutHandoff",
      )
      .addLabel("aboutCameraRise", 2.95)
      .to(
        aboutTransitionBackground,
        {
          scale: cinematicMotion ? 1.14 : 1.04,
          yPercent: cinematicMotion ? 4 : 2.5,
          transformOrigin: "58% 18%",
          duration: 2.9,
          ease: "none",
          force3D: cinematicMotion,
        },
        "aboutCameraRise",
      )
      .addLabel("backgroundCrossfade", 5.85)
      .addLabel("cloudTransitionIn", 5.55)
      .to(
        aboutTransitionBackground,
        {
          autoAlpha: 0,
          duration: 0.9,
          ease: "none",
        },
        "backgroundCrossfade",
      )
      .to(
        projectTransitionBackground,
        {
          autoAlpha: 1,
          xPercent: 0,
          yPercent: cinematicMotion ? 4 : 2.5,
          scale: 1,
          transformOrigin: "58% 26%",
          duration: 0.9,
          ease: "none",
          force3D: cinematicMotion,
        },
        "backgroundCrossfade",
      )
      .addLabel("cloudTransitionOut", 7.05)
      .addLabel("projectBackgroundSettled", 7.05)
      .addLabel("projectSettled", 7.05)
      .set(
        [
          aboutTransitionBackground,
          projectTransitionBackground,
          cloudTransition,
          cloudLeft,
          cloudRight,
          cloudMist,
          cloudLight,
        ],
        { willChange: "auto" },
        "projectSettled",
      )
      .addLabel("skyReached", 7.9)
      .addLabel("projectContentReveal", 9)
      .addLabel("firstPhrase", 9);

    // Preserve the original 12.5 circle-reveal position while enriching the
    // existing three-phrase sequence inside the same time budget.
    const originalCircleStart = 14;
    const projectRevealSpeed = 2;
    const baseProjectCircleSpeed = 1.5;
    const projectCircleDurationScale = 1.7;
    const projectCircleSpeed =
      baseProjectCircleSpeed / projectCircleDurationScale;
    const scaleProjectRevealTime = (time) => time / projectRevealSpeed;
    const scaleProjectCircleTime = (time) => time / projectCircleSpeed;
    const originalProjectReadyTime =
      originalCircleStart +
      1.55 +
      1.4 +
      Math.max(projectPlanetRevealLayers.length - 1, 0) * 0.22;
    const originalProjectBoundaryTime = originalProjectReadyTime + 0.12;
    const phraseEnterDuration = 1;
    const phraseExitDuration = 0.225;
    const phraseStepDuration = 0.5;
    // Keep the phrases distributed across projectBack so the final phrase
    // reaches the circle-reveal gate without a long empty camera-rise lead-in.
    // Shorten each desktop projectBack phrase-to-phrase scroll interval by
    // about 25% while preserving the existing reveal/exit animation speeds.
    const phraseHoldDuration = 0.94;
    const phraseOverlapDelay = 0.1;
    const getPhraseRevealDuration = () => phraseStepDuration;
    const projectBackTransitionComplete =
      scrollTween.labels.cloudTransitionOut ??
      scrollTween.labels.projectBackgroundSettled ??
      7.05;
    let phraseEnterTime = projectBackTransitionComplete;
    const projectPhraseStepTimes = [];

    revealPhrases.forEach((phrase, index) => {
      const phraseRevealDuration = getPhraseRevealDuration(phrase);
      projectPhraseStepTimes.push(phraseEnterTime + phraseRevealDuration);
      scrollTween.to(
        phrase,
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          letterSpacing: "0em",
          duration: phraseEnterDuration,
          ease: projectBackReducedMotion ? "power1.out" : "power2.out",
        },
        phraseEnterTime,
      );
      const phraseHoldEnd =
        phraseEnterTime + phraseRevealDuration + phraseHoldDuration;
      const nextPhrase = revealPhrases[index + 1];
      if (nextPhrase) {
        scrollTween.to(
          phrase,
          {
            autoAlpha: 0,
            y: projectBackReducedMotion ? 0 : -18,
            filter: projectBackReducedMotion ? "blur(0px)" : "blur(6px)",
            duration: phraseExitDuration,
            ease: projectBackReducedMotion ? "power1.in" : "power2.in",
          },
          phraseHoldEnd,
        );
        phraseEnterTime = phraseHoldEnd + phraseOverlapDelay;
      }
    });
    scrollTween.projectPhraseStepTimes = projectPhraseStepTimes;
    scrollTween.projectBackEntryTime =
      projectBackTransitionComplete + phraseEnterDuration;
    const baseProjectRevealStepDuration = 5 / projectRevealSpeed;
    const baseCircleRevealDuration = 2.2 / baseProjectCircleSpeed;
    const extendedCircleRevealDuration = scaleProjectCircleTime(2.2);
    scrollTween.projectRevealStepDuration =
      baseProjectRevealStepDuration +
      (extendedCircleRevealDuration - baseCircleRevealDuration);
    scrollTween.projectLastPhraseVisibleTime =
      phraseEnterTime + phraseEnterDuration;

    const lastPhraseStop = scrollTween.projectLastPhraseVisibleTime;
    const circleStart =
      lastPhraseStop +
      scaleProjectRevealTime(originalCircleStart - lastPhraseStop);

    projectBackEndTime = circleStart;
    const projectBackScrollDuration = circleStart - projectBackStartTime;
    scrollTween
      .fromTo(
        projectBackScrollLayer,
        { yPercent: 0 },
        {
          yPercent: projectBackCameraRise,
          duration: projectBackScrollDuration,
          ease: "none",
        },
        projectBackStartTime,
      )
      .to(
        projectBackColorOverlay,
        {
          backgroundColor: "rgba(5, 35, 79, 0.18)",
          opacity: 1,
          duration: projectBackScrollDuration * 0.45,
          ease: "none",
        },
        projectBackStartTime + projectBackScrollDuration * 0.25,
      )
      .to(
        projectBackColorOverlay,
        {
          backgroundColor: "rgba(4, 18, 52, 0.38)",
          opacity: 1,
          duration: projectBackScrollDuration * 0.3,
          ease: "none",
        },
        projectBackStartTime + projectBackScrollDuration * 0.7,
      );

    scrollTween
      .addLabel("cinematicPause", circleStart - scaleProjectRevealTime(0.5))
      .addLabel("circle-reveal", circleStart)
      .addLabel("projectReveal", circleStart)
      .set(projectReveal, { pointerEvents: "auto" }, circleStart)
      .to(
        journeyTransition,
        {
          autoAlpha: 0,
          duration: scaleProjectCircleTime(2.2),
          ease: "sine.inOut",
        },
        circleStart,
      )
      .to(
        projectBackScrollLayer,
        {
          scale: projectBackReducedMotion ? 1 : 1.25,
          duration: scaleProjectCircleTime(2.2),
          ease: "power2.inOut",
          transformOrigin: "50% 50%",
        },
        circleStart,
      )
      .to(
        projectRevealMask,
        {
          clipPath: "circle(150% at 50% 0%)",
          duration: scaleProjectCircleTime(2.2),
          ease: "power2.inOut",
        },
        circleStart,
      )
      .to(
        projectMagneticField,
        {
          scale: 1.1,
          duration: scaleProjectCircleTime(2.2),
          ease: "power2.inOut",
        },
        circleStart,
      )
      .to(
        projectMagneticField,
        {
          opacity: projectBackReducedMotion ? 0.28 : 0.85,
          duration: scaleProjectRevealTime(
            projectBackReducedMotion ? 0.15 : 0.35,
          ),
          ease: "power1.out",
        },
        circleStart,
      )
      .to(
        projectMagneticField,
        {
          opacity: 0,
          duration: scaleProjectRevealTime(
            projectBackReducedMotion ? 0.3 : 0.65,
          ),
          ease: "power1.in",
        },
        circleStart + scaleProjectCircleTime(1.35),
      )
      .to(
        revealPhrases.at(-1),
        {
          autoAlpha: 0,
          y: projectBackReducedMotion ? 0 : -18,
          filter: projectBackReducedMotion ? "blur(0px)" : "blur(6px)",
          duration: scaleProjectRevealTime(phraseExitDuration),
          ease: projectBackReducedMotion ? "power1.out" : "power2.in",
        },
        circleStart,
      )
      .to(
        revealElements,
        {
          autoAlpha: 1,
          y: 0,
          duration: scaleProjectRevealTime(0.8),
          stagger: scaleProjectRevealTime(0.12),
          ease: "power2.out",
        },
        circleStart + scaleProjectCircleTime(1.35),
      )
      .to(
        projectPlanetRevealLayers,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: scaleProjectRevealTime(1.4),
          stagger: scaleProjectRevealTime(0.22),
          ease: "power3.out",
        },
        circleStart + scaleProjectCircleTime(1.55),
      )
      .addLabel("project-ready")
      .to(
        projectPlanetParallaxLayers,
        {
          x: (index, element) =>
            (Number(
              element
                .closest(".project-planet")
                ?.style.getPropertyValue("--planet-parallax-x"),
            ) || 0) * (window.innerWidth <= 1280 ? 0.6 : 1),
          y: (index, element) =>
            (Number(
              element
                .closest(".project-planet")
                ?.style.getPropertyValue("--planet-parallax-y"),
            ) || 0) * (window.innerWidth <= 1280 ? 0.6 : 1),
          duration: scaleProjectRevealTime(1.4),
          ease: "none",
        },
        `project-ready-=${scaleProjectRevealTime(1.4)}`,
      )
      // Keep the completed planet frame just inside the forest pin. This
      // zero-motion guard prevents the following tablet trigger from firing
      // on the same wheel input; the next input crosses this boundary.
      .to(
        {},
        {
          duration: Math.max(
            originalProjectBoundaryTime - scrollTween.duration(),
            0.12,
          ),
        },
      )
      .addLabel("project-boundary-guard");

    const coverReplayTrigger = ScrollTrigger.create({
      trigger: cover,
      containerAnimation: scrollTween,
      start: "left center",
      end: "right center",
      onEnterBack: replayCoverIntro,
    });

    replayCoverIntro();

    return () => {
      window.removeEventListener(
        "project-back-phrases-reset",
        resetProjectBackPhrasesForReentry,
      );
      coverReplayTrigger.kill();
      cloudTransitionPlayback.kill();
      projectBackBreatheTween?.kill();
      aboutEntranceTimeline.kill();
      scrollTween?.kill();
      document.querySelector("header")?.classList.remove("is-project-section");
      gsap.set(
        [
          ...sections,
          forestWorld,
          forestImage,
          about,
          aboutContent,
          journeyTransition,
          aboutTransitionBackground,
          projectTransitionBackground,
          cloudTransition,
          cloudLeft,
          cloudRight,
          cloudMist,
          cloudLight,
          projectDarkOverlay,
          projectBackScrollLayer,
          projectBackBreatheLayer,
          projectBackColorOverlay,
          ...aboutAniElements,
          ...aboutTitleElements,
          aboutRightBox,
          ...aboutCardElements,
          revealCopy,
          ...revealPhrases,
          project,
          projectReveal,
          projectRevealMask,
          ...revealElements,
          ...projectPlanetRevealLayers,
          ...projectPlanetParallaxLayers,
        ],
        {
          clearProps:
            "transform,opacity,visibility,filter,backgroundColor,backgroundPosition,letterSpacing,willChange,clipPath,pointerEvents,--about-bg-opacity",
        },
      );
      projectReveal.classList.remove("is-revealing");
    };
  });

  mm.add("(max-width:768px)", () => {
    const about = document.querySelector(".sec-about");
    const aboutRightBox = about?.querySelector(".about-right-box");
    const aboutCardElements = [
      about?.querySelector(".mission-identity"),
      about?.querySelector(".mission-log"),
      about?.querySelector(".mission-modules"),
      about?.querySelector(".mission-certification"),
      about?.querySelector(".mission-achievement"),
    ].filter(Boolean);
    gsap.set(aboutRightBox, {
      autoAlpha: 1,
      scale: 1,
      clearProps: "transform",
    });
    gsap.set(aboutCardElements, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      clearProps: "transform",
    });
    gsap.set(".horizontal-section", { clearProps: "all" });
    gsap.set(".project-reveal-copy", { autoAlpha: 0 });
    gsap.set(".sec-project", {
      clearProps: "clip-path,pointer-events,opacity,visibility,transform",
    });
    gsap.set(
      ".sec-project .category-box, .sec-project .list-up, .sec-project .marquee-control, .sec-project .scroll-cue",
      {
        clearProps: "opacity,visibility,transform",
      },
    );
    const coverReplayTrigger = ScrollTrigger.create({
      trigger: cover,
      start: "top 80%",
      end: "bottom 20%",
      onEnterBack: replayCoverIntro,
    });
    replayCoverIntro();
    return () => {
      coverReplayTrigger.kill();
      gsap.set([aboutRightBox, ...aboutCardElements], {
        clearProps: "opacity,visibility,transform",
      });
    };
  });
}

// Stable mobile ProjectBack / Project reveal ------------------------------ //
function projectVerticalScroll__init() {
  const project = document.querySelector(".sec-project.vertical-section");
  const projectRevealMask = project?.closest(".project-reveal__mask");
  const projectReveal = projectRevealMask?.closest(".project-reveal");
  const projectMagneticField = projectReveal?.querySelector(
    ".project-reveal__magnetic-field",
  );
  const projectBackViewport = projectReveal?.querySelector(
    ".project-back-viewport--mobile",
  );
  const projectBackProgressLayer = projectBackViewport?.querySelector(
    ".project-back-mobile-progress-layer",
  );
  const revealCopy = document.querySelector(".project-reveal-copy");
  const revealPhrases = gsap.utils.toArray(".project-reveal-copy > div > span");
  const revealElements = project?.querySelectorAll(
    ".category-box, .list-up, .marquee-control, .scroll-cue",
  );
  const planetRevealLayers = gsap.utils.toArray(
    ".sec-project .project-planet__reveal",
  );
  const header = document.querySelector("header");

  if (
    !project ||
    !projectRevealMask ||
    !projectReveal ||
    !projectBackViewport ||
    !projectBackProgressLayer ||
    !revealCopy ||
    revealPhrases.length === 0
  ) {
    return;
  }

  projectReveal.classList.add("is-mobile-stable-reveal");
  projectReveal.appendChild(revealCopy);

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const hiddenClip = "circle(0px at 50% 0%)";
  const expandedClip = "circle(150vmax at 50% 0%)";
  const delayedLines = revealPhrases.flatMap((phrase) =>
    [...phrase.querySelectorAll(".cinematic-text__line")].slice(1),
  );

  gsap.set(projectRevealMask, {
    visibility: "visible",
    clipPath: hiddenClip,
    willChange: "clip-path",
  });
  gsap.set(projectMagneticField, {
    opacity: 0,
    scale: 0.006,
    xPercent: -50,
    yPercent: -50,
  });
  gsap.set(revealCopy, { autoAlpha: 1 });
  gsap.set(revealPhrases, {
    autoAlpha: 0,
    y: reducedMotion ? 0 : 24,
    filter: reducedMotion ? "blur(0px)" : "blur(8px)",
    pointerEvents: "none",
  });
  gsap.set(delayedLines, {
    autoAlpha: 0,
    y: reducedMotion ? 0 : 18,
  });
  gsap.set(revealElements, { autoAlpha: 0, y: 40 });
  gsap.set(planetRevealLayers, {
    autoAlpha: 0,
    y: reducedMotion ? 0 : 40,
    scale: reducedMotion ? 1 : 0.9,
    transformOrigin: "50% 50%",
  });
  gsap.set(projectBackProgressLayer, {
    scale: 1,
    transformOrigin: "50% 50%",
  });

  const mobileTimeline = gsap.timeline({
    scrollTrigger: {
      id: "project-vertical-pin",
      trigger: projectReveal,
      start: "top top",
      end: () => `+=${window.innerHeight * 6}`,
      pin: true,
      pinType: "transform",
      pinSpacing: true,
      scrub: reducedMotion ? true : 0.55,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onEnter: () => {
        header?.classList.add("is-project-section");
        gsap.set(revealCopy, { autoAlpha: 1 });
        gsap.set(revealPhrases[0], {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
        });
      },
      onEnterBack: () => header?.classList.add("is-project-section"),
      onLeave: () => header?.classList.remove("is-project-section"),
      onLeaveBack: () => header?.classList.remove("is-project-section"),
    },
  });

  revealPhrases.forEach((phrase, index) => {
    const phraseLabel = `mobilePhrase${index + 1}`;
    const phraseDelayedLines = [
      ...phrase.querySelectorAll(".cinematic-text__line"),
    ].slice(1);

    mobileTimeline.addLabel(phraseLabel);
    if (index === 0) {
      mobileTimeline.set(
        phrase,
        { autoAlpha: 1, y: 0, filter: "blur(0px)" },
        phraseLabel,
      );
    } else {
      mobileTimeline.to(
        phrase,
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.5,
          ease: "power2.out",
        },
        phraseLabel,
      );
    }

    if (phraseDelayedLines.length) {
      mobileTimeline.to(
        phraseDelayedLines,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
        },
        `${phraseLabel}+=1.25`,
      );
    }

    mobileTimeline
      .to({}, { duration: phraseDelayedLines.length ? 0.4 : 0.8 })
      .to(phrase, {
        autoAlpha: 0,
        y: reducedMotion ? 0 : -18,
        filter: reducedMotion ? "blur(0px)" : "blur(6px)",
        duration: 0.45,
        ease: "power2.in",
      });
  });

  mobileTimeline
    .addLabel("mobileCircleReveal")
    .to(
      projectBackProgressLayer,
      {
        scale: reducedMotion ? 1 : 1.25,
        duration: 3,
        ease: "power2.inOut",
      },
      "mobileCircleReveal",
    )
    .to(
      projectRevealMask,
      {
        clipPath: expandedClip,
        duration: 3,
        ease: "power2.inOut",
      },
      "mobileCircleReveal",
    )
    .to(
      projectMagneticField,
      {
        scale: 1.1,
        duration: 3,
        ease: "power2.inOut",
      },
      "mobileCircleReveal",
    )
    .to(
      projectMagneticField,
      {
        opacity: reducedMotion ? 0.24 : 0.82,
        duration: reducedMotion ? 0.15 : 0.4,
        ease: "power1.out",
      },
      "mobileCircleReveal",
    )
    .to(
      projectMagneticField,
      {
        opacity: 0,
        duration: reducedMotion ? 0.35 : 0.8,
        ease: "power1.in",
      },
      "mobileCircleReveal+=1.8",
    )
    .to(
      revealElements,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power2.out",
      },
      "mobileCircleReveal+=1.7",
    )
    .to(
      planetRevealLayers,
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: reducedMotion ? 0.5 : 1.4,
        stagger: reducedMotion ? 0.08 : 0.25,
        ease: "power3.out",
      },
      "mobileCircleReveal+=1.85",
    )
    .set(revealCopy, { autoAlpha: 0 })
    .addLabel("mobileProjectReady")
    .to({}, { duration: 3.4 });
}

// Legacy mobile step controller (kept inactive) ------------------------------ //
function projectVerticalScrollLegacy__init() {
  const project = document.querySelector(".sec-project.vertical-section");
  const header = document.querySelector("header");
  const category = project?.querySelector(".category-box");
  const lineWrapper = project?.querySelector(".bg-line-wrapper");
  const projectList = document.querySelector("#sec-project-list");
  const revealCopy = document.querySelector(".project-reveal-copy");
  const revealPhrases = gsap.utils.toArray(".project-reveal-copy > div > span");
  const projectBackViewport = document.querySelector(
    ".project-back-viewport--mobile",
  );
  const projectRevealContainer =
    projectBackViewport?.closest(".project-reveal");
  const projectBackScrollLayer = projectBackViewport?.querySelector(
    ".project-back-scroll-layer",
  );
  const projectBackBreatheLayer = projectBackViewport?.querySelector(
    ".project-back-breathe-layer",
  );
  const projectBackProgressLayer = projectBackViewport?.querySelector(
    ".project-back-mobile-progress-layer",
  );
  const projectBackColorOverlay = projectBackViewport?.querySelector(
    ".project-back-color-overlay",
  );
  const projectRevealMask = project?.closest(".project-reveal__mask");
  const revealElements = project?.querySelectorAll(
    ".category-box, .list-up, .marquee-control, .scroll-cue",
  );
  const projectPlanetRevealLayers = gsap.utils.toArray(
    ".sec-project .project-planet__reveal",
  );
  const projectPlanetParallaxLayers = gsap.utils.toArray(
    ".sec-project .project-planet__parallax",
  );
  if (
    !project ||
    !projectRevealContainer ||
    !projectBackViewport ||
    !projectBackScrollLayer ||
    !projectBackBreatheLayer ||
    !projectBackProgressLayer ||
    !projectBackColorOverlay ||
    !projectRevealMask
  )
    return;

  lineWrapper?.remove();
  gsap.set(category, { autoAlpha: 1 });
  gsap.set(project, { "--project-blur-opacity": 0 });
  const projectBackReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const mobileTextBlur = projectBackReducedMotion ? 0 : 8;
  let mobileBreatheTween;

  gsap.set(projectBackScrollLayer, {
    yPercent: 0,
    transformOrigin: "50% 50%",
  });
  gsap.set(projectBackBreatheLayer, {
    yPercent: 0,
    scale: 1,
    transformOrigin: "50% 50%",
  });
  gsap.set(projectBackProgressLayer, {
    yPercent: 0,
    scale: 1,
    transformOrigin: "50% 50%",
  });
  gsap.set(projectBackColorOverlay, {
    backgroundColor: "rgba(4, 35, 77, 0)",
    opacity: 0,
  });
  gsap.set(projectPlanetRevealLayers, {
    autoAlpha: 0,
    y: projectBackReducedMotion ? 0 : 40,
    scale: projectBackReducedMotion ? 1 : 0.9,
    transformOrigin: "50% 50%",
  });
  gsap.set(projectPlanetParallaxLayers, { y: 0 });

  const projectPin = ScrollTrigger.create({
    id: "project-vertical-pin",
    trigger: project,
    start: "top top",
    end: "+=150%",
    pin: true,
    // Mobile uses a vertical document flow. Reserve the full reveal distance so
    // the following project list cannot cover or immediately replace ProjectBack.
    pinSpacing: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onEnter: () => {
      header?.classList.add("is-project-section");
    },
    onEnterBack: () => {
      header?.classList.add("is-project-section");
    },
    onLeave: () => {
      header?.classList.remove("is-project-section");
    },
    onLeaveBack: () => {
      header?.classList.remove("is-project-section");
    },
  });

  mobileBreatheTween = projectBackReducedMotion
    ? null
    : gsap.fromTo(
        projectBackBreatheLayer,
        {
          scale: 1,
          yPercent: 0,
          transformOrigin: "50% 50%",
        },
        {
          scale: 1.015,
          yPercent: -1,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          paused: true,
        },
      );
  const projectBackBreatheTrigger = ScrollTrigger.create({
    id: "project-back-mobile-breathe",
    trigger: projectBackViewport.closest(".project-reveal"),
    start: "top bottom",
    end: () => projectPin.end,
    invalidateOnRefresh: true,
    onEnter: () => mobileBreatheTween?.play(),
    onEnterBack: () => mobileBreatheTween?.play(),
    onLeave: () => mobileBreatheTween?.pause(),
    onLeaveBack: () => mobileBreatheTween?.pause(0),
  });
  if (projectBackBreatheTrigger.isActive) mobileBreatheTween?.play();

  const projectBackScrollTimeline = gsap.timeline({
    scrollTrigger: {
      id: "project-back-mobile-camera",
      trigger: project,
      start: "top top",
      end: () => projectPin.end,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  });
  projectBackScrollTimeline
    .to({}, { duration: 0.25 }, 0)
    .to(
      projectBackColorOverlay,
      {
        backgroundColor: "rgba(5, 35, 79, 0.18)",
        opacity: 1,
        duration: 0.45,
        ease: "none",
      },
      0.25,
    )
    .to(
      projectBackColorOverlay,
      {
        backgroundColor: "rgba(4, 18, 52, 0.38)",
        opacity: 1,
        duration: 0.3,
        ease: "none",
      },
      0.7,
    );

  if (!projectBackReducedMotion) {
    gsap.to(projectPlanetParallaxLayers, {
      x: (index, element) =>
        Number(
          element
            .closest(".project-planet")
            ?.style.getPropertyValue("--planet-mobile-parallax-x"),
        ) || 0,
      y: (index, element) =>
        Number(
          element
            .closest(".project-planet")
            ?.style.getPropertyValue("--planet-mobile-parallax-y"),
        ) || 0,
      ease: "none",
      scrollTrigger: {
        id: "project-planets-mobile-parallax",
        trigger: project,
        start: "top top",
        end: () => projectPin.end,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
  }

  const revealMedia = gsap.matchMedia();

  revealMedia.add("(min-width: 0px)", () => {
    const hiddenClip = "circle(0px at 50% 0%)";
    const centeredClip = "circle(15px at 50% 0%)";
    const expandedClip = "circle(150vmax at 50% 0%)";
    let revealState = "collapsed";
    let isAnimating = false;
    let isScrollLocked = false;
    let isWaitingForReveal = false;
    let isMenuReturnTransition = false;
    let revealDirection;
    let revealTimeline;
    let previousRevealScrollY = window.scrollY;
    let previousHtmlOverflowY = "";
    let previousBodyOverflowY = "";
    let revealTouchStartY;
    let revealPhraseIndex = -1;
    let isPhraseAnimating = false;

    gsap.set(project, { clipPath: "none" });
    gsap.set(projectRevealMask, {
      clipPath: hiddenClip,
      willChange: "clip-path",
    });
    gsap.set(revealCopy, { autoAlpha: 0 });
    gsap.set(revealPhrases, {
      autoAlpha: 0,
      y: projectBackReducedMotion ? 0 : 24,
      filter: `blur(${mobileTextBlur}px)`,
      letterSpacing: "0em",
      pointerEvents: "none",
    });
    gsap.set(
      revealPhrases.flatMap((phrase) =>
        [...phrase.querySelectorAll(".cinematic-text__line")].slice(1),
      ),
      {
        autoAlpha: 0,
        y: projectBackReducedMotion ? 0 : 18,
      },
    );
    gsap.set(revealElements, { autoAlpha: 0, y: 40 });

    const showRevealPhrase = (nextIndex) => {
      if (isPhraseAnimating) return;

      isPhraseAnimating = true;
      gsap.killTweensOf(revealCopy);
      gsap.set(revealCopy, { autoAlpha: 1 });
      const currentPhrase = revealPhrases[revealPhraseIndex];
      const nextPhrase = revealPhrases[nextIndex];
      const phraseTimeline = gsap.timeline({
        defaults: { overwrite: true },
        onComplete: () => {
          revealPhraseIndex = nextIndex;
          isPhraseAnimating = false;
        },
      });

      if (currentPhrase) {
        phraseTimeline.to(currentPhrase, {
          autoAlpha: 0,
          y: projectBackReducedMotion ? 0 : -18,
          filter: projectBackReducedMotion ? "blur(0px)" : "blur(6px)",
          duration: 0.45,
          ease: projectBackReducedMotion ? "power1.in" : "power2.in",
        });
      }

      if (nextPhrase) {
        const delayedLines = [
          ...nextPhrase.querySelectorAll(".cinematic-text__line"),
        ].slice(1);
        gsap.set(delayedLines, {
          autoAlpha: 0,
          y: projectBackReducedMotion ? 0 : 18,
        });
        phraseTimeline.addLabel(
          "nextPhraseIn",
          currentPhrase ? phraseTimeline.duration() - 0.35 : 0,
        );
        phraseTimeline.to(
          nextPhrase,
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            letterSpacing: "0em",
            duration: 0.5,
            ease: projectBackReducedMotion ? "power1.out" : "power2.out",
          },
          "nextPhraseIn",
        );
        if (delayedLines.length) {
          phraseTimeline.to(
            delayedLines,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.5,
              ease: "power2.out",
            },
            "nextPhraseIn+=1.25",
          );
        }
      }
    };

    const resetRevealPhrases = () => {
      gsap.killTweensOf(revealPhrases);
      gsap.set(revealPhrases, {
        autoAlpha: 0,
        y: projectBackReducedMotion ? 0 : 24,
        filter: `blur(${mobileTextBlur}px)`,
        letterSpacing: "0em",
      });
      gsap.set(
        revealPhrases.flatMap((phrase) =>
          [...phrase.querySelectorAll(".cinematic-text__line")].slice(1),
        ),
        {
          autoAlpha: 0,
          y: projectBackReducedMotion ? 0 : 18,
        },
      );
      gsap.set(projectBackProgressLayer, { yPercent: 0, scale: 1 });
      revealPhraseIndex = -1;
      isPhraseAnimating = false;
    };

    const updateRevealCopyPosition = () => {
      if (!revealCopy) return;

      const projectTop = gsap.utils.clamp(
        0,
        window.innerHeight,
        project.getBoundingClientRect().top,
      );
      const whiteAreaCenter =
        projectTop + (window.innerHeight - projectTop) / 2;

      gsap.set(revealCopy, {
        "--project-reveal-copy-y": `${whiteAreaCenter}px`,
      });
    };

    const fadeRevealCopy = (show) => {
      gsap.to(revealCopy, {
        autoAlpha: show ? 1 : 0,
        duration: show ? 1 : 0.3,
        ease: "power1.out",
        overwrite: true,
      });
    };

    const queueInitialRevealPhrase = () => {
      requestAnimationFrame(() => {
        if (
          revealState !== "collapsed" ||
          isAnimating ||
          isWaitingForReveal ||
          revealPhraseIndex >= 0 ||
          isPhraseAnimating
        ) {
          return;
        }

        scrollToRevealPosition(projectPin.start);
        updateRevealCopyPosition();
        fadeRevealCopy(true);
        isWaitingForReveal = true;
        setRevealScrollLocked(true);
        showRevealPhrase(0);
      });
    };

    const copyVisibilityTrigger = ScrollTrigger.create({
      id: "project-reveal-copy-visibility",
      trigger: project,
      start: "top 80%",
      end: () => projectPin.end,
      onEnter: () => {
        updateRevealCopyPosition();
        fadeRevealCopy(true);
        queueInitialRevealPhrase();
      },
      onEnterBack: () => {
        updateRevealCopyPosition();
        fadeRevealCopy(true);
        queueInitialRevealPhrase();
      },
      onLeave: () => fadeRevealCopy(false),
      onLeaveBack: () => fadeRevealCopy(false),
      onUpdate: (self) => {
        updateRevealCopyPosition();
        if (self.isActive) queueInitialRevealPhrase();
      },
      invalidateOnRefresh: true,
    });
    if (copyVisibilityTrigger.isActive || projectPin.isActive) {
      queueInitialRevealPhrase();
    }

    const setRevealScrollLocked = (locked) => {
      if (isScrollLocked === locked) return;

      isScrollLocked = locked;

      if (locked) {
        previousHtmlOverflowY = document.documentElement.style.overflowY;
        previousBodyOverflowY = document.body.style.overflowY;
        document.documentElement.style.overflowY = "hidden";
        document.body.style.overflowY = "hidden";
        lenis?.stop();
      } else {
        document.documentElement.style.overflowY = previousHtmlOverflowY;
        document.body.style.overflowY = previousBodyOverflowY;
        lenis?.start();
        ScrollTrigger.update();
        window.dispatchEvent(new Event("header-scroll-sync"));
      }
    };

    const scrollToRevealPosition = (position) => {
      if (lenis) {
        lenis.scrollTo(position, {
          immediate: true,
          force: true,
        });
      } else {
        window.scrollTo(0, position);
      }
      ScrollTrigger.update();
      window.dispatchEvent(new Event("header-scroll-sync"));
    };

    const getProjectListEntryStart = () => {
      const listEntryTrigger = ScrollTrigger.getById(
        "project-list-backdrop-blur",
      );
      if (listEntryTrigger) return listEntryTrigger.start;

      const projectListTop =
        window.scrollY +
        (projectList?.getBoundingClientRect().top ?? window.innerHeight);
      return projectListTop - window.innerHeight;
    };

    const animateReveal = (expand, onComplete) => {
      if (isAnimating) return;

      isAnimating = true;
      revealDirection = expand ? "expanding" : "collapsing";
      if (!expand) {
        scrollToRevealPosition(projectPin.start);
        updateRevealCopyPosition();
      }
      projectRevealMask.classList.add("is-mobile-clipping");
      setRevealScrollLocked(true);
      if (expand && projectList) {
        gsap.set(projectList, {
          autoAlpha: 0,
          pointerEvents: "none",
        });
      }
      gsap.killTweensOf(projectRevealMask, "clipPath");

      const finishReveal = () => {
        revealState = expand ? "expanded" : "collapsed";
        if (!expand) {
          resetRevealPhrases();
          header?.classList.remove("is-project-section");
          scrollToRevealPosition(projectPin.start);
          updateRevealCopyPosition();
          fadeRevealCopy(true);
        }
        isAnimating = false;
        revealDirection = undefined;
        revealTimeline = undefined;
        projectRevealMask.classList.remove("is-mobile-clipping");
        if (projectList) {
          gsap.set(projectList, {
            autoAlpha: 1,
            pointerEvents: "auto",
          });
        }
        setRevealScrollLocked(false);
        onComplete?.();
      };

      revealTimeline = gsap.timeline({
        defaults: {
          overwrite: true,
        },
        onComplete: finishReveal,
        onInterrupt: finishReveal,
      });

      if (expand) {
        revealTimeline
          .to(
            projectBackProgressLayer,
            {
              scale: projectBackReducedMotion ? 1 : 1.25,
              duration: 3,
              ease: "power2.inOut",
              transformOrigin: "50% 50%",
            },
            0,
          )
          .to(
            projectRevealMask,
            {
              clipPath: expandedClip,
              duration: 3,
              ease: "power2.inOut",
            },
            0,
          )
          .to(
            revealElements,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.8,
              stagger: 0.12,
              ease: "power2.out",
            },
            "-=0.65",
          )
          .to(
            projectPlanetRevealLayers,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: projectBackReducedMotion ? 0.5 : 1.4,
              stagger: projectBackReducedMotion ? 0.08 : 0.25,
              ease: "power3.out",
            },
            "-=0.5",
          )
          .call(
            () => header?.classList.add("is-project-section"),
            null,
            "<50%",
          );
      } else {
        revealTimeline
          .to(
            projectBackProgressLayer,
            {
              scale: 1,
              duration: 1.55,
              ease: "power2.inOut",
              transformOrigin: "50% 50%",
            },
            0,
          )
          .to(
            projectPlanetRevealLayers,
            {
              autoAlpha: 0,
              y: projectBackReducedMotion ? 0 : 24,
              scale: projectBackReducedMotion ? 1 : 0.94,
              duration: 0.25,
              stagger: 0.04,
              ease: "power2.in",
            },
            0,
          )
          .to(revealElements, {
            autoAlpha: 0,
            y: 40,
            duration: 0.25,
            ease: "power2.in",
          })
          .to(projectRevealMask, {
            clipPath: centeredClip,
            duration: 1.2,
            ease: "power2.inOut",
          })
          .to(projectRevealMask, {
            clipPath: hiddenClip,
            duration: 0.35,
            ease: "power2.in",
          });
      }
    };

    const handleRevealBoundaries = () => {
      if (isMenuReturnTransition) return;

      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > previousRevealScrollY;
      const isScrollingUp = currentScrollY < previousRevealScrollY;
      previousRevealScrollY = currentScrollY;

      if (isAnimating) {
        if (revealDirection !== "expanding" || isScrollLocked) return;

        const listGate = getProjectListEntryStart() - 2;
        if (currentScrollY < listGate) return;

        setRevealScrollLocked(true);
        scrollToRevealPosition(listGate);
        return;
      }

      const boundaryTolerance = Math.max(40, window.innerHeight * 0.04);
      const projectListRect = projectList?.getBoundingClientRect();
      const isProjectListClosed =
        !projectListRect ||
        projectListRect.top >= window.innerHeight - boundaryTolerance;
      const collapseGate = getProjectListEntryStart();

      if (
        revealState === "collapsed" &&
        isScrollingDown &&
        currentScrollY >= projectPin.start - boundaryTolerance &&
        currentScrollY <= projectPin.end + boundaryTolerance
      ) {
        scrollToRevealPosition(projectPin.start);
        isWaitingForReveal = true;
        setRevealScrollLocked(true);
        if (revealPhraseIndex < 0 && !isPhraseAnimating) {
          showRevealPhrase(0);
        }
      } else if (
        revealState === "expanded" &&
        isScrollingUp &&
        isProjectListClosed &&
        currentScrollY <= collapseGate + boundaryTolerance
      ) {
        scrollToRevealPosition(collapseGate);
        animateReveal(false);
      }
    };

    const handleRevealInput = (deltaY, event) => {
      if (isWaitingForReveal) {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (isPhraseAnimating) return;

        if (deltaY > 0 && revealPhraseIndex < revealPhrases.length - 1) {
          showRevealPhrase(revealPhraseIndex + 1);
        } else if (deltaY > 0) {
          isWaitingForReveal = false;
          const lastPhrase = revealPhrases[revealPhraseIndex];
          gsap.to(lastPhrase, {
            autoAlpha: 0,
            y: projectBackReducedMotion ? 0 : -18,
            filter: projectBackReducedMotion ? "blur(0px)" : "blur(6px)",
            duration: 0.45,
            ease: projectBackReducedMotion ? "power1.out" : "power2.in",
            onComplete: () => {
              fadeRevealCopy(false);
              animateReveal(true);
            },
          });
        } else if (revealPhraseIndex >= 0) {
          showRevealPhrase(revealPhraseIndex - 1);
        } else {
          isWaitingForReveal = false;
          setRevealScrollLocked(false);
        }
        return;
      }

      if (isAnimating) {
        if (isScrollLocked) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }

      const pinTolerance = Math.max(40, window.innerHeight * 0.04);
      const isAtPinStart =
        Math.abs(window.scrollY - projectPin.start) <= pinTolerance;
      const collapseGate = getProjectListEntryStart();
      const isAtCollapseGate =
        Math.abs(window.scrollY - collapseGate) <= pinTolerance;
      const projectListRect = projectList?.getBoundingClientRect();
      const isProjectListClosed =
        !projectListRect ||
        projectListRect.top >= window.innerHeight - pinTolerance;

      if (
        revealState === "collapsed" &&
        projectPin.isActive &&
        isAtPinStart &&
        deltaY > 0
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        isWaitingForReveal = true;
        setRevealScrollLocked(true);
        showRevealPhrase(0);
      } else if (
        revealState === "expanded" &&
        isAtCollapseGate &&
        isProjectListClosed &&
        deltaY < 0
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        animateReveal(false);
      }
    };

    const handleRevealWheel = (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      handleRevealInput(event.deltaY, event);
    };

    const handleRevealTouchStart = (event) => {
      revealTouchStartY = event.touches[0]?.clientY;
    };

    const handleRevealTouchMove = (event) => {
      const currentTouchY = event.touches[0]?.clientY;
      if (revealTouchStartY === undefined || currentTouchY === undefined) {
        return;
      }

      const deltaY = revealTouchStartY - currentTouchY;
      if (Math.abs(deltaY) < 8) return;

      handleRevealInput(deltaY, event);
      revealTouchStartY = currentTouchY;
    };

    const handleProjectMenuReveal = () => {
      isWaitingForReveal = false;
      isMenuReturnTransition = false;

      if (revealState === "collapsed" && !isAnimating) {
        scrollToRevealPosition(projectPin.start);
        animateReveal(true);
      }
    };

    const handleProjectMenuNavigate = () => {
      const boundaryTolerance = Math.max(40, window.innerHeight * 0.04);

      if (window.scrollY >= projectPin.start - boundaryTolerance) {
        isMenuReturnTransition = true;
        isWaitingForReveal = false;
      }
    };

    const handleProjectMenuReturn = (event) => {
      const { continueNavigation } = event.detail ?? {};
      if (typeof continueNavigation !== "function") return;

      if (revealState !== "expanded" || isAnimating) {
        return;
      }

      event.detail.handled = true;
      isMenuReturnTransition = true;
      isWaitingForReveal = false;
      setRevealScrollLocked(true);

      const collapseAndContinue = () => {
        animateReveal(false, () => {
          isMenuReturnTransition = false;
          header?.classList.remove("is-project-section", "is-project-list");
          continueNavigation();
        });
      };
      const collapseGate = getProjectListEntryStart();
      const isBelowCollapseGate =
        window.scrollY > collapseGate + Math.max(40, window.innerHeight * 0.04);

      if (isBelowCollapseGate) {
        gsap.to(window, {
          scrollTo: { y: collapseGate, autoKill: false },
          duration: 1,
          ease: "power2.out",
          overwrite: "auto",
          onComplete: collapseAndContinue,
        });
      } else {
        collapseAndContinue();
      }
    };

    window.addEventListener("wheel", handleRevealWheel, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchstart", handleRevealTouchStart, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchmove", handleRevealTouchMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener("scroll", handleRevealBoundaries, {
      passive: true,
    });
    window.addEventListener("project-menu-navigate", handleProjectMenuNavigate);
    window.addEventListener("project-menu-reveal", handleProjectMenuReveal);
    window.addEventListener("project-menu-return", handleProjectMenuReturn);

    return () => {
      window.removeEventListener("wheel", handleRevealWheel, true);
      window.removeEventListener("touchstart", handleRevealTouchStart, true);
      window.removeEventListener("touchmove", handleRevealTouchMove, true);
      window.removeEventListener("scroll", handleRevealBoundaries);
      window.removeEventListener(
        "project-menu-navigate",
        handleProjectMenuNavigate,
      );
      window.removeEventListener(
        "project-menu-reveal",
        handleProjectMenuReveal,
      );
      window.removeEventListener(
        "project-menu-return",
        handleProjectMenuReturn,
      );
      copyVisibilityTrigger.kill();
      revealTimeline?.kill();
      gsap.killTweensOf(projectRevealMask, "clipPath");
      gsap.set(project, { clearProps: "clipPath" });
      gsap.set(projectRevealMask, { clearProps: "clipPath,willChange" });
      projectRevealMask.classList.remove("is-mobile-clipping");
      gsap.set(revealElements, {
        clearProps: "transform,opacity,visibility",
      });
      gsap.set([...projectPlanetRevealLayers, ...projectPlanetParallaxLayers], {
        clearProps: "transform,opacity,visibility",
      });
      if (projectList) {
        gsap.set(projectList, {
          clearProps: "opacity,visibility,pointerEvents",
        });
      }
      gsap.set(revealCopy, { clearProps: "opacity,visibility" });
      gsap.set(revealPhrases, {
        clearProps:
          "transform,opacity,visibility,filter,letterSpacing,pointerEvents",
      });
      setRevealScrollLocked(false);
    };
  });
}

// Project space background motion ------------------------------ //
function projectBackgroundMotion__init() {
  const section = document.querySelector(".sec-project");
  const parallaxLayer = section?.querySelector(".project-space-bg");
  const floatingLayer = section?.querySelector(".project-space-bg__image");
  if (
    !section ||
    !parallaxLayer ||
    !floatingLayer ||
    section.dataset.backgroundMotionReady === "true"
  ) {
    return;
  }

  section.dataset.backgroundMotionReady = "true";

  const refreshAfterImageLoad = () => {
    requestAnimationFrame(() => ScrollTrigger.refresh());
  };
  floatingLayer.addEventListener("load", refreshAfterImageLoad, { once: true });
  if (floatingLayer.complete) refreshAfterImageLoad();

  const mm = gsap.matchMedia();
  mm.add(
    {
      desktop: "(min-width: 1281px)",
      tablet: "(min-width: 769px) and (max-width: 1280px)",
      reducedMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { desktop, tablet, reducedMotion } = context.conditions;

      if (reducedMotion) {
        gsap.set([parallaxLayer, floatingLayer], {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
        });
        return;
      }

      const floatingTween = gsap.fromTo(
        floatingLayer,
        {
          x: -6,
          y: 7,
          rotation: -0.12,
          scale: 1.005,
        },
        {
          x: 8,
          y: -10,
          rotation: 0.2,
          scale: 1.01,
          duration: 9.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        },
      );

      if (!desktop && !tablet) {
        return () => {
          floatingTween.kill();
          gsap.set(floatingLayer, { clearProps: "transform" });
        };
      }

      const maxX = desktop ? 12.5 : 6.25;
      const maxY = desktop ? 10 : 5;
      const moveX = gsap.quickTo(parallaxLayer, "x", {
        duration: 1.2,
        ease: "power3.out",
      });
      const moveY = gsap.quickTo(parallaxLayer, "y", {
        duration: 1.2,
        ease: "power3.out",
      });
      let pointerX = 0;
      let pointerY = 0;
      let moveFrame;
      let returnTimer;

      const renderPointerMove = () => {
        moveFrame = undefined;
        moveX(pointerX);
        moveY(pointerY);
      };

      const returnToCenter = () => {
        window.clearTimeout(returnTimer);
        moveX(0);
        moveY(0);
      };

      const handlePointerMove = (event) => {
        const rect = section.getBoundingClientRect();
        const normalizedX = (event.clientX - rect.left) / rect.width - 0.5;
        const normalizedY = (event.clientY - rect.top) / rect.height - 0.5;
        pointerX = gsap.utils.clamp(-1, 1, normalizedX * 2) * maxX;
        pointerY = gsap.utils.clamp(-1, 1, normalizedY * 2) * maxY;

        if (!moveFrame) {
          moveFrame = requestAnimationFrame(renderPointerMove);
        }
        window.clearTimeout(returnTimer);
        returnTimer = window.setTimeout(returnToCenter, 260);
      };

      section.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      section.addEventListener("pointerleave", returnToCenter, {
        passive: true,
      });

      return () => {
        section.removeEventListener("pointermove", handlePointerMove);
        section.removeEventListener("pointerleave", returnToCenter);
        if (moveFrame) cancelAnimationFrame(moveFrame);
        window.clearTimeout(returnTimer);
        floatingTween.kill();
        gsap.killTweensOf(parallaxLayer);
        gsap.set([parallaxLayer, floatingLayer], {
          clearProps: "transform",
        });
      };
    },
  );
}

// Project planet motion ------------------------------ //
function projectPlanetMotion__init() {
  const universe = document.querySelector(".sec-project .project-universe");
  if (!universe || universe.dataset.motionReady === "true") return;

  universe.dataset.motionReady = "true";
  const section = universe.closest(".sec-project");
  const planetItems = gsap.utils.toArray(".sec-project .project-planet");
  const orbitControl = section?.querySelector(".project-orbit-control");
  const planetImages = planetItems
    .map((item) => item.querySelector(".project-planet__image"))
    .filter(Boolean);
  const floatConfigs = [
    { x: 3, y: -4, duration: 6.8 },
    { x: -4, y: 3, duration: 7.4 },
    { x: 2, y: -5, duration: 8.2 },
    { x: -3, y: -4, duration: 7 },
    { x: 4, y: 3, duration: 8 },
    { x: -2, y: -3, duration: 8.6 },
  ];

  let pendingImages = planetImages.filter((image) => !image.complete).length;
  const refreshAfterPlanetsLoad = () => {
    pendingImages -= 1;
    if (pendingImages <= 0) {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  };
  planetImages.forEach((image) => {
    if (!image.complete) {
      image.addEventListener("load", refreshAfterPlanetsLoad, { once: true });
      image.addEventListener("error", refreshAfterPlanetsLoad, { once: true });
    }
  });
  if (!pendingImages) requestAnimationFrame(() => ScrollTrigger.refresh());

  const handlePlanetClick = (event) => {
    const link = event.target.closest(".project-planet");
    if (!link) return;

    const projectIndex =
      Number(link.className.match(/project-planet--(\d+)/)?.[1]) - 1;
    const projectTrigger = ScrollTrigger.getById("proj-pin");
    const projectTimeline = projectTrigger?.animation;
    if (
      !Number.isInteger(projectIndex) ||
      projectIndex < 0 ||
      !projectTrigger ||
      !projectTimeline
    ) {
      return;
    }

    event.preventDefault();
    window.dispatchEvent(
      new CustomEvent("project-planet-select", {
        detail: { projectIndex },
      }),
    );
    const targetY = projectTrigger.start + 2;

    gsap.to(window, {
      scrollTo: { y: targetY, autoKill: false },
      duration: 1.2,
      ease: "power2.inOut",
      overwrite: "auto",
    });
  };
  universe.addEventListener("click", handlePlanetClick);

  const planetMedia = gsap.matchMedia();
  planetMedia.add(
    {
      desktop: "(min-width: 1281px)",
      tablet: "(min-width: 769px) and (max-width: 1280px)",
      mobile: "(max-width: 768px)",
      reduced: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { desktop, tablet, mobile, reduced } = context.conditions;
      const usesOrbit = desktop || tablet;
      const motionScale = mobile ? 0.4 : tablet ? 0.7 : 1;
      const orbitState = { progress: 0 };
      const orbitLayers = planetItems.map((item) =>
        item.querySelector(".project-planet__orbit"),
      );
      const depthLayers = planetItems.map((item) =>
        item.querySelector(".project-planet__depth"),
      );
      const floatLayers = planetItems.map((item) =>
        item.querySelector(".project-planet__float"),
      );
      const visualLayers = planetItems.map((item) =>
        item.querySelector(".project-planet__visual"),
      );
      const hoverLayers = planetItems.map((item) =>
        item.querySelector(".project-planet__hover"),
      );
      const xSetters = orbitLayers.map((layer) =>
        layer ? gsap.quickSetter(layer, "x", "px") : null,
      );
      const ySetters = orbitLayers.map((layer) =>
        layer ? gsap.quickSetter(layer, "y", "px") : null,
      );
      const scaleSetters = depthLayers.map((layer) =>
        layer ? gsap.quickSetter(layer, "scale") : null,
      );
      const opacitySetters = depthLayers.map((layer) =>
        layer ? gsap.quickSetter(layer, "opacity") : null,
      );
      let radiusX = 0;
      let radiusY = 0;
      let orbitArcTable = [];
      let orbitArcLength = 0;
      let orbitBaseProgress = 0;
      let hoveredIndex = -1;
      let isControlPaused = false;
      const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;

      const rebuildOrbitArcTable = () => {
        const sampleCount = 720;
        orbitArcTable = [{ angle: 0, length: 0 }];
        orbitArcLength = 0;
        let previousX = radiusX;
        let previousY = 0;

        for (let index = 1; index <= sampleCount; index += 1) {
          const angle = (index / sampleCount) * Math.PI * 2;
          const x = Math.cos(angle) * radiusX;
          const y = Math.sin(angle) * radiusY;
          orbitArcLength += Math.hypot(x - previousX, y - previousY);
          orbitArcTable.push({ angle, length: orbitArcLength });
          previousX = x;
          previousY = y;
        }

        const baseIndex = Math.round((210 / 360) * sampleCount);
        orbitBaseProgress =
          orbitArcLength > 0
            ? orbitArcTable[baseIndex].length / orbitArcLength
            : 0;
      };

      const getAngleAtArcProgress = (progress) => {
        if (!orbitArcTable.length || orbitArcLength <= 0) return 0;
        const normalizedProgress = ((progress % 1) + 1) % 1;
        const targetLength = normalizedProgress * orbitArcLength;
        let low = 0;
        let high = orbitArcTable.length - 1;

        while (low < high) {
          const middle = Math.floor((low + high) / 2);
          if (orbitArcTable[middle].length < targetLength) {
            low = middle + 1;
          } else {
            high = middle;
          }
        }

        const current = orbitArcTable[low];
        const previous = orbitArcTable[Math.max(0, low - 1)];
        const segmentLength = current.length - previous.length;
        const segmentProgress =
          segmentLength > 0
            ? (targetLength - previous.length) / segmentLength
            : 0;
        return gsap.utils.interpolate(
          previous.angle,
          current.angle,
          segmentProgress,
        );
      };

      const updateOrbitMetrics = () => {
        if (!section || !usesOrbit) return;
        const width = section.clientWidth;
        const height = section.clientHeight;
        radiusX = desktop
          ? gsap.utils.clamp(560, 650, width * 0.32)
          : width * 0.38;
        radiusY = desktop
          ? gsap.utils.clamp(260, 320, height * 0.28)
          : height * 0.26;
        rebuildOrbitArcTable();
      };

      const renderOrbit = () => {
        if (!usesOrbit) return;
        const tilt = degreesToRadians(-10);
        const tiltCos = Math.cos(tilt);
        const tiltSin = Math.sin(tilt);
        const minScale = tablet ? 0.86 : 0.82;

        planetItems.forEach((item, index) => {
          const angle = getAngleAtArcProgress(
            orbitState.progress +
              orbitBaseProgress +
              index / planetItems.length,
          );
          const rawX = Math.cos(angle) * radiusX;
          const rawY = Math.sin(angle) * radiusY;
          const x = rawX * tiltCos - rawY * tiltSin;
          const y = rawX * tiltSin + rawY * tiltCos;
          const depth = (Math.sin(angle) + 1) / 2;
          const scale = gsap.utils.interpolate(minScale, 1, depth);
          const opacity =
            index === hoveredIndex ? 1 : gsap.utils.interpolate(0.72, 1, depth);
          xSetters[index]?.(x);
          ySetters[index]?.(y);
          scaleSetters[index]?.(scale);
          opacitySetters[index]?.(opacity);
          item.style.zIndex = String(
            index === hoveredIndex ? 110 : Math.round(10 + depth * 90),
          );
          if (depthLayers[index]) {
            depthLayers[index].style.zIndex = String(
              index === hoveredIndex ? 110 : Math.round(10 + depth * 90),
            );
          }
        });
      };

      updateOrbitMetrics();
      renderOrbit();

      const orbitTimeline =
        usesOrbit && !reduced
          ? gsap.to(orbitState, {
              progress: 1,
              duration: tablet ? 70 : 60,
              repeat: -1,
              ease: "none",
              onUpdate: renderOrbit,
            })
          : null;

      const floatTweens = reduced
        ? []
        : floatLayers.map((layer, index) => {
            if (!layer) return null;
            const config = floatConfigs[index];
            const x = mobile ? 0 : config.x * motionScale;
            const y = mobile ? 0 : config.y * motionScale;
            return gsap.to(layer, {
              x,
              y,
              yPercent: mobile ? -3.5 : 0,
              duration: mobile ? 3 : config.duration,
              delay: mobile ? index * 0.45 : -index * 0.85,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
              force3D: true,
              overwrite: false,
            });
          });

      const spinTweens = reduced
        ? []
        : visualLayers.map((layer, index) => {
            if (!layer) return null;
            const source = floatLayers[index];
            const from = Number(source?.dataset.spinFrom || 0) * motionScale;
            const to = Number(source?.dataset.spinTo || 0) * motionScale;
            const rotationFrom = mobile
              ? gsap.utils.clamp(-0.3, 0.3, from)
              : from;
            const rotationTo = mobile ? gsap.utils.clamp(-0.3, 0.3, to) : to;
            return gsap.fromTo(
              layer,
              { rotation: rotationFrom },
              {
                rotation: rotationTo,
                duration: Number(source?.dataset.spinDuration || 18),
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                force3D: true,
                overwrite: false,
                transformOrigin: "50% 50%",
              },
            );
          });

      const handleResize = () => {
        updateOrbitMetrics();
        renderOrbit();
      };
      if (usesOrbit) window.addEventListener("resize", handleResize);

      const hoverCleanups = planetItems.map((item, index) => {
        const hoverTarget = usesOrbit
          ? item.querySelector(".project-planet__hover") || item
          : item.querySelector(".project-planet__position") || item;
        const enter = () => {
          hoveredIndex = index;
          gsap.to(hoverLayers[index], {
            scale: reduced ? 1.01 : 1.04,
            transformOrigin: "50% 50%",
            duration: 0.5,
            ease: "power2.out",
            overwrite: "auto",
          });
          if (orbitTimeline && !isControlPaused) {
            gsap.to(orbitTimeline, {
              timeScale: 0.22,
              duration: 0.6,
              ease: "power2.out",
              overwrite: "auto",
            });
          }
        };
        const leave = () => {
          hoveredIndex = -1;
          gsap.to(hoverLayers[index], {
            scale: 1,
            transformOrigin: "50% 50%",
            duration: 0.5,
            ease: "power2.out",
            overwrite: "auto",
          });
          if (orbitTimeline && !isControlPaused) {
            gsap.to(orbitTimeline, {
              timeScale: 1,
              duration: 0.8,
              ease: "power2.inOut",
              overwrite: "auto",
            });
          }
        };
        hoverTarget.addEventListener("pointerenter", enter);
        hoverTarget.addEventListener("pointerleave", leave);
        item.addEventListener("focus", enter);
        item.addEventListener("blur", leave);
        return () => {
          hoverTarget.removeEventListener("pointerenter", enter);
          hoverTarget.removeEventListener("pointerleave", leave);
          item.removeEventListener("focus", enter);
          item.removeEventListener("blur", leave);
        };
      });

      const handleOrbitControl = () => {
        if (!orbitTimeline) return;
        isControlPaused = !isControlPaused;
        const supportingTweens = [...floatTweens, ...spinTweens].filter(
          Boolean,
        );
        if (isControlPaused) {
          orbitTimeline.pause();
          supportingTweens.forEach((tween) => tween.pause());
        } else {
          orbitTimeline.resume();
          supportingTweens.forEach((tween) => tween.resume());
        }
        orbitControl?.setAttribute("aria-pressed", String(isControlPaused));
        orbitControl?.setAttribute(
          "aria-label",
          isControlPaused
            ? "프로젝트 행성 공전 재생"
            : "프로젝트 행성 공전 일시정지",
        );
      };
      orbitControl?.addEventListener("click", handleOrbitControl);
      if (orbitControl) orbitControl.disabled = !orbitTimeline;

      return () => {
        orbitTimeline?.kill();
        [...floatTweens, ...spinTweens]
          .filter(Boolean)
          .forEach((tween) => tween.kill());
        hoverCleanups.forEach((cleanup) => cleanup());
        orbitControl?.removeEventListener("click", handleOrbitControl);
        window.removeEventListener("resize", handleResize);
        gsap.killTweensOf([orbitTimeline, ...hoverLayers].filter(Boolean));
        gsap.set(
          [
            ...orbitLayers,
            ...depthLayers,
            ...floatLayers,
            ...visualLayers,
            ...hoverLayers,
            ...planetItems,
          ].filter(Boolean),
          { clearProps: "transform,opacity,zIndex" },
        );
      };
    },
  );
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
    if (stateText) {
      stateText.textContent = `${metersPerSecond.toFixed(3)} m/s`;
    }
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
    const link = event.target.closest(".project-learn-more");
    const item = link?.closest(".list-item");
    if (!link || !item) return;

    event.preventDefault();

    const projectIndex = Number(item.dataset.projectIndex);
    const projectTrigger = ScrollTrigger.getById("proj-pin");
    const projectTimeline = projectTrigger?.animation;
    if (
      !Number.isInteger(projectIndex) ||
      !projectTrigger ||
      !projectTimeline
    ) {
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
    hint.className = "drag-it-hint throw-it-hint";
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

// About license card float & center rotation ------------------------------ //
function aboutLicenseCard__init() {
  const card = document.querySelector(
    ".sec-about > .section-container > .content-wrapper",
  );
  if (!card || card.dataset.cardInteractionReady === "true") return;
  card.dataset.cardInteractionReady = "true";

  // The desktop About UI now expands directly from the astronaut's tablet.
  // Keep the legacy touch/tablet interaction, but avoid a competing floating
  // HUD motion while the cinematic desktop timeline owns the transform.
  if (window.matchMedia("(min-width: 1281px)").matches) return;

  const startFloating = () => {
    gsap.killTweensOf(card, "x,y");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(card, { x: 0, y: 0 });
      return;
    }
    gsap.set(card, { y: 0 });
    gsap.to(card, {
      x: gsap.utils.random(-8, 8),
      duration: gsap.utils.random(2.6, 3.4),
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  };

  startFloating();
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

// Project list overlap & backdrop blur ------------------------------ //
function projectListOverlap__init() {
  const project = document.querySelector(".sec-project");
  const projectList = document.querySelector("#sec-project-list");

  if (!project || !projectList || projectList.dataset.overlapReady === "true")
    return;

  projectList.dataset.overlapReady = "true";
  gsap.set(project, { "--project-blur-opacity": 0 });

  ScrollTrigger.create({
    id: "project-list-overlap-state",
    trigger: projectList,
    start: "top bottom",
    end: "top top",
    invalidateOnRefresh: true,
    onEnter: () => {
      projectList.classList.add("is-entering");
      project.classList.remove("is-project-list-covered");
    },
    onEnterBack: () => {
      projectList.classList.add("is-entering");
      project.classList.remove("is-project-list-covered");
    },
    onLeave: () => {
      projectList.classList.remove("is-entering");
      project.classList.add("is-project-list-covered");
    },
    onLeaveBack: () => {
      projectList.classList.remove("is-entering");
      project.classList.remove("is-project-list-covered");
    },
  });

  gsap.to(project, {
    "--project-blur-opacity": 1,
    ease: "none",
    scrollTrigger: {
      id: "project-list-backdrop-blur",
      trigger: projectList,
      start: "top 95%",
      end: "top 5%",
      scrub: 1.2,
      invalidateOnRefresh: true,
    },
  });
}

// Header color in about section ------------------------------ //
function HeaderAboutColor__init() {
  const header = document.querySelector("header");
  const about = document.querySelector(".sec-about");

  if (!header || !about) return;

  const mm = gsap.matchMedia();

  mm.add("(min-width: 769px)", () => {
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

  mm.add("(max-width: 768px)", () => {
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

// One input advances one full viewport ------------------------------ //
function fullPageStepScroll__init() {
  if (document.documentElement.dataset.fullPageStepReady === "true") return;
  document.documentElement.dataset.fullPageStepReady = "true";

  let isStepping = false;
  let unlockTimer;
  let touchStartY = 0;
  let touchStartScroll = 0;
  let hasStoppedAtProjectReady = false;

  window.addEventListener("menu-scroll-state-sync", (event) => {
    hasStoppedAtProjectReady = event.detail?.menu === "project";
    isStepping = false;
    clearTimeout(unlockTimer);
  });

  const isInteractiveTarget = (target) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        ".site-scrollbar, input, textarea, select, [contenteditable='true']",
      ),
    );
  const isTabletLoading = () =>
    Boolean(
      document.querySelector(
        "#sec-project-list.is-tablet-settled .project-tablet__loading[aria-hidden='false']",
      ),
    );
  const isFreeProjectListScroll = (direction = 0) => {
    const projectListSection = document.querySelector("#sec-project-list");
    if (projectListSection?.dataset.returnedFromFooter === "true") {
      return false;
    }
    const content = document.querySelector(
      "#sec-project-list .project-tablet__content[aria-hidden='false']",
    );
    const projectTrigger = ScrollTrigger.getById("proj-pin");
    const projectTimeline = projectTrigger?.animation;
    if (!content || !projectTrigger || !projectTimeline) return false;
    // Once the rendered timeline has entered the closing/footer sequence,
    // never hand the wheel back to the free project-panel scroller.
    if (projectTimeline.time() > 5.98) return false;

    const progress = Math.max(
      0,
      Math.min(
        (window.scrollY - projectTrigger.start) /
          Math.max(projectTrigger.end - projectTrigger.start, 1),
        1,
      ),
    );
    const projectTime = progress * (projectTimeline.duration() || 1);
    if (projectTime > 0.02) {
      document.querySelector(
        "#sec-project-list",
      ).dataset.firstProjectStepPending = "false";
    }
    if (direction < 0 && projectTime <= 0.12) return false;

    return (
      window.scrollY >= projectTrigger.start - 2 &&
      window.scrollY <= projectTrigger.end + 2 &&
      projectTime < 5.98
    );
  };

  const isFreeProjectBackScroll = (direction = 0) => {
    if (!window.matchMedia("(min-width: 769px)").matches) return false;

    const forestTrigger = ScrollTrigger.getById("forest-master");
    const phraseStepTimes = scrollTween?.projectPhraseStepTimes ?? [];
    if (!forestTrigger || !scrollTween || phraseStepTimes.length < 2) {
      return false;
    }

    const masterDuration = scrollTween.duration() || 1;
    const scrollProgress = Math.max(
      0,
      Math.min(
        (window.scrollY - forestTrigger.start) /
          Math.max(forestTrigger.end - forestTrigger.start, 1),
        1,
      ),
    );
    const projectedMasterTime = scrollProgress * masterDuration;
    const firstPhraseTime =
      scrollTween.projectBackEntryTime ?? phraseStepTimes[0];
    const lastPhraseTime = phraseStepTimes.at(-1);

    if (direction > 0) {
      return (
        projectedMasterTime >= firstPhraseTime - 0.05 &&
        projectedMasterTime < lastPhraseTime - 0.12
      );
    }

    if (direction < 0) {
      return (
        projectedMasterTime > firstPhraseTime + 0.12 &&
        projectedMasterTime <= lastPhraseTime + 0.05
      );
    }

    return false;
  };

  const moveOneViewport = (direction, startY = window.scrollY) => {
    if (isStepping || !direction) return;

    const nativeMaxScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      0,
    );
    const contactTrigger = ScrollTrigger.getById("proj-pin");
    const contactTimeline = contactTrigger?.animation;
    const contactTime = contactTimeline?.labels?.footerContactComplete;
    const contactScroll =
      contactTrigger && contactTimeline && contactTime !== undefined
        ? contactTrigger.start +
          (contactTrigger.end - contactTrigger.start) *
            (contactTime / Math.max(contactTimeline.duration(), 1))
        : nativeMaxScroll;
    const maxScroll = Math.min(nativeMaxScroll, contactScroll);
    let requestedY = startY + direction * window.innerHeight;
    let stepDuration = 0.9;
    let stepUnlockDelay;
    let stepEasing = (t) => 1 - Math.pow(1 - t, 3);
    let syncMasterTime;
    let syncTriggerAnimation;
    let syncTriggerTime;
    const isReversingFromProjectReady =
      direction < 0 && hasStoppedAtProjectReady;
    const tabletEntranceStepTrigger = ScrollTrigger.getById(
      "project-tablet-entrance",
    );
    if (direction < 0) {
      hasStoppedAtProjectReady = false;
    }
    const forestTrigger = ScrollTrigger.getById("forest-master");
    if (direction > 0 && forestTrigger && scrollTween) {
      const masterDuration = scrollTween.duration() || 1;
      const scrollProgress = Math.max(
        0,
        Math.min(
          (startY - forestTrigger.start) /
            Math.max(forestTrigger.end - forestTrigger.start, 1),
          1,
        ),
      );
      const projectedMasterTime = scrollProgress * masterDuration;
      const aboutStart = scrollTween.labels.aboutArrived ?? 1;
      const projectBackStart =
        scrollTween.labels.projectBackgroundSettled ?? 7.05;
      const phraseStepTimes = scrollTween.projectPhraseStepTimes ?? [];
      const projectReadyTime = scrollTween.labels["project-ready"];
      if (projectedMasterTime < aboutStart - 0.2) {
        requestedY =
          forestTrigger.start +
          (forestTrigger.end - forestTrigger.start) *
            (aboutStart / masterDuration);
        stepDuration = 2.75;
        syncMasterTime = aboutStart;
      } else if (
        projectedMasterTime >= aboutStart - 0.2 &&
        projectedMasterTime < projectBackStart
      ) {
        const projectBackEntryTime =
          scrollTween.projectBackEntryTime ?? projectBackStart + 0.8;
        requestedY =
          forestTrigger.start +
          (forestTrigger.end - forestTrigger.start) *
            (projectBackEntryTime / masterDuration);
        stepDuration = 3.5;
        stepUnlockDelay = 3.5;
        syncMasterTime = projectBackEntryTime;
      } else if (
        projectedMasterTime >= projectBackStart - 0.2 &&
        phraseStepTimes.length > 1
      ) {
        const nextPhraseTime = phraseStepTimes.find(
          (time) => time > projectedMasterTime + 0.18,
        );
        if (nextPhraseTime !== undefined) {
          requestedY =
            forestTrigger.start +
            (forestTrigger.end - forestTrigger.start) *
              (nextPhraseTime / masterDuration);
          stepDuration = 1.75;
          stepEasing = (t) => t;
          syncMasterTime = nextPhraseTime;
        } else if (
          projectReadyTime !== undefined &&
          !hasStoppedAtProjectReady &&
          projectedMasterTime < projectReadyTime + 0.2
        ) {
          requestedY =
            forestTrigger.start +
            (forestTrigger.end - forestTrigger.start) *
              (projectReadyTime / masterDuration);
          if (tabletEntranceStepTrigger) {
            requestedY = Math.min(
              requestedY,
              tabletEntranceStepTrigger.start - 2,
            );
          }
          stepDuration = scrollTween.projectRevealStepDuration ?? 5 / 2;
          stepEasing = (t) => t;
          syncMasterTime = projectReadyTime;
          hasStoppedAtProjectReady = true;
        }
      }
    } else if (
      direction > 0 &&
      window.matchMedia("(max-width: 768px)").matches
    ) {
      const about = document.querySelector(".sec-about");
      const projectBack = document.querySelector(
        ".project-back-viewport--mobile",
      );
      if (about && projectBack) {
        const aboutTop = about.getBoundingClientRect().top + window.scrollY;
        const aboutBottom = aboutTop + about.offsetHeight;
        if (startY >= aboutTop - 1 && startY < aboutBottom) {
          requestedY = projectBack.getBoundingClientRect().top + window.scrollY;
          stepDuration = 1.2;
        }
      }
    }

    // A forest-master step must finish at its own cinematic stop. When that
    // stop touches the project-list boundary, defer the tablet entrance to
    // the next wheel input instead of letting it override this destination.
    if (direction > 0 && syncMasterTime === undefined) {
      const tabletEntranceTrigger = ScrollTrigger.getById(
        "project-tablet-entrance",
      );
      const projectPinTrigger = ScrollTrigger.getById("proj-pin");
      const projectTabletContent = document.querySelector(
        "#sec-project-list .project-tablet__content",
      );
      const projectListSection = document.querySelector("#sec-project-list");
      const isFirstProjectReady =
        projectListSection?.dataset.firstProjectStepPending === "true" &&
        projectTabletContent?.getAttribute("aria-hidden") === "false" &&
        projectPinTrigger?.animation;
      const isBeforeTabletSettles =
        tabletEntranceTrigger &&
        startY < tabletEntranceTrigger.end + 1 &&
        requestedY >= tabletEntranceTrigger.start - 1;

      if (isBeforeTabletSettles) {
        requestedY = tabletEntranceTrigger.end + 2;
        stepDuration = 2.8 / 2.25;
        syncTriggerAnimation = tabletEntranceTrigger.animation;
        syncTriggerTime = tabletEntranceTrigger.animation?.duration() ?? 1;
      } else if (
        projectPinTrigger?.animation &&
        (isFirstProjectReady || requestedY >= projectPinTrigger.start - 1) &&
        startY < projectPinTrigger.end - 2
      ) {
        const projectTimeline = projectPinTrigger.animation;
        const projectDuration = projectTimeline.duration() || 1;
        const projectProgress = Math.max(
          0,
          Math.min(
            (startY - projectPinTrigger.start) /
              Math.max(projectPinTrigger.end - projectPinTrigger.start, 1),
            1,
          ),
        );
        const projectedProjectTime = projectProgress * projectDuration;
        const returnedFromFooter =
          projectListSection?.dataset.returnedFromFooter === "true";
        const projectPanelStops = [2, 3, 4, 5, 6].filter(
          (time) => time <= projectDuration,
        );
        const nextProjectStop = returnedFromFooter
          ? undefined
          : projectPanelStops.find(
              (time) => time > projectedProjectTime + 0.12,
            );

        if (nextProjectStop !== undefined) {
          if (isFirstProjectReady) {
            projectListSection.dataset.firstProjectStepPending = "false";
          }
          requestedY =
            projectPinTrigger.start +
            (projectPinTrigger.end - projectPinTrigger.start) *
              (nextProjectStop / projectDuration);
          stepDuration = 1.65;
          syncTriggerAnimation = projectTimeline;
          syncTriggerTime = nextProjectStop;
        } else {
          const footerStepStops = [
            {
              time: projectTimeline.labels.footerThankYouFirstComplete,
              duration: projectTimeline.tabletExitStepDuration ?? 6 / 1.5,
              unlockDelay: projectTimeline.tabletExitUnlockDelay ?? 3.5 / 1.5,
              linear: true,
            },
            {
              time: projectTimeline.labels.footerSecondMessageComplete,
              duration: 1.6,
            },
            {
              time: projectTimeline.labels.footerContactComplete,
              duration: 6,
            },
          ].filter((step) => step.time !== undefined);
          const footerExitStepCommitted =
            projectListSection?.dataset.footerExitStepCommitted === "true";
          const nextFooterStep = footerStepStops.find(
            (step, index) =>
              !(footerExitStepCommitted && index === 0) &&
              step.time > projectedProjectTime + 0.12,
          );
          if (nextFooterStep) {
            if (projectListSection) {
              projectListSection.dataset.returnedFromFooter = "false";
              projectListSection.dataset.footerExitStepCommitted =
                nextFooterStep === footerStepStops[0] ? "true" : "false";
            }
            requestedY =
              projectPinTrigger.start +
              (projectPinTrigger.end - projectPinTrigger.start) *
                (nextFooterStep.time / projectDuration);
            stepDuration = nextFooterStep.duration;
            stepUnlockDelay = nextFooterStep.unlockDelay ?? stepDuration * 0.5;
            if (nextFooterStep.linear) stepEasing = (t) => t;
            syncTriggerAnimation = projectTimeline;
            syncTriggerTime = nextFooterStep.time;
          }
        }
      }
    }

    if (direction < 0) {
      let reverseStepHandled = false;
      const projectPinTrigger = ScrollTrigger.getById("proj-pin");
      if (
        projectPinTrigger?.animation &&
        startY > projectPinTrigger.start + 1 &&
        startY <= projectPinTrigger.end + 2
      ) {
        const projectTimeline = projectPinTrigger.animation;
        const projectDuration = projectTimeline.duration() || 1;
        const projectProgress = Math.max(
          0,
          Math.min(
            (startY - projectPinTrigger.start) /
              Math.max(projectPinTrigger.end - projectPinTrigger.start, 1),
            1,
          ),
        );
        const projectedProjectTime = projectProgress * projectDuration;
        const reverseProjectStops = [
          { time: 0, duration: 1.65 },
          { time: 2, duration: 1.65 },
          { time: 3, duration: 1.65 },
          { time: 4, duration: 1.65 },
          { time: 5, duration: 1.65 },
          {
            time: 6,
            duration: projectTimeline.tabletExitReverseStepDuration ?? 4 / 1.5,
            linear: true,
            footer: true,
          },
          {
            time:
              projectTimeline.labels.footerSecondMessageComplete !== undefined
                ? projectTimeline.labels.footerSecondMessageComplete - 0.45
                : projectTimeline.labels.footerThankYouFirstComplete,
            duration: 1.6,
            footer: true,
          },
          {
            time: projectTimeline.labels.footerSecondMessageComplete,
            duration: 4.8,
            footer: true,
            linear: true,
          },
        ]
          .filter((step) => step.time !== undefined)
          .sort((a, b) => a.time - b.time);
        const previousProjectStep = reverseProjectStops
          .filter((step) => step.time < projectedProjectTime - 0.12)
          .at(-1);

        if (previousProjectStep) {
          requestedY =
            projectPinTrigger.start +
            (projectPinTrigger.end - projectPinTrigger.start) *
              (previousProjectStep.time / projectDuration);
          stepDuration = previousProjectStep.duration;
          if (previousProjectStep.linear) stepEasing = (t) => t;
          syncTriggerAnimation = projectTimeline;
          syncTriggerTime = previousProjectStep.time;
          const projectListSection =
            document.querySelector("#sec-project-list");
          if (projectListSection) {
            projectListSection.dataset.returnedFromFooter =
              previousProjectStep.time === 6 ? "true" : "false";
            if (previousProjectStep.time <= 6) {
              projectListSection.dataset.footerExitStepCommitted = "false";
            }
          }
          reverseStepHandled = true;
        }
      }

      const tabletEntranceTrigger = ScrollTrigger.getById(
        "project-tablet-entrance",
      );
      const isAtFirstProjectStart = Boolean(
        projectPinTrigger?.animation &&
        document.querySelector(
          "#sec-project-list .project-tablet__content[aria-hidden='false']",
        ) &&
        startY <=
          projectPinTrigger.start +
            (projectPinTrigger.end - projectPinTrigger.start) *
              (0.12 / Math.max(projectPinTrigger.animation.duration(), 1)),
      );
      if (
        !reverseStepHandled &&
        tabletEntranceTrigger?.animation &&
        (isAtFirstProjectStart || startY >= tabletEntranceTrigger.end - 3)
      ) {
        requestedY = tabletEntranceTrigger.start - 2;
        stepDuration = 2.8 / 2.25;
        syncTriggerAnimation = tabletEntranceTrigger.animation;
        syncTriggerTime = 0;
        reverseStepHandled = true;
      }

      const forestTrigger = ScrollTrigger.getById("forest-master");
      if (!reverseStepHandled && forestTrigger && scrollTween) {
        const masterDuration = scrollTween.duration() || 1;
        const scrollProgress = Math.max(
          0,
          Math.min(
            (startY - forestTrigger.start) /
              Math.max(forestTrigger.end - forestTrigger.start, 1),
            1,
          ),
        );
        const projectedMasterTime = scrollProgress * masterDuration;
        const aboutStart = scrollTween.labels.aboutArrived ?? 1;
        const projectBackStart =
          scrollTween.labels.projectBackgroundSettled ?? 7.05;
        const phraseStepTimes = scrollTween.projectPhraseStepTimes ?? [];
        const projectReadyTime = scrollTween.labels["project-ready"];
        const projectBackEntryTime =
          scrollTween.projectBackEntryTime ?? phraseStepTimes[0];
        const lastPhraseVisibleTime =
          scrollTween.projectLastPhraseVisibleTime ?? phraseStepTimes.at(-1);
        const firstPhraseTime = phraseStepTimes[0];
        const secondPhraseTime = phraseStepTimes[1];
        let previousMasterStep;
        let reverseDuration = 1.75;
        let returnDirectlyToAbout = false;

        if (
          isReversingFromProjectReady &&
          projectReadyTime !== undefined &&
          phraseStepTimes.length > 0
        ) {
          previousMasterStep = lastPhraseVisibleTime;
          reverseDuration = scrollTween.projectRevealStepDuration ?? 5 / 2;
          stepEasing = (t) => t;
        } else if (
          firstPhraseTime !== undefined &&
          projectedMasterTime >= projectBackEntryTime - 0.2 &&
          projectedMasterTime <= projectBackEntryTime + 0.3
        ) {
          returnDirectlyToAbout = true;
          reverseDuration = 3.5;
        } else if (
          firstPhraseTime !== undefined &&
          secondPhraseTime !== undefined &&
          projectedMasterTime > projectBackEntryTime + 0.3 &&
          projectedMasterTime <= secondPhraseTime + 0.3
        ) {
          previousMasterStep = firstPhraseTime;
        } else if (
          projectReadyTime !== undefined &&
          projectedMasterTime > phraseStepTimes.at(-1) + 0.18
        ) {
          previousMasterStep = lastPhraseVisibleTime;
          reverseDuration = scrollTween.projectRevealStepDuration ?? 5 / 2;
          stepEasing = (t) => t;
        } else {
          previousMasterStep = phraseStepTimes
            .filter((time) => time < projectedMasterTime - 0.18)
            .at(-1);
        }

        if (previousMasterStep !== undefined && reverseDuration === 1.75) {
          stepEasing = (t) => t;
        }

        if (returnDirectlyToAbout) {
          requestedY =
            forestTrigger.start +
            (forestTrigger.end - forestTrigger.start) *
              (aboutStart / masterDuration);
          stepDuration = reverseDuration;
          stepUnlockDelay = reverseDuration;
          syncMasterTime = aboutStart;
        } else if (
          previousMasterStep !== undefined &&
          previousMasterStep > phraseStepTimes[0] - 0.1
        ) {
          requestedY =
            forestTrigger.start +
            (forestTrigger.end - forestTrigger.start) *
              (previousMasterStep / masterDuration);
          stepDuration = reverseDuration;
          syncMasterTime = previousMasterStep;
        } else if (
          projectedMasterTime > 0.1 &&
          projectedMasterTime <= aboutStart + 0.3
        ) {
          requestedY = forestTrigger.start;
          stepDuration = 2.75;
          syncMasterTime = 0;
        }
      }
    }
    if (syncTriggerAnimation && syncTriggerTime !== undefined) {
      const currentTriggerTime = syncTriggerAnimation.time();
      syncTriggerTime =
        direction > 0
          ? Math.max(syncTriggerTime, currentTriggerTime)
          : Math.min(syncTriggerTime, currentTriggerTime);
    }
    if (syncMasterTime !== undefined && scrollTween) {
      const currentMasterTime = scrollTween.time();
      syncMasterTime =
        direction > 0
          ? Math.max(syncMasterTime, currentMasterTime)
          : Math.min(syncMasterTime, currentMasterTime);
    }

    let targetY = Math.max(0, Math.min(requestedY, maxScroll));
    // A directional input must never resolve to a coordinate behind the
    // current position. This also protects pinned timelines from stale
    // progress values after visiting and reversing out of the footer.
    targetY =
      direction > 0 ? Math.max(targetY, startY) : Math.min(targetY, startY);
    if (Math.abs(targetY - window.scrollY) < 1) return;

    isStepping = true;
    clearTimeout(unlockTimer);
    lenis?.scrollTo(targetY, {
      duration: stepDuration,
      easing: stepEasing,
      lock: true,
      force: true,
      onComplete: () => {
        if (syncMasterTime !== undefined && scrollTween) {
          scrollTween.time(syncMasterTime, false);
          if (direction > 0) {
            const isProjectBackEntry =
              scrollTween.projectBackEntryTime !== undefined &&
              Math.abs(syncMasterTime - scrollTween.projectBackEntryTime) <
                0.05;
            const phraseStepIndex =
              scrollTween.projectPhraseStepTimes?.findIndex(
                (time) => Math.abs(syncMasterTime - time) < 0.05,
              );
            const projectPhrases = gsap.utils.toArray(
              ".project-reveal-copy > div > span",
            );
            if (!isProjectBackEntry && phraseStepIndex >= 0) {
              gsap.set(
                projectPhrases.filter((_, index) => index !== phraseStepIndex),
                {
                  autoAlpha: 0,
                  y: 24,
                  filter: "blur(8px)",
                },
              );
              gsap.set(projectPhrases[phraseStepIndex], {
                autoAlpha: 1,
                y: 0,
                filter: "blur(0px)",
              });
              gsap.set(
                projectPhrases[phraseStepIndex].querySelectorAll(
                  ".cinematic-text__line",
                ),
                { autoAlpha: 1, y: 0 },
              );
            } else if (
              !isProjectBackEntry &&
              syncMasterTime < scrollTween.projectPhraseStepTimes?.[0]
            ) {
              gsap.set(".project-reveal-copy > div > span", {
                autoAlpha: 0,
                y: 24,
                filter: "blur(8px)",
              });
            }
          }
          ScrollTrigger.update();
        }
        if (syncTriggerAnimation && syncTriggerTime !== undefined) {
          syncTriggerAnimation.time(syncTriggerTime, false);
          ScrollTrigger.update();
        }
        clearTimeout(unlockTimer);
        isStepping = false;
      },
    });
    unlockTimer = setTimeout(
      () => {
        isStepping = false;
      },
      (stepUnlockDelay ?? stepDuration) * 1000 + 80,
    );
  };

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || isInteractiveTarget(event.target)) return;
      const wheelDirection = event.deltaY > 0 ? 1 : -1;
      if (isFreeProjectListScroll(wheelDirection)) return;
      if (isFreeProjectBackScroll(wheelDirection)) return;
      event.preventDefault();
      if (isTabletLoading()) return;
      if (!isStepping && Math.abs(event.deltaY) >= 1) {
        moveOneViewport(event.deltaY > 0 ? 1 : -1);
      }
    },
    { passive: false, capture: true },
  );

  window.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1 || isInteractiveTarget(event.target))
        return;
      touchStartY = event.touches[0].clientY;
      touchStartScroll = window.scrollY;
    },
    { passive: true },
  );

  window.addEventListener(
    "touchend",
    (event) => {
      if (
        isInteractiveTarget(event.target) ||
        event.changedTouches.length !== 1
      )
        return;
      const swipeDistance = touchStartY - event.changedTouches[0].clientY;
      const swipeDirection = swipeDistance > 0 ? 1 : -1;
      if (isFreeProjectListScroll(swipeDirection)) return;
      if (isFreeProjectBackScroll(swipeDirection)) return;
      if (isTabletLoading()) return;
      if (Math.abs(swipeDistance) >= 40) {
        moveOneViewport(swipeDirection, touchStartScroll);
      }
    },
    { passive: true },
  );
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
  const header = document.querySelector("header");
  const getDocumentTop = (element) =>
    element ? window.scrollY + element.getBoundingClientRect().top : 0;

  document.querySelectorAll("[data-scroll-menu]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const menu = btn.dataset.scrollMenu;
      const isDesktop = window.matchMedia("(min-width: 769px)").matches;
      const projectPinTrigger = ScrollTrigger.getById("proj-pin");
      const tabletEntranceTrigger = ScrollTrigger.getById(
        "project-tablet-entrance",
      );
      let targetY = 0;
      let targetMasterTime;
      let targetProjectTime;

      if (menu === "home" && isDesktop && scrollTween) {
        targetMasterTime = 0;
      }

      if (menu === "about") {
        if (isDesktop && scrollTween?.scrollTrigger) {
          const horizontalTrigger = scrollTween.scrollTrigger;
          const aboutTime = scrollTween.labels["slide-1"] ?? 0;
          targetMasterTime = aboutTime;
          const progress = aboutTime / scrollTween.duration();
          targetY =
            horizontalTrigger.start +
            (horizontalTrigger.end - horizontalTrigger.start) * progress;
        } else {
          targetY = getDocumentTop(document.querySelector(".sec-about"));
        }
      }

      if (menu === "project") {
        if (isDesktop && scrollTween?.scrollTrigger) {
          const masterTrigger = scrollTween.scrollTrigger;
          const projectTime =
            scrollTween.labels["project-ready"] ??
            scrollTween.labels["circle-reveal"] ??
            scrollTween.duration();
          targetMasterTime = projectTime;
          const progress = projectTime / scrollTween.duration();
          targetY =
            masterTrigger.start +
            (masterTrigger.end - masterTrigger.start) * progress;
          if (tabletEntranceTrigger) {
            targetY = Math.min(targetY, tabletEntranceTrigger.start - 2);
          }
        } else {
          const mobileProjectTrigger = ScrollTrigger.getById(
            "project-vertical-pin",
          );
          const mobileProjectTimeline = mobileProjectTrigger?.animation;
          const mobileProjectReadyTime =
            mobileProjectTimeline?.labels?.mobileProjectReady;
          targetY =
            mobileProjectTrigger &&
            mobileProjectTimeline &&
            mobileProjectReadyTime !== undefined
              ? mobileProjectTrigger.start +
                (mobileProjectTrigger.end - mobileProjectTrigger.start) *
                  (mobileProjectReadyTime /
                    Math.max(mobileProjectTimeline.duration(), 1))
              : getDocumentTop(document.querySelector(".sec-project"));
          if (tabletEntranceTrigger) {
            targetY = Math.min(
              targetY,
              tabletEntranceTrigger.start -
                Math.max(24, window.innerHeight * 0.05),
            );
          }
        }
      }

      if (menu === "contact") {
        const projectTimeline = projectPinTrigger?.animation;
        const contactTime = projectTimeline?.labels?.footerContactComplete;
        targetProjectTime = contactTime;
        targetY =
          projectPinTrigger && projectTimeline && contactTime !== undefined
            ? projectPinTrigger.start +
              (projectPinTrigger.end - projectPinTrigger.start) *
                (contactTime / Math.max(projectTimeline.duration(), 1))
            : document.documentElement.scrollHeight - window.innerHeight;
      }

      isContactScroll = menu === "contact";

      const navigateToMenu = () => {
        gsap.killTweensOf(window);

        if (menu !== "contact") {
          window.dispatchEvent(new Event("project-menu-reset-tablet"));
          projectPinTrigger?.animation?.time(0, false);
          document
            .querySelector("#sec-project-list")
            ?.setAttribute("data-returned-from-footer", "false");
        }

        if (menu === "project" && !isDesktop) {
          window.dispatchEvent(new Event("project-menu-navigate"));
        }

        const completeNavigation = () => {
          isContactScroll = false;
          if (isDesktop && targetMasterTime !== undefined && scrollTween) {
            scrollTween.time(targetMasterTime, false);
          }
          if (
            menu === "contact" &&
            projectPinTrigger?.animation &&
            targetProjectTime !== undefined
          ) {
            projectPinTrigger.animation.time(targetProjectTime, false);
          }

          const projectPhraseTargets = gsap.utils.toArray(
            ".project-reveal-copy > div > span, .project-reveal-copy .cinematic-text__line",
          );
          const mobileProjectTimeline = ScrollTrigger.getById(
            "project-vertical-pin",
          )?.animation;
          gsap.getTweensOf(projectPhraseTargets).forEach((tween) => {
            let parent = tween.parent;
            let belongsToProjectTimeline = false;
            while (parent) {
              if (parent === scrollTween || parent === mobileProjectTimeline) {
                belongsToProjectTimeline = true;
                break;
              }
              parent = parent.parent;
            }
            if (!belongsToProjectTimeline) tween.kill();
          });
          if (
            menu === "home" ||
            menu === "about" ||
            (menu === "project" && isDesktop)
          ) {
            gsap.set(".project-reveal-copy > div > span", {
              autoAlpha: 0,
              y: 24,
              filter: "blur(8px)",
            });
          }

          if (menu === "home" || menu === "about") {
            window.dispatchEvent(new Event("project-back-phrases-reset"));
            header?.classList.remove("is-project-section", "is-project-list");
            ScrollTrigger.update();
            window.dispatchEvent(new Event("header-scroll-sync"));
          }
          if (menu === "project") {
            header?.classList.add("is-project-section");
            header?.classList.remove("is-project-list");
            if (!isDesktop) {
              window.dispatchEvent(new Event("project-menu-reveal"));
            }
          }
          window.dispatchEvent(
            new CustomEvent("menu-scroll-state-sync", {
              detail: { menu },
            }),
          );
          ScrollTrigger.update();
          window.dispatchEvent(new Event("header-scroll-sync"));
        };

        const navigationDuration = menu === "contact" ? 1.2 : 1;
        if (lenis) {
          lenis.scrollTo(targetY, {
            duration: navigationDuration,
            easing: (t) => 1 - Math.pow(1 - t, 3),
            lock: true,
            force: true,
            onComplete: completeNavigation,
          });
        } else {
          gsap.to(window, {
            scrollTo: { y: targetY, autoKill: false },
            duration: navigationDuration,
            ease: "power2.out",
            overwrite: "auto",
            onComplete: completeNavigation,
          });
        }
      };

      if (menu === "home" || menu === "about") {
        const detail = {
          handled: false,
          continueNavigation: navigateToMenu,
        };
        window.dispatchEvent(
          new CustomEvent("project-menu-return", { detail }),
        );
        if (detail.handled) return;
      }

      navigateToMenu();
    });
  });
}
// setupPinAccordion ------------------------------ //
let resizeTimer;
let resizeRefreshFrame;
let lastAccordionMobile = window.matchMedia("(max-width: 768px)").matches;
const initialViewportWidth = window.innerWidth;
let responsiveReloadTimer;

function projectTabletTransition__init() {
  const section = document.querySelector("#sec-project-list");
  const project = document.querySelector(".sec-project");
  const stage = section?.querySelector(".project-tablet-stage");
  const tablet = section?.querySelector(".project-tablet");
  const loading = section?.querySelector(".project-tablet__loading");
  const loadingLetters = gsap.utils.toArray(
    ".project-tablet__loading > .project-tablet__loading-logo > span",
  );
  const loadingProgress = section?.querySelector(
    ".project-tablet__loading-progress",
  );
  const content = section?.querySelector(".project-tablet__content");

  if (
    !section ||
    !stage ||
    !tablet ||
    !loading ||
    !loadingProgress ||
    !content ||
    section.dataset.tabletReady === "true"
  ) {
    return;
  }

  section.dataset.tabletReady = "true";
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  let hasPlayedTabletLoading = false;
  let isTabletSequenceRunning = false;
  let loadingTimeline;
  let pendingProjectIndex = 0;

  const navigateToPendingProject = () => {
    const projectTrigger = ScrollTrigger.getById("proj-pin");
    const projectTimeline = projectTrigger?.animation;
    if (!projectTrigger || !projectTimeline || pendingProjectIndex === 0)
      return;

    section.dataset.firstProjectStepPending = "false";
    const panelTime = pendingProjectIndex + 0.9;
    const progress = Math.min(panelTime / projectTimeline.duration(), 1);
    const targetY =
      projectTrigger.start +
      (projectTrigger.end - projectTrigger.start) * progress;

    gsap.to(window, {
      scrollTo: { y: targetY, autoKill: false },
      duration: 1,
      ease: "power2.inOut",
      overwrite: "auto",
    });
  };

  const handlePlanetSelection = (event) => {
    const selectedIndex = Number(event.detail?.projectIndex);
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0) return;
    pendingProjectIndex = selectedIndex;
    if (hasPlayedTabletLoading && !isTabletSequenceRunning) {
      navigateToPendingProject();
    }
  };

  window.addEventListener("project-planet-select", handlePlanetSelection);

  const resetTabletLoading = () => {
    loadingTimeline?.kill();
    hasPlayedTabletLoading = false;
    isTabletSequenceRunning = false;
    pendingProjectIndex = 0;
    section.dataset.firstProjectStepPending = "false";
    project?.classList.remove("is-tablet-loading");
    section.classList.remove("is-tablet-settled");
    loading.setAttribute("aria-hidden", "false");
    content.setAttribute("aria-hidden", "true");
    gsap.set(loadingLetters, { opacity: 0, y: reducedMotion ? 0 : 8 });
    gsap.set(loadingProgress, { scaleX: 0 });
    gsap.set(loading, {
      autoAlpha: 1,
      pointerEvents: "auto",
    });
    gsap.set(content, {
      autoAlpha: 0,
      scale: 1.012,
      pointerEvents: "none",
    });
    lenis?.start();
  };

  const playTabletLoading = () => {
    if (hasPlayedTabletLoading || isTabletSequenceRunning) return;

    if (isContactScroll) {
      hasPlayedTabletLoading = true;
      isTabletSequenceRunning = false;
      section.dataset.firstProjectStepPending = "false";
      project?.classList.remove("is-tablet-loading");
      section.classList.add("is-tablet-settled");
      loading.setAttribute("aria-hidden", "true");
      content.setAttribute("aria-hidden", "false");
      gsap.set(loading, { autoAlpha: 0, pointerEvents: "none" });
      gsap.set(content, {
        autoAlpha: 1,
        scale: 1,
        pointerEvents: "auto",
      });
      return;
    }

    isTabletSequenceRunning = true;
    project?.classList.add("is-tablet-loading");
    section.classList.add("is-tablet-settled");
    lenis?.stop();

    loadingTimeline = gsap
      .timeline({
        onComplete: () => {
          hasPlayedTabletLoading = true;
          isTabletSequenceRunning = false;
          section.dataset.firstProjectStepPending = "true";
          loading.setAttribute("aria-hidden", "true");
          content.setAttribute("aria-hidden", "false");
          lenis?.start();
          requestAnimationFrame(() => {
            const projectTrigger = ScrollTrigger.getById("proj-pin");
            if (projectTrigger && pendingProjectIndex === 0) {
              if (lenis) {
                lenis.scrollTo(projectTrigger.start, {
                  immediate: true,
                  force: true,
                });
              } else {
                window.scrollTo(0, projectTrigger.start);
              }
              ScrollTrigger.update();
              window.dispatchEvent(new Event("header-scroll-sync"));
            }
            navigateToPendingProject();
          });
        },
      })
      .to(loadingLetters, {
        opacity: 1,
        y: 0,
        duration: reducedMotion ? 0.18 : 0.3,
        stagger: reducedMotion ? 0.03 : 0.08,
        ease: "power2.out",
      })
      .to(
        loadingProgress,
        {
          scaleX: 1,
          duration: reducedMotion ? 0.3 : 0.75,
          ease: reducedMotion ? "power1.out" : "power1.inOut",
        },
        reducedMotion ? "-=0.05" : "-=0.08",
      )
      .to(loading, {
        autoAlpha: 0,
        duration: reducedMotion ? 0.15 : 0.35,
        ease: "power2.out",
      })
      .set(loading, { pointerEvents: "none" })
      .to(
        content,
        {
          autoAlpha: 1,
          scale: 1,
          pointerEvents: "auto",
          duration: reducedMotion ? 0.2 : 0.5,
          ease: "power2.out",
        },
        "-=0.1",
      );

    loadingTimeline.duration(1);
  };

  const restoreProjectIntro = () => {
    project?.classList.remove("is-tablet-loading");
  };

  window.addEventListener("project-menu-reset-tablet", () => {
    resetTabletLoading();
    const entranceTrigger = ScrollTrigger.getById("project-tablet-entrance");
    entranceTrigger?.animation?.progress(0).pause();
  });

  resetTabletLoading();
  gsap.set(tablet, {
    yPercent: reducedMotion ? 8 : 120,
    scale: reducedMotion ? 1 : 0.94,
    rotationX: reducedMotion ? 0 : 2,
    transformOrigin: "50% 100%",
  });
  tablet.classList.add("is-ready");

  gsap
    .timeline({
      scrollTrigger: {
        id: "project-tablet-entrance",
        trigger: section,
        start: "top bottom",
        end: "top top",
        scrub: isMobile ? true : reducedMotion ? 0.2 : 0.8,
        invalidateOnRefresh: true,
        onLeave: () => {
          playTabletLoading();
        },
        onEnterBack: () => {
          restoreProjectIntro();
        },
        onLeaveBack: () => {
          resetTabletLoading();
        },
      },
    })
    .to(
      stage,
      {
        "--tablet-stage-dim": 1,
        duration: 1.1,
        ease: "none",
      },
      0,
    )
    .to(
      tablet,
      {
        yPercent: 0,
        scale: 1,
        rotationX: 0,
        duration: 1.1,
        ease: reducedMotion ? "none" : "power3.out",
      },
      0,
    );
}

function setupPinAccordion() {
  const section = document.querySelector("#sec-project-list");
  const items = gsap.utils.toArray(".sec-project-item");
  const tablet = section?.querySelector(".project-tablet");
  const footer = document.querySelector("#footer.footer-blackhole");
  const curtain = section?.querySelector(".project-footer-curtain");
  const tabletPowerOff = section?.querySelector(".project-tablet__power-off");
  const tabletPowerShutters = gsap.utils.toArray(
    "#sec-project-list .project-tablet__power-shutter",
  );
  const tabletPowerLogo = section?.querySelector(".project-tablet__power-logo");
  const tabletPowerLogoLetters = gsap.utils.toArray(
    ".project-tablet__power-logo > span",
    section,
  );
  const tabletScreenLayers = gsap.utils.toArray(
    "#sec-project-list .project-tablet__hud, #sec-project-list .project-tablet__content",
  );
  const stage = section?.querySelector(".project-tablet-stage");

  if (
    !section ||
    !stage ||
    items.length === 0 ||
    !tablet ||
    !footer ||
    !curtain ||
    !tabletPowerOff ||
    !tabletPowerLogo ||
    tabletPowerLogoLetters.length !== 3 ||
    tabletPowerShutters.length !== 2 ||
    tabletScreenLayers.length === 0
  )
    return;

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const isTablet = window.matchMedia("(max-width: 1024px)").matches;
  section.dataset.footerExitStepCommitted = "false";
  if (footer.parentElement !== stage) stage.insertBefore(footer, curtain);

  const footerContent = footer.querySelector(".footer-blackhole__content");
  const footerVisual = footer.querySelector(".footer-blackhole__visual");
  const blackholePosition = footer.querySelector(".footer-blackhole__position");
  const blackholeMotion = footer.querySelector(".footer-blackhole__motion");
  const thankYouPosition = footer.querySelector(".footer-thankyou-position");
  const thankYouMotion = footer.querySelector(".footer-thankyou-motion");
  const thankYouTitle = footer.querySelector(".footer-thankyou__title");
  const message01 = footer.querySelector(".footer-thankyou__message--01");
  const message02 = footer.querySelector(".footer-thankyou__message--02");
  const contactContainer = footer.querySelector(".footer-contact");
  const contactTitlePosition = footer.querySelector(
    ".footer-contact-title-position",
  );
  const contactTitleMotion = footer.querySelector(
    ".footer-contact-title-motion",
  );
  const contactDetails = footer.querySelector(".footer-contact__details");
  const contactLegal = footer.querySelector(".footer-contact__legal");
  const contactRevealItems = gsap.utils.toArray(
    "#footer .footer-contact__item, #footer .footer-contact__link, #footer .footer-contact__legal p",
  );
  const footerElements = {
    footerContent,
    footerVisual,
    blackholePosition,
    blackholeMotion,
    thankYouPosition,
    thankYouMotion,
    thankYouTitle,
    message01,
    message02,
    contactContainer,
    contactTitlePosition,
    contactTitleMotion,
    contactDetails,
    contactLegal,
  };
  const missingFooterElements = Object.entries(footerElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);
  if (missingFooterElements.length || contactRevealItems.length !== 6) {
    console.error(
      `[Footer] Missing or invalid elements: ${missingFooterElements.join(", ") || "reveal items"}`,
    );
    return;
  }

  const getContactTitleCenterOffset = () => {
    const blackholeRect = blackholePosition.getBoundingClientRect();
    const titleRect = contactTitlePosition.getBoundingClientRect();

    return (
      blackholeRect.top +
      blackholeRect.height / 2 -
      (titleRect.top + titleRect.height / 2)
    );
  };

  ScrollTrigger.getById("proj-pin")?.kill();
  gsap.killTweensOf([
    ...items,
    tablet,
    curtain,
    tabletPowerOff,
    ...tabletPowerShutters,
    tabletPowerLogo,
    ...tabletPowerLogoLetters,
    ...tabletScreenLayers,
    footerVisual,
    blackholeMotion,
    thankYouMotion,
    thankYouTitle,
    message01,
    message02,
    contactTitlePosition,
    contactTitleMotion,
    contactDetails,
    contactLegal,
    ...contactRevealItems,
  ]);

  gsap.set(items, { clearProps: "all" });
  gsap.set(tablet, { clearProps: "transform,opacity,visibility" });
  gsap.set(tablet, { opacity: 1, filter: "none" });
  gsap.set(curtain, { clearProps: "transform", autoAlpha: 0 });
  gsap.set(tabletPowerOff, { autoAlpha: 1 });
  gsap.set(tabletPowerShutters, { scaleY: 0 });
  gsap.set(tabletPowerLogo, { autoAlpha: 0, scale: 1 });
  gsap.set(tabletPowerLogoLetters, { opacity: 0, y: 8 });
  gsap.set(tabletScreenLayers, { opacity: 1 });
  gsap.set(footer, { autoAlpha: 0 });
  gsap.set(footerVisual, { filter: "brightness(0.5)" });
  gsap.set(
    [footerContent, thankYouPosition, contactContainer, contactTitlePosition],
    { autoAlpha: 1 },
  );
  gsap.set(thankYouMotion, {
    autoAlpha: 0,
    scale: 1,
    rotation: 0,
    transformOrigin: "50% 50%",
  });
  gsap.set(thankYouTitle, { autoAlpha: 1, scale: 1, y: 0 });
  gsap.set(message01, { autoAlpha: 0, y: 8 });
  gsap.set(message02, { autoAlpha: 0, y: 8 });
  gsap.set(contactTitleMotion, {
    autoAlpha: 0,
    scale: 0.04,
    letterSpacing: ".04em",
    transformOrigin: "50% 50%",
  });
  gsap.set(contactTitlePosition, { y: 0 });
  gsap.set([contactDetails, contactLegal], {
    autoAlpha: 0,
    pointerEvents: "none",
  });
  gsap.set(contactRevealItems, { autoAlpha: 0, y: 18 });
  gsap.set(blackholeMotion, { rotation: 0, scale: 1 });
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.to(blackholeMotion, {
      rotation: -360,
      duration: 360,
      repeat: -1,
      ease: "none",
    });
  }

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

  let tl;
  tl = gsap.timeline({
    scrollTrigger: {
      id: "proj-pin",
      trigger: section,
      start: "top top",
      end: () =>
        "+=" + Math.max(tl?.duration() || 1, 1) * window.innerHeight * 0.9,
      pin: true,
      pinSpacing: true,
      scrub: isMobile ? 0.4 : isTablet ? 0.5 : 0.55,
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

  const project06Complete = items.length;
  const tabletExitSpeed = 1.5;
  const scaleTabletExitTime = (time) => time / tabletExitSpeed;
  const tabletExitDuration = scaleTabletExitTime(isMobile ? 1.75 : 3.5);
  tl.tabletExitStepDuration = 6 / tabletExitSpeed;
  tl.tabletExitUnlockDelay = 3.5 / tabletExitSpeed;
  tl.tabletExitReverseStepDuration = 4 / tabletExitSpeed;
  tl.addLabel("project06Complete", project06Complete)
    .set([footer, curtain], { autoAlpha: 1 })
    .to(
      tabletScreenLayers,
      {
        autoAlpha: 0,
        duration: scaleTabletExitTime(2),
        ease: "power2.inOut",
      },
      "project06Complete",
    )
    .to(
      tabletPowerShutters,
      {
        scaleY: 1,
        duration: scaleTabletExitTime(2),
        ease: "power3.inOut",
      },
      "project06Complete",
    )
    .set(
      tabletPowerLogo,
      { autoAlpha: 1 },
      `project06Complete+=${scaleTabletExitTime(1.5)}`,
    )
    .to(
      tabletPowerLogoLetters,
      {
        opacity: 1,
        y: 0,
        duration: scaleTabletExitTime(0.3),
        stagger: scaleTabletExitTime(0.08),
        ease: "power2.out",
      },
      `project06Complete+=${scaleTabletExitTime(1.5)}`,
    )
    .addLabel(
      "tabletPowerLogoComplete",
      `project06Complete+=${scaleTabletExitTime(2)}`,
    )
    .to(
      curtain,
      {
        autoAlpha: 0,
        duration: scaleTabletExitTime(0.35),
        ease: "power2.out",
      },
      `project06Complete+=${scaleTabletExitTime(1.65)}`,
    )
    .addLabel("tabletExit", `project06Complete+=${scaleTabletExitTime(2.5)}`)
    .to(
      tablet,
      {
        yPercent: isMobile ? -135 : isTablet ? -130 : -125,
        duration: tabletExitDuration,
        ease: "power3.out",
      },
      "tabletExit",
    )
    .set(tablet, { visibility: "hidden" }, `tabletExit+=${tabletExitDuration}`)
    .addLabel("footerStart", `tabletExit+=${tabletExitDuration}`);

  const footerStart = tl.labels.footerStart;
  const tabletExitStart = tl.labels.tabletExit;
  const footerBrightenStart = tabletExitStart;
  const crossfadeStart = footerStart + (isMobile ? 0.625 : 1.25);
  const absorbStart = footerStart + 2.7;
  const contactEscapeStart = absorbStart + 1.2;
  const contactDropStart = contactEscapeStart + 1.2;
  const contactRevealStart = contactDropStart + 1.2;
  const footerHoldStart = contactRevealStart + 1;
  tl.addLabel("footerThankYouFirstComplete", footerStart)
    .addLabel("footerSecondMessageComplete", crossfadeStart + 0.45)
    .addLabel("footerContactComplete", footerHoldStart);

  tl.to(
    blackholeMotion,
    { scale: 1.06, duration: 8, ease: "none" },
    "footerStart",
  )
    .set(
      thankYouMotion,
      { autoAlpha: 1, scale: 1, rotation: 0 },
      "project06Complete",
    )
    .set(message01, { autoAlpha: 1, y: 0 }, "project06Complete")
    .to(
      footerVisual,
      {
        filter: "brightness(0.667)",
        duration: tabletExitDuration,
        ease: "power2.inOut",
      },
      footerBrightenStart,
    )
    .to(
      message01,
      { autoAlpha: 0, y: -6, duration: 0.45, ease: "power2.inOut" },
      crossfadeStart,
    )
    .fromTo(
      message02,
      { autoAlpha: 0, y: 6 },
      { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.inOut" },
      crossfadeStart,
    )
    .to(
      thankYouMotion,
      {
        autoAlpha: 0,
        scale: 0,
        rotation: -3,
        duration: 1.2,
        ease: "power3.in",
        transformOrigin: "50% 50%",
      },
      absorbStart,
    )
    .set(
      contactTitlePosition,
      { y: getContactTitleCenterOffset },
      contactEscapeStart,
    )
    .fromTo(
      contactTitleMotion,
      { autoAlpha: 0, scale: 0.04, letterSpacing: ".04em" },
      {
        autoAlpha: 1,
        scale: 1,
        letterSpacing: isMobile ? ".38em" : ".55em",
        duration: 1.2,
        ease: "power3.out",
      },
      contactEscapeStart,
    )
    .to(
      contactTitlePosition,
      {
        y: 0,
        duration: 1.2,
        ease: "power3.inOut",
      },
      contactDropStart,
    )
    .set(
      [contactDetails, contactLegal],
      { autoAlpha: 1, pointerEvents: "auto" },
      contactRevealStart,
    )
    .fromTo(
      contactRevealItems,
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" },
      contactRevealStart,
    )
    .to({}, { duration: 1.5 }, footerHoldStart);
}

// Functions Operate Key ------------------------------ //
loading__init();
function initAfterLoading() {
  prepareProjectRevealPhraseLines();
  HeaderSlider__init();
  mobileNavigation__init();
  customScrollbar__init();
  introSections__init();
  projectBackgroundMotion__init();
  projectPlanetMotion__init();
  projectMarquee__init();
  projectMockupDrag__init();
  aboutLicenseCard__init();
  scrollLeins__init();
  if (window.matchMedia("(min-width: 769px)").matches) {
    fullPageStepScroll__init();
  }
  if (window.matchMedia("(max-width: 768px)").matches) {
    projectVerticalScroll__init();
  }
  HeaderAboutColor__init();
  HeaderProjectColor__init();
  backSvgMoveTool__init();
  scrollToMenu__init();
  setupPinAccordion();
  projectTabletTransition__init();
  projectListOverlap__init();
}
// Resize Loaded ------------------------------ //
history.scrollRestoration = "manual";

ScrollTrigger.config({
  autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
});

window.addEventListener("resize", () => {
  if (window.innerWidth !== initialViewportWidth) {
    clearTimeout(responsiveReloadTimer);
    responsiveReloadTimer = setTimeout(() => {
      try {
        sessionStorage.setItem("portfolio-responsive-reload", "true");
      } catch (error) {}
      window.location.reload();
    }, 180);
    return;
  }

  if (!resizeRefreshFrame) {
    resizeRefreshFrame = requestAnimationFrame(() => {
      resizeRefreshFrame = undefined;

      const projectList = document.querySelector("#sec-project-list");
      if (projectList) projectList.style.height = `${window.innerHeight}px`;

      ScrollTrigger.refresh();
      lenis?.resize();
    });
  }

  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    ScrollTrigger.refresh();
    lenis?.resize();
  }, 120);
});

window.addEventListener("load", () => {
  ScrollTrigger.refresh();
});
// Resize Lock ------------------------------ //
let isContactScroll = false;
