function main() {
	/* register GSAP */
	gsap.registerPlugin(SplitText, ScrollTrigger, Flip);

	/* set breakpoints */
	tyx.breakpoints = {
		dsk: 992,
		tab: 768,
		mbl: 480,
	};

	/* set splide defaults */
	(function () {
		Splide.defaults = {
			perMove: 1,
			gap: "0rem",
			arrows: false,
			pagination: false,
			focus: 0,
			speed: 600,
			dragAngleThreshold: 45,
			dragMinThreshold: 20,
			autoWidth: false,
			rewind: false,
			rewindSpeed: 400,
			waitForTransition: false,
			updateOnMove: true,
			trimSpace: "move",
			type: "loop",
			drag: true,
			snap: true,
			autoWidth: false,
			autoplay: true,
			flick: false,
		};
	})();

	/* ------------------------------------------------------------------ */
/*  Tiny string helpers                                               */
/* ------------------------------------------------------------------ */
tyx.helperFunctions.cleanCloudinaryURL = (u = "") => {
	const cleaned = u.split("?")[0].replace(/\/upload\/.*?\/v(\d+)\//, "/upload/v$1/");
	if (!cleaned.includes("/upload/")) console.warn("[cleanCloudinaryURL] Unexpected:", u);
	return cleaned;
  };
  
  tyx.helperFunctions.generatePosterURL = (raw) => {
	const [base, rest] = tyx.helperFunctions.cleanCloudinaryURL(raw).split("/upload/");
	if (!rest) return console.warn("[generatePosterURL] Bad Cloudinary URL:", raw), "";
	const id = rest.split(".").slice(0, -1).join(".");
	const url = `${base}/upload/so_auto,q_auto/${id}.jpg`;
	console.log("[generatePosterURL]", url);
	return url;
  };
  
  tyx.helperFunctions.generateVideoURL = (raw) => {
	const [base, rest] = tyx.helperFunctions.cleanCloudinaryURL(raw).split("/upload/");
	if (!rest) return console.warn("[generateVideoURL] Bad Cloudinary URL:", raw), "";
	const id = rest.split(".").slice(0, -1).join(".");
	const url = `${base}/upload/w_1280,q_auto:eco,f_auto:video,fps_15-30,ac_none/${id}`;
	console.log("[generateVideoURL]", url);
	return url;
  };
  
  /* ------------------------------------------------------------------ */
  /*  Main                                                               */
  /* ------------------------------------------------------------------ */
  tyx.functions.handleVideos = () => {
	/* 0.  Global switch (default = lazy) */
	if (typeof tyx.lazyLoadVideos === "undefined") tyx.lazyLoadVideos = true;
	console.log("[handleVideos] Lazy loading:", tyx.lazyLoadVideos);
  
	/* 1.  Collect <video> elements that use data-src */
	const videos = [...document.querySelectorAll("video source[data-src]")].map(
	  (src) => src.parentElement
	);
	if (!videos.length) return console.log("[handleVideos] No matching videos");
  
	/* 2.  Feature detection */
	const useLazy = tyx.lazyLoadVideos && "IntersectionObserver" in window;
	console.log(`[handleVideos] Found ${videos.length} video(s) | Lazy mode:`, useLazy);
  
	/* 3.  Observers */
	const rootMargin  = "0px 0px 200px 0px";
	const playThresh  = 0.5;
	const loadObs  = useLazy ? new IntersectionObserver(onLoad,  { rootMargin })          : null;
	const playObs  = useLazy ? new IntersectionObserver(onPlay, { threshold: playThresh }) : null;
  
	/* 4.  Walk every video */
	for (const video of videos) {
	  const srcEl       = video.querySelector("source");
	  const dataSrc     = srcEl.dataset.src;
	  const isCloud     = dataSrc.includes("res.cloudinary.com");
  
	  const poster      = isCloud ? tyx.helperFunctions.generatePosterURL(dataSrc) : video.poster;
	  const finalSrc    = isCloud ? tyx.helperFunctions.generateVideoURL(dataSrc) : dataSrc;
  
	  if (poster) video.poster = poster;
	  video._lazySrc = finalSrc;
	  video.preload  = "none";
	  video.muted    = true;
  
	  /* 4-A  Decide hover triggers in precedence order
		 1. sibling (if parent exists) > 2. parent > 3. video > 4. none           */
	  const parentHover = video.closest("[play-on-hover-parent]");
	  const siblingEls  = parentHover
		? [...parentHover.querySelectorAll("[play-on-hover-sibling]")]
			.filter((el) => el !== video && !el.contains(video))
		: [];
	  let triggers = [];
  
	  if (siblingEls.length) {
		triggers = siblingEls;
	  } else if (parentHover) {
		triggers = [parentHover];
	  } else if (video.getAttribute("play-on-hover") === "hover") {
		triggers = [video];
	  }
  
	  const hoverOnly = Boolean(triggers.length);
  
	  console.log(
		"[handleVideos]",
		dataSrc,
		"\n  • Poster:", poster,
		"\n  • Final :", finalSrc,
		"\n  • Hover trigger(s):",
		triggers.length ? triggers.map((e) => e.tagName).join(", ") : "— none —",
		"\n  •", !useLazy ? "Load NOW" : "Lazy-load wait"
	  );
  
	  /* 4-B  Wire up loading/hover behaviour */
	  if (!useLazy) {
		loadNow(video);
		if (!hoverOnly) playOnScroll(video);
	  } else {
		loadObs.observe(video);
		if (hoverOnly) attachHover(video, triggers);
	  }
	}
  
	/* ----------------------------------------------------------------
	   Helper functions
	------------------------------------------------------------------*/
	function loadNow(v) {
	  const s = v.querySelector("source");
	  s.src   = v._lazySrc;
	  s.type  = "video/webm";
	  v.load();
	  console.log("[loadNow] Loaded:", s.src);
	}
  
	function onLoad(entries, obs) {
	  for (const { isIntersecting, target: v } of entries) {
		if (!isIntersecting || v.dataset.loaded) continue;
		console.log("[onLoad] → loading video");
		loadNow(v);
		v.dataset.loaded = "1";
		obs.unobserve(v);
  
		if (!v.autoplay) v.addEventListener("loadeddata", () => (v.pause(), console.log("[onLoad] Paused after first frame")), { once: true });
		if (v.getAttribute("play-on-hover") !== "hover") playObs.observe(v);
	  }
	}
  
	function onPlay(entries) {
	  for (const { intersectionRatio, target: v } of entries) {
		if (!v.dataset.loaded) continue;
		intersectionRatio >= playThresh ? v.play() : v.pause();
		console.log("[onPlay]", intersectionRatio >= playThresh ? "Playing" : "Pausing");
	  }
	}
  
	function attachHover(video, trigEls) {
	  if (video.dataset.hoverAttached) return; // already done
	  video.dataset.hoverAttached = "1";
  
	  let playing = false;
	  video.addEventListener("playing", () => (playing = true));
	  video.addEventListener("pause",   () => (playing = false));
  
	  trigEls.forEach((el) => {
		el.addEventListener("mouseenter", () => {
		  console.log("[hover] enter");
		  if (!video.dataset.loaded) loadNow(video), (video.dataset.loaded = "1");
		  if (video.paused && !playing) video.play();
		});
		el.addEventListener("mouseleave", () => {
		  console.log("[hover] leave");
		  if (!video.paused && playing) video.pause();
		});
	  });
	}
  
	function playOnScroll(v) {
	  const onScroll = () => {
		const r  = v.getBoundingClientRect();
		const ok = r.top < window.innerHeight * (1 - playThresh) && r.bottom > window.innerHeight * playThresh;
		ok ? v.play() : v.pause();
	  };
	  window.addEventListener("scroll", onScroll, { passive: true });
	  onScroll();
	}
  };
  
  
  
	tyx.functions.randomText = function () {
		let mm = gsap.matchMedia();

		// only do this on desktop
		mm.add("(min-width: 767px)", () => {
			document.querySelectorAll(".text-anim-random").forEach((el) => {
				// Split text into char spans
				const split = new SplitText(el, { types: "words, chars" });
				// Ensure visibility
				gsap.set(el, { opacity: 1 });

				// Timeline plays on enter, reverses on leave back, and reverts splits on complete or reverse complete
				const tl = gsap.timeline({
					paused: true,
					onComplete: () => split.revert(),
					onReverseComplete: () => split.revert(),
				});

				tl.from(split.chars, {
					opacity: 0,
					duration: 0.05,
					ease: "power1.out",
					stagger: { amount: 0.4, from: "random" },
				});

				// Scroll-triggered playback
				ScrollTrigger.create({
					trigger: el,
					start: "top 90%",
					onEnter: () => tl.play(),
				});
				ScrollTrigger.create({
					trigger: el,
					start: "top bottom",
					// onLeaveBack: () => tl.reverse()
				});
			});

			return () => { };
		});
	};

	tyx.functions.homeHero = function () {
		const mediaElem = document.querySelector(".home-hero_media-wrap");
		const scrollTargetDsk = document.querySelector(".scroll-target-dsk");
		const sizeTargetDsk = document.querySelector(".size-target-dsk");
		if (!mediaElem || !scrollTargetDsk) {
			console.error("[Hero Animation] Missing required elements.");
			return;
		}

		const mm = gsap.matchMedia();
		let heroTL, heroTrigger;

		// DESKTOP CONTEXT
		mm.add(`(min-width: ${tyx.breakpoints.tab}px)`, () => {
			// kill any old instance for this hero
			if (heroTrigger) heroTrigger.kill();
			if (heroTL) heroTL.kill();

			const windowWidth = window.innerWidth;
			const desiredWidth = sizeTargetDsk.offsetWidth;
			const scaleFactor = windowWidth >= desiredWidth ? desiredWidth / windowWidth : 0.5;
			const transformOriginX = (scrollTargetDsk.offsetLeft / windowWidth) * 100;

			gsap.set(mediaElem, { transformOrigin: `${transformOriginX}% 50%` });

			// build timeline and keep refs
			heroTL = gsap
				.timeline({
					scrollTrigger: {
						trigger: ".s-home-hero",
						start: "top top",
						end: "center center",
						endTrigger: scrollTargetDsk,
						scrub: true,
						pin: mediaElem,
						pinSpacing: true,
						onUpdate(self) {
							if (self.progress === 1) {
								gsap.set(mediaElem, {
									position: "relative",
									top: "auto",
									left: "auto",
									xPercent: 0,
									yPercent: 0,
								});
							}
						},
						onLeaveBack() {
							gsap.set(mediaElem, {
								clearProps: "position,top,left,xPercent,yPercent,transformOrigin",
							});
						},
						// capture the trigger instance
						onToggle(self, isActive) {
							heroTrigger = self;
						},
					},
				})
				.to(mediaElem, { scale: scaleFactor, left: 0, ease: "power2.out" })
				.to(
					[".home-hero_content", ".home-hero_video-overlay"],
					{ opacity: 0, ease: "power2.out" },
					"<"
				);

			// return cleanup for when desktop un-matches
			return () => {
				heroTrigger && heroTrigger.kill();
				heroTL && heroTL.kill();
				gsap.set(mediaElem, { clearProps: "all" });
			};
		});

		// MOBILE CONTEXT: cleanup only our hero
		mm.add(`(max-width: ${tyx.breakpoints.tab - 1}px)`, () => {
			heroTrigger && heroTrigger.kill();
			heroTL && heroTL.kill();
			gsap.set(mediaElem, { clearProps: "all" });
			// no teardown return needed
		});
	};

	tyx.functions.largeSlider = function () {
		// Get all swiper containers
		const components = document.querySelectorAll(".large-slider");
		if (!components.length) return;

		components.forEach((component) => {
			const swiperEl = component.querySelector(".swiper");
			if (!swiperEl) return;

			// Get the swiper-wrapper within the current container
			const swiperWrapper = component.querySelector(".swiper-wrapper");
			if (!swiperWrapper) return;

			// Get all swiper-slide elements within the current container
			const swiperSlides = component.querySelectorAll(".swiper-slide");
			if (!swiperSlides.length) return;

			// Clone each swiper-slide element 4 times and append to the swiper-wrapper
			for (let i = 0; i < 4; i++) {
				swiperSlides.forEach((slide) => {
					const clone = slide.cloneNode(true);
					swiperWrapper.appendChild(clone);
				});
			}

			const swiper = new Swiper(swiperEl, {
				centeredSlides: true,
				slideToClickedSlide: true /* click on slide to scroll to it */,
				slidesPerView: 1,
				autoplay: {
					delay: 5000,
				},
				navigation: {
					nextEl: ".splide__arrow.splide__arrow--next",
					prevEl: ".splide__arrow.splide__arrow--prev",
				},
				loop: true,
				loopAdditionalSlides: 5 /* render more slides */,
				freeMode: {
					/* allow 'flick scrolling */ enabled: true,
					sticky: true /* snap to slides */,
					minimumVelocity: 0.05,
					momentumVelocityRatio: 0.1,
					momentumRatio: 0.5 /* dial it down a little */,
				},
				effect: "creative" /* enable scaling effect */,
				creativeEffect: {
					limitProgress: 2,
					prev: {
						// Slide scale
						scale: 0.85,
						translate: ["-100%", 0, 0],
						origin: "right center",
						opacity: 0.75,
					},
					next: {
						// Slide scale
						scale: 0.85,
						translate: ["100%", 0, 0],
						origin: "left center",
						opacity: 0.75,
					},
				},
				keyboard: {
					enabled: true,
					onlyInViewport: false,
				},
				on: {
					sliderFirstMove: function () {
						// console.log("sliderFirstMove");
						const activeSlide = this.slides[this.activeIndex];
						const prevSlide = this.slides[this.activeIndex - 1];
						const nextSlide = this.slides[this.activeIndex + 1];
						[activeSlide, prevSlide, nextSlide].forEach((slide) => {
							const video = slide.querySelector("video");
							if (video) {
								video.loop = true;
								video.play();
							}
						});
					},
					afterInit: function () {
						// console.log("Swiper initialised");

						const activeSlide = this.slides[this.activeIndex];
						const video = activeSlide.querySelector("video");
						if (video) {
							video.loop = true;
							video.play();
						}
					},
					transitionEnd: function () {
						// console.log("transitionEnd");
						const activeSlide = this.slides[this.activeIndex];

						this.slides.forEach((slideElement) => {
							const video = slideElement.querySelector("video");
							if (slideElement === activeSlide) {
								if (video) {
									video.loop = true;
									video.play();
								}
							} else {
								if (video) {
									video.pause();
								}
							}
						});
					},
				},
			});
		});
	};

	tyx.functions.benefits = function () {
		var check = document.querySelector(".benefit-card");
		if (!check) return;

		let mm = gsap.matchMedia();

		mm.add("(min-width: 768px)", () => {
			let items = gsap.utils.toArray(".benefits_list"); // get all the lists of benefit cards

			items.forEach((container, i) => {
				const section = document.querySelector(".s-benefits");
				if (!section) return;

				let localItems = container.querySelectorAll(".benefit-card"),
					distance = () => {
						let lastItemBounds = localItems[localItems.length - 1].getBoundingClientRect(),
							containerBounds = container.getBoundingClientRect();
						return Math.max(0, lastItemBounds.right - containerBounds.right);
					};
				gsap.to(container, {
					x: () => -distance(), // make sure it dynamically calculates things so that it adjusts to resizes
					ease: "none",
					scrollTrigger: {
						trigger: container,
						start: "center center",
						pinnedContainer: section,
						end: () => "+=" + distance(),
						pin: section,
						scrub: true,
						invalidateOnRefresh: true, // will recalculate any function-based tween values on resize/refresh (making it responsive)
					},
				});
			});

			return () => {
				gsap.set(items, { clearProps: "x" });
			};
		});

		mm.add("(max-width: 767px)", () => {
			if (!splide) {
				var splide = new Splide(".s-benefits .splide", {
					type: "slide",
					mediaQuery: "min",
					autoplay: false,
					autoWidth: true,
					arrows: false,
					trimSpace: "move",
					pagination: false,
					breakpoints: {
						768: {
							destroy: true,
						},
					},
				});

				splide.mount();
			}

			return () => {
				if (splide) {
					splide.destroy();
					splide = null;
				}
			};
		});
	};

	tyx.functions.magicCarousel = function () {
		var check = document.querySelector(".s-magic-carousel .splide");
		if (!check) return;

		var splide = new Splide(".s-magic-carousel .splide", {
			type: "slide",
			mediaQuery: "min",
			autoWidth: true,
			autoplay: false,
			arrows: true,
			trimSpace: "move",
			pagination: false,
		});

		var bar = splide.root.querySelector(".progress_bar");
		var prevArrow = splide.root.querySelector(".splide__arrow--prev");
		var nextArrow = splide.root.querySelector(".splide__arrow--next");

		splide.on("mounted move", function () {
			// Progress bar logic
			if (bar) {
				var end = splide.Components.Controller.getEnd() + 1;
				var rate = Math.min((splide.index + 1) / end, 1);
				bar.style.width = String(100 * rate) + "%";
			}

			// Arrow disable logic
			if (prevArrow) {
				if (splide.index === 0) {
					prevArrow.classList.add("is-inactive");
				} else {
					prevArrow.classList.remove("is-inactive");
				}
			}

			if (nextArrow) {
				if (splide.index === splide.Components.Controller.getEnd()) {
					nextArrow.classList.add("is-inactive");
				} else {
					nextArrow.classList.remove("is-inactive");
				}
			}
		});

		splide.mount();
	};

	tyx.functions.counter = function () {
		// create a custom effect for the counter
		gsap.registerEffect({
			name: "counter",
			extendTimeline: true,
			defaults: {
				end: 0,
				duration: 0.5,
				ease: "power1",
				increment: 1,
			},
			effect: (targets, config) => {
				let tl = gsap.timeline();
				let num = targets[0].innerText.replace(/\,/g, "");
				targets[0].innerText = num;

				tl.to(
					targets,
					{
						duration: config.duration,
						innerText: config.end,
						//snap:{innerText:config.increment},
						modifiers: {
							innerText: function (innerText) {
								return gsap.utils
									.snap(config.increment, innerText)
									.toString()
									.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
							},
						},
						ease: config.ease,
					},
					0
				);

				return tl;
			},
		});

		gsap.set(".stat", { opacity: 0, y: 20 });

		ScrollTrigger.batch(".stat", {
			// how early before entering should the trigger fire
			start: "top 80%",
			// max items to animate at once
			batchMax: 5,
			// small delay window to group items
			interval: 0.1,

			onEnter(batch) {
				batch.forEach((stat, i) => {
					const counterEl = stat.querySelector(".anim-count");
					if (!counterEl) return;

					const end = parseInt(counterEl.dataset.endValue, 10) || 0;
					const inc = parseInt(counterEl.dataset.increment, 10) || 1;
					const dur = parseFloat(counterEl.dataset.duration) || 1;

					// reset for A11y
					counterEl.innerText = "0";
					counterEl.setAttribute("aria-live", "polite");
					counterEl.setAttribute("role", "status");

					// build a little timeline for this stat:
					gsap
						.timeline({
							delay: i * 0.15, // match your fade-stagger
						})
						// 1) fade it in
						.to(stat, {
							opacity: 1,
							y: 0,
							duration: 0.2,
							ease: "power1.out",
						})
						// 2) once that's done, fire your counter
						.call(() => {
							gsap.effects.counter(counterEl, {
								end,
								increment: inc,
								duration: dur,
							});
						});
				});
			},
			once: true, // Ensure animation happens only once
		});
	};

	tyx.functions.changeIntroColors = function () {
		if (!document.querySelector(".s-home-intro")) return;
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: ".s-home-intro",
				start: "bottom 25%",
				// end: "bottom-=400 top",
				toggleActions: "play none none reverse",
			},
			defaults: {
				duration: 1,
				ease: "power1.inOut",
			},
		});
		tl.to(
			[".s-home-intro .section-bg-neg", ".s-home-stats", ".s-magic-carousel"],
			{
				backgroundColor: "var(--_color---grey--dark-2)",
				"--_theme---body": "white",
				"--_theme---link": "var(--_color---blue--mid)",
				"--_theme---link-hover": "var(--_color---purple--mid)",
			},
			0
		);
		// tl.to(
		// 	[".s-home-intro .label, .s-home-stats .label"],
		// 	{
		// 		color: "white",
		// 	},
		// 	0
		// );
	};

	tyx.functions.magicCard = function () {
		const cards = document.querySelectorAll(".magic-card");
		const className = "w-variant-c5bd8cb1-745d-6422-4579-86188fba0502";

		function toggleClass(els, myClass) {
			els.forEach((el) => {
				if (el.classList.contains(myClass)) {
					el.classList.remove(myClass);
				} else {
					el.classList.add(myClass);
				}
			});
		}

		cards.forEach((card) => {
			const btn = card.querySelector(".magic-card_btn");
			const content = card.querySelector(".magic-card_content");
			const content_1 = card.querySelector(".magic-card_content-1");
			const content_2 = card.querySelector(".magic-card_content-2");
			const content_3 = card.querySelector(".magic-card_content-3");
			if (!btn || !content) return;

			// const tl = gsap.timeline({
			// 	paused: true,
			// });

			function doFlip() {
				const state = Flip.getState([card, content, content_1, content_2, content_3]);

				// make styling change
				toggleClass([card, content, content_1, content_2, content_3], className);

				Flip.from(state, { duration: 1, ease: "power1.inOut" });

				card.setAttribute("aria-expanded", "true");
			}

			btn.addEventListener("click", function () {
				if (card.getAttribute("aria-expanded") !== "true") {
					doFlip();
				} else {
					// Reset the card to its original state
					toggleClass([card, content, content_1, content_2, content_3], className);
					card.setAttribute("aria-expanded", "false");
				}
			});
		});
	};

	tyx.functions.serviceCard = function () {
		var check = document.querySelector(".home-service-card");
		if (!check) return;

		let mm = gsap.matchMedia();

		mm.add("(min-width: 768px)", () => {
			const cards = document.querySelectorAll(".home-service-card");
			cards.forEach((card) => {
				const bottom = card.querySelector(".home-service-card_bottom");
				let tl = gsap.timeline({
					paused: true,
					reversed: true,
				});
				tl.to(bottom, { height: "auto", duration: 0.3 });
				gsap.set(bottom, { height: 0 });

				card.addEventListener("mouseenter", function () {
					toggle();
				});
				card.addEventListener("mouseleave", function () {
					toggle();
				});

				function toggle() {
					tl.reversed() ? tl.play() : tl.reverse();
				}
			});

			return () => {
				// reset height
				gsap.set(".home-service-card_bottom", { height: "auto" });
			};
		});

		var splide = new Splide(".s-home-services .splide", {
			type: "slide",
			mediaQuery: "min",
			// autoWidth: true,
			//width: "16rem",
			autoplay: false,
			arrows: true,
			trimSpace: "move",
			pagination: false,
			breakpoints: {
				768: {
					destroy: true,
				},
			},
		});
		var bar = splide.root.querySelector(".progress_bar");
		if (!bar) {
			splide.mount();
			return;
		} else {
			// Updates the bar width whenever the carousel moves:
			splide.on("mounted move", function () {
				var end = splide.Components.Controller.getEnd() + 1;
				var rate = Math.min((splide.index + 1) / end, 1);
				bar.style.width = String(100 * rate) + "%";
			});
			splide.mount();
		}
	};

	tyx.functions.teamSlider = function () {
		var check = document.querySelector(".s-team .splide");
		if (!check) return;
		var splide = new Splide(".s-team .splide", {
			type: "loop",
			autoplay: false,
			autoScroll: {
				speed: 1,
				pauseOnHover: false,
			},
			clones: 5,
			arrows: false,
			trimSpace: "move",
			pagination: false,
			snap: false,
			drag: "free",
		});

		splide.mount(window.splide.Extensions);
	};

	tyx.functions.testimonials = function () {
		var check = document.querySelector(".s-testimonials .splide");
		if (!check) return;

		var splide = new Splide(".s-testimonials .splide", {
			type: "loop",
			autoplay: false,
			autoScroll: {
				speed: 1,
				pauseOnHover: false,
			},
			arrows: false,
			trimSpace: "move",
			pagination: false,
		});

		splide.mount(window.splide.Extensions);
	};

	tyx.functions.chaosMarquee = function () {
		// duplicate marquee content element
		const marqueeContent = document.querySelector(".chaos-marquee_content");
		if (!marqueeContent) return;
		const marqueeContentClone = marqueeContent.cloneNode(true);
		marqueeContent.parentNode.appendChild(marqueeContentClone);
	};

	tyx.functions.process = function () {
		const sections = document.querySelectorAll(".s-process");
		if (!sections) return;

		sections.forEach((section) => {
			const steps = section.querySelectorAll(".process-step");
			if (!steps) return;

			// Set initial state
			gsap.set(steps, { yPercent: 100, autoAlpha: 0 });

			// Create a timeline for the animation
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top 60%",
					end: "bottom 80%",
					scrub: 1,
					once: true,
				},
			});

			tl.to(steps, {
				yPercent: 0,
				autoAlpha: 1,
				stagger: 0.3,
				duration: 1.3,
				ease: "power2.out",
			});
		});
	};

	tyx.functions.parallax = function () {
		// based on https://codepen.io/GreenSock/pen/BarmbXq
		const parallaxSections = document.querySelectorAll(".s-big-img");
		if (!parallaxSections) return;

		parallaxSections.forEach((section) => {
			const image = section.querySelector(".big-img_media");
			getRatio = (el) => window.innerHeight / (window.innerHeight + el.offsetHeight);

			let tl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top bottom",
					end: "bottom top",
					scrub: true,
					pinSpacing: false,
					invalidateOnRefresh: true,
				},
			});

			tl.fromTo(
				image,
				{
					y: () => -window.innerHeight * getRatio(section),
				},
				{
					y: () => window.innerHeight * (1 - getRatio(section)),
					ease: "none",
				}
			);
		});
	};

	tyx.functions.parallaxBasic = function () {
		const parallaxTriggers = document.querySelectorAll(".anim-parallax-trigger");
		// const parallaxTriggers = document.querySelectorAll(".pricing_bg");
		if (!parallaxTriggers.length) return;

		parallaxTriggers.forEach((trigger) => {
			ScrollTrigger.update();
			const target = trigger.querySelector(".anim-parallax-target");
			// const target = trigger.querySelector(".img-cover");
			if (!target) return;

			const strength = parseFloat(trigger.dataset.parallaxStrength) || 20;

			gsap.set(target, { yPercent: -strength, scale: () => (100 + 2 * strength) / 100 });

			gsap.to(target, {
				yPercent: strength,
				ease: "none",
				scrollTrigger: {
					trigger: trigger,
					scrub: true,
					start: "top bottom",
					end: "bottom top",
					// markers: true,
				},
			});
		});
	};

	tyx.functions.textAnim = function () {
		document.querySelectorAll(".text-anim").forEach((el) => {
			const split = new SplitText(el, {
				type: "words, chars",
				tag: "span",
			});

			gsap.set(el, { opacity: 1 });

			gsap
				.timeline({
					scrollTrigger: {
						trigger: el,
						start: "top 75%",
						end: "top top",
						scrub: 1,
					},
				})
				.fromTo(
					split.words,
					{ opacity: 0.3 },
					{
						opacity: 1,
						duration: 4,
						ease: "cubic.out",
						stagger: { each: 0.4 },
					}
				);
		});
	};

	tyx.functions.sticky5050 = function () {
		gsap.registerPlugin(ScrollTrigger, ExpoScaleEase);

		document.querySelectorAll(".s-sticky-5050").forEach((section) => {
			const items = section.querySelectorAll(".sticky-5050_left-item");
			const mediaInners = section.querySelectorAll(".sticky-5050_media-inner");
			const mediaWrapper = section.querySelector(".sticky-5050_media");
			items.forEach((item, i) => {
				if (i === 0) {
					return;
				}

				const mediaInner = mediaInners[i];
				if (!mediaInner) return;

				// Set initial scales
				gsap.set(mediaInner, { opacity: 0 });

				// let animation = gsap.fromTo(mediaInner, { opacity: 0 }, { opacity: 1, duration: 0.5 });

				let tl = gsap.timeline({
					scrollTrigger: {
						trigger: item,
						start: "top 70%", // when item top reaches bottom of media
						end: "top 30%", // when item top reaches top of media
						toggleActions: "play none reverse none",
						// animation: animation,
					},
				});
				tl.fromTo(mediaInner, { opacity: 0 }, { opacity: 1, duration: 0.5 });
			});
		});
	};

	tyx.functions.serviceHero = function () {
		const sections = document.querySelectorAll(".s-service-hero");
		if (!sections) return;

		sections.forEach((section) => {
			const heading = section.querySelector(".service-hero_heading");
			const bg = section.querySelector(".service-hero_bg");

			gsap.set(heading, { yPercent: 200, autoAlpha: 1 });

			const tl = gsap.timeline({});
			tl.to(
				heading,
				{
					yPercent: 0,
					duration: 1.5,
					ease: "power2.out",
					immediateRender: false,
				},
				0.5
			);

			const bg_tl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "bottom 95%",
					end: "bottom 70%",
					scrub: true,
					// markers: true,
				},
			});
			// fade out bg
			bg_tl.to(bg, {
				opacity: 0.1,
				ease: "power2.out",
			});
		});
	};

	tyx.functions.visualiser = function () {
		const container = document.querySelector(".visualiser");
		if (!container) return;
		let bars = [];
		let simplex = new SimplexNoise();
		let time = 0;
		const barCountDsk = 150;
		const barCountMbl = 50;
		let mouseX = 0;

		// Animate bars
		function startAnimation(barCount) {
			let time = 0;

			function frame() {
				time += 0.005;
				const rect = container.getBoundingClientRect();

				bars.forEach((bar, i) => {
					const barX = (i / barCount) * rect.width;
					const distance = Math.abs(barX - mouseX);
					const proximity = Math.max(0, 1 - distance / 150); // 150px falloff

					const noise = simplex.noise2D(i * 0.1, time);
					let scale = gsap.utils.mapRange(-1, 1, 0.2, 1, noise);

					// Apply proximity boost
					scale += proximity * 0.25; // up to +0.5 added when cursor is near

					gsap.to(bar, {
						scaleY: scale,
						duration: 0.2,
						ease: "power2.out",
					});
				});

				requestAnimationFrame(frame);
			}

			frame();
		}

		// create bars
		function createBars(barCount) {
			container.innerHTML = ""; // move this here to ensure reset
			bars = []; // reinitialize
			for (let i = 0; i < barCount; i++) {
				const bar = document.createElement("div");
				bar.classList.add("bar");
				container.appendChild(bar);
				bars.push(bar);
			}
		}

		function cleanUp() {
			bars.length = 0; // Clear the bars array
			//kill tweens
			gsap.killTweensOf(bars);
		}

		let mm = gsap.matchMedia();

		mm.add("(min-width: 768px)", () => {
			cleanUp();
			// Create bars
			createBars(barCountDsk);

			container.addEventListener("mousemove", (e) => {
				const rect = container.getBoundingClientRect();
				mouseX = e.clientX - rect.left;
			});

			// Start animation
			startAnimation(barCountDsk);

			return () => {
				cleanUp();
			};
		});

		mm.add("(max-width: 767px)", () => {
			cleanUp();
			// Create bars
			createBars(barCountMbl);
			// Start animation
			startAnimation(barCountMbl);

			return () => {
				cleanUp();
			};
		});
	};

	tyx.functions.faq = function () {
		const faqGroups = document.querySelectorAll(".s-faq");
		if (!faqGroups) return;

		function open(array, itemObj) {
			// Close other open items in the same group
			array.forEach((el) => {
				if (el !== itemObj && el.tl.reversed() === false) {
					close(el);
				}
			});
			// Open the clicked item
			itemObj.tl.play();
			// Set the item to be open
			itemObj.item.classList.add("is-open");
		}

		function close(itemObj) {
			itemObj.tl.reverse();
			itemObj.item.classList.remove("is-open");
		}

		function toggle(array, itemObj) {
			itemObj.tl.reversed() ? open(array, itemObj) : close(itemObj);
		}

		faqGroups.forEach((group) => {
			const items = group.querySelectorAll(".faq-item");
			if (!items) return;
			let array = [];

			items.forEach((item) => {
				let itemObj = {
					item: item,
					header: item.querySelector(".faq-item_header"),
					body: item.querySelector(".faq-item_body"),
					icon: item.querySelector(".faq-item_icon"),
				};

				if (!itemObj.header || !itemObj.body) return;

				itemObj.tl = gsap.timeline({
					paused: true,
					reversed: true,
				});

				array.push(itemObj);

				itemObj.tl.to(itemObj.body, { height: "auto", duration: 0.2, ease: "none" }, 0);
				itemObj.tl.to(itemObj.icon, { rotate: 45, duration: 0.1, ease: "power2.out" }, "<");
				gsap.set(itemObj.body, { height: 0 });

				itemObj.header.addEventListener("click", function () {
					toggle(array, itemObj);
				});
			});
		});
	};

	tyx.functions.fancyHero = function () {
		const sections = document.querySelectorAll(".hero.is-fancy");
		if (!sections.length) return;

		let scrollTriggerOptions = {};

		sections.forEach((section) => {
			const media = section.querySelector(".media");
			if (!media) return;

			const video = media.querySelector("video");

			const triggerDistance = 40;

			scrollTriggerOptions = {
				trigger: section,
				start: `top+=${triggerDistance} top`,
				end: "+=20%", // pin for 100% of viewport height
				scrub: false,
				// markers: true,
				toggleActions: "play none none reverse",
				pin: true,
				pinSpacing: true,
				anticipatePin: 1,
			};

			gsap.set(media, { transformOrigin: "50% 75%", top: triggerDistance });
			gsap.set(section, { marginBottom: triggerDistance });
			gsap.set(media, { scale: 0.75, yPercent: 30 }); // CSS hides media to avoid FOUC
			gsap.fromTo(media, { autoAlpha: 0, duration: 0.5 }, { autoAlpha: 1 }); // then show

			let sectionSelector = gsap.utils.selector(section);
			let q = gsap.utils.selector(".hero_split-heading");

			// initally center the split headings - we have to do this with GSAP to get the transforms working properly
			gsap.set(".hero_split-title-wrap", {
				xPercent: 50,
			});
			gsap.set(".hero_split-title-inner", {
				xPercent: -50,
			});

			// hide the overlay once transforms are set
			gsap.to(sectionSelector(".fancy-hero_overlay"), { autoAlpha: 0 });

			const tl = gsap.timeline({
				scrollTrigger: {
					...scrollTriggerOptions,
				},
			});
			tl.timeScale(0.75); // slow down the timeline
			// tl.set(media, { autoAlpha: 1 }); // CSS hides media to avoid FOUC

			// move each split heading and its inner element
			tl.to(
				q(".hero_split-title-wrap.is-1"),
				{
					xPercent: 100,
					duration: 1.5,
					ease: "power3.out",
				},
				"0.05"
			);
			tl.to(
				q(".hero_split-title-inner.is-1"),
				{
					xPercent: -100,
					duration: 1.5,
					ease: "power3.out",
				},
				"0.05"
			);
			tl.to(
				q(".hero_split-title-wrap.is-2"),
				{
					xPercent: 0,
					duration: 1.5,
					ease: "power3.out",
				},
				"0.05"
			);
			tl.to(
				q(".hero_split-title-inner.is-2"),
				{
					xPercent: 0,
					duration: 1.5,
					ease: "power3.out",
				},
				"0.05"
			);

			tl.to(
				".breadcrumbs",
				{
					autoAlpha: 0,
					duration: 1,
					ease: "power3.out",
				},
				"0"
			);
			tl.fromTo(
				media,
				{ scale: 0.75, yPercent: 30, duration: 1.5, ease: "power3.out" },
				{ scale: 1, yPercent: 0 },
				"0"
			);
			// play video halfway through timeline
			if (video) {
				tl.call(
					() => {
						video.play();
					},
					null,
					"0.5"
				);
			}
		});

		// ✅ Define a reusable function for background color logic
		function updateBackgroundColor() {
			const viewportHeight = window.innerHeight;
			let activeFound = false;

			sections.forEach((section) => {
				const rect = section.getBoundingClientRect();
				const topRatio = rect.top / viewportHeight;
				const bottomRatio = rect.bottom / viewportHeight;

				const isInRange = bottomRatio >= -0.25 && topRatio <= 1.25;

				if (isInRange && !activeFound) {
					const bgColor = window.getComputedStyle(section).backgroundColor;
					document.querySelector(".page-wrap").style.backgroundColor = bgColor;
					activeFound = true;
				}
			});

			if (!activeFound) {
				document.querySelector(".page-wrap").style.backgroundColor = "transparent";
			}
		}

		window.addEventListener("scroll", updateBackgroundColor);
		updateBackgroundColor();
	};

	tyx.functions.nav = function () {
		/* ───────────────────────── CONFIG ───────────────────────── */
		const DEBUG = true; // 🔧 set true to see logs
		const log = (...a) => DEBUG && console.log("[tyx.nav]", ...a);

		// gsap.registerPlugin(ScrollTrigger);

		const nav = document.querySelector(".nav");
		const subnav = document.querySelector(".c-subnav");
		const subBtn = document.querySelector(".subnav_mob-btn");
		const subLinks = document.querySelector(".subnav_links");

		if (!nav) {
			console.error("❌ .nav element not found");
			return;
		}
		log("init", { nav, subnav });

		/* Thresholds (vh ratios) – tweak if ever needed */
		const MAIN_THRESHOLD = 0.5; // 50 vh
		const SUB_THRESHOLD = 1.0; // 100 vh

		/* ─────────────────────── 1) MAIN NAV show / hide ──────────────────────── */
		ScrollTrigger.create({
			trigger: document.body,
			start: "top top",
			end: "bottom bottom",
			onUpdate(self) {
				/* Always hide while sub-nav is open (per your “yes”) */
				if (subnav && subnav.classList.contains("is-open")) {
					nav.classList.add("is-hidden");
					nav.classList.add("is-past-threshold");
					return;
				}

				const inside = self.scroll() <= window.innerHeight * MAIN_THRESHOLD;

				nav.classList.toggle("is-hidden", !inside);
				nav.classList.toggle("is-past-threshold", !inside);
			},
		});

		/* ─────────────────────── 2) SUB-NAV open / close ──────────────────────── */
		if (subnav) {
			subnav.classList.add("dev");
			subnav.classList.remove("is-open");
			ScrollTrigger.create({
				trigger: document.body,
				start: () => `${window.innerHeight * SUB_THRESHOLD} top`,
				end: "bottom bottom",
				/* enter zone → open once and keep open */
				onEnter() {
					log("subnav → open");
					subnav.classList.add("is-open");
					nav.classList.add("is-hidden"); // keep main nav hidden
				},
				/* leave zone back upward → close */
				onLeaveBack() {
					log("subnav → close");
					subnav.classList.remove("is-open");
					/* main nav visibility now handled by its own trigger */
				},
			});
		}
		/* ───── sub-nav accordion: animate ONLY .c-subnav height ───── */
		if (subBtn && subLinks && subnav) {
			let linksOpen = false;
			const closeSubLinks = () => {
				if (!linksOpen) return;
				gsap.killTweensOf(subnav);
				gsap.to(subnav, {
					height: "var(--sub-nav-h)",
					duration: 0.4,
					ease: "power2.inOut",
					onComplete() {
						linksOpen = false;
					},
				});
				gsap.to(subBtn.querySelector("svg"), {
					rotateX: 0,
					transformOrigin: "center center",
					duration: 0.25,
					ease: "power2.out",
				});
			};

			const onSubBtn = () => {
				if (!linksOpen) {
					// OPEN: Animate from baseH to baseH + linksH
					subnav.style.height = getComputedStyle(subnav).getPropertyValue("--sub-nav-h");
					gsap.to(subnav, {
						height: subnav.scrollHeight + "px", // Animate to measured open height
						duration: 0.4,
						ease: "power2.inOut",
						onComplete() {
							subnav.style.height = "auto"; // Let it auto-expand if content changes
							linksOpen = true;
						},
					});
				} else {
					// CLOSE: Animate from current height to baseH (the var)
					gsap.to(subnav, {
						height: "var(--sub-nav-h)",
						duration: 0.4,
						ease: "power2.inOut",
						onComplete() {
							linksOpen = false;
						},
					});
				}

				// Arrow animation
				gsap.to(subBtn.querySelector("svg"), {
					rotateX: !linksOpen ? 180 : 0,
					transformOrigin: "center center",
					duration: 0.25,
					ease: "power2.out",
				});
			};

			subBtn.addEventListener("click", onSubBtn);
		}

		/* ─────────────────────── 3) matchMedia variants ───────────────────────── */
		const mm = gsap.matchMedia();

		/* ============================= DESKTOP (≥992 px) ======================== */
		mm.add("(min-width: 992px)", () => {
			const bar = nav.querySelector(".nav_bar");
			const barH = bar ? bar.offsetHeight : 0;
			let current = null;

			const panels = new Map();
			const handlers = new Map();

			function closeAll() {
				if (!current) return;
				log("desktop closeAll");

				const pane = panels.get(current);
				gsap.killTweensOf(pane);
				gsap.set(pane, { autoAlpha: 0, pointerEvents: "none" });
				gsap.to(nav, { height: barH, duration: 0.35 });

				current.classList.remove("is-active", "is-open");
				nav.classList.remove("is-open");
				current = null;
			}

			nav.querySelectorAll(".nav_link").forEach((link) => {
				const name =
					link.dataset.panel || [...link.classList].find((c) => c.startsWith("is-"))?.slice(3);
				const pane = nav.querySelector(`.nav_content.is-${name}`);

				if (pane) {
					panels.set(link, pane);
					gsap.set(pane, { autoAlpha: 0, pointerEvents: "none" });

					const openPane = (e) => {
						e.preventDefault();
						if (current === link) return;

						if (current) {
							const prevPane = panels.get(current);
							gsap.killTweensOf(prevPane);
							gsap.set(prevPane, { autoAlpha: 0, pointerEvents: "none" });
							current.classList.remove("is-active", "is-open");
						}

						const targetH = barH + pane.scrollHeight;
						gsap.set(pane, { autoAlpha: 0, pointerEvents: "auto" });
						gsap.to(nav, { height: targetH, duration: 0.35 });
						gsap.to(pane, { autoAlpha: 1, duration: 0.25, delay: 0.1 });

						link.classList.add("is-active", "is-open");
						nav.classList.add("is-open");
						current = link;
						log("desktop openPane", name);
					};

					link.addEventListener("mouseenter", openPane);
					link.addEventListener("focus", openPane);
					handlers.set(link, openPane);
					return;
				}

				const closeOnEnter = () => closeAll();
				link.addEventListener("mouseenter", closeOnEnter);
				link.addEventListener("focus", closeOnEnter);
				handlers.set(link, closeOnEnter);
			});

			nav.addEventListener("mouseleave", closeAll);
			nav.addEventListener("focusout", (e) => {
				if (!nav.contains(e.relatedTarget)) closeAll();
			});

			/* cleanup */
			return () => {
				handlers.forEach((fn, link) => {
					link.removeEventListener("mouseenter", fn);
					link.removeEventListener("focus", fn);
				});
				nav.removeEventListener("mouseleave", closeAll);
				nav.classList.remove("is-open");
				gsap.set(nav, { height: "auto" });
				panels.forEach((pane) => gsap.set(pane, { autoAlpha: 0, pointerEvents: "none" }));
			};
		});

		/* ============================== MOBILE (≤991 px) ======================== */
		mm.add("(max-width: 991px)", () => {
			const btn = nav.querySelector(".nav_mob-icon");
			const icons = btn.querySelectorAll(".nav_mob-icon-svg");
			const drawer = nav.querySelector(".nav_mob-content");
			let open = false;
			const accordions = [];

			gsap.set(icons[0], { autoAlpha: 0 });
			gsap.set(drawer, { height: 0, autoAlpha: 0 });

			const onBtn = () => {
				open = !open;
				log("mobile hamburger", open ? "open" : "close");
				nav.classList.toggle("is-open", open);

				const fullH = CSS.supports("height:100dvh") ? "100dvh" : "100vh";

				gsap
					.timeline()
					.to(icons[0], { autoAlpha: open ? 1 : 0, duration: 0.2 }, 0)
					.to(icons[1], { autoAlpha: open ? 0 : 1, duration: 0.2 }, 0)
					.to(
						drawer,
						{
							height: open ? fullH : 0,
							autoAlpha: open ? 1 : 0,
							display: open ? "block" : "none",
							duration: open ? 0.4 : 0.3,
							ease: open ? "power2.out" : "power2.in",
						},
						0
					);
			};
			btn.addEventListener("click", onBtn);

			nav.querySelectorAll("[data-toggle]").forEach((toggle) => {
				const key = toggle.dataset.toggle;
				const pane = nav.querySelector(`[data-details="${key}"]`);
				if (!pane) return;

				gsap.set(pane, { height: 0, autoAlpha: 0, overflow: "hidden" });

				const fn = (e) => {
					e.preventDefault();
					const isOpen = toggle.classList.toggle("is-open");
					toggle.querySelector(".nav_content-link-toggle")?.classList.toggle("is-open", isOpen);
					log("mobile accordion", key, isOpen ? "open" : "close");

					gsap.to(pane, {
						height: isOpen ? pane.scrollHeight : 0,
						autoAlpha: isOpen ? 1 : 0,
						duration: isOpen ? 0.4 : 0.3,
						ease: isOpen ? "power2.out" : "power2.in",
					});
				};

				toggle.addEventListener("click", fn);
				accordions.push({ toggle, fn });
			});

			/* cleanup */
			return () => {
				btn.removeEventListener("click", onBtn);
				accordions.forEach(({ toggle, fn }) => toggle.removeEventListener("click", fn));
				gsap.set(drawer, { height: 0, autoAlpha: 0 });
				nav.classList.remove("is-open");
				nav.style.removeProperty("height");
			};
		});
	};

	tyx.functions.magicModal = function () {
		const cards = document.querySelectorAll(".magic-card");
		const modals = document.querySelectorAll(".magic-modal");

		if (!cards.length || !modals.length) return;

		const mm = gsap.matchMedia();

		function openModal(modal) {
			gsap.set(modal, { pointerEvents: "auto" });
			gsap.to(modal, { autoAlpha: 1, duration: 0.3 });
			gsap.set(document.body, { overflow: "hidden" });
		}

		function closeModal(modal, enableScroll = false, delay = 0) {
			gsap.to(modal, { autoAlpha: 0, duration: 0.3, delay });
			gsap.set(modal, { pointerEvents: "none" });
			if (enableScroll) {
				gsap.set(document.body, { overflow: "auto" });
			}
		}

		mm.add("(max-width: 768px)", () => {
			cards.forEach((card, i) => {
				const modal = modals[i];
				if (!modal) return;

				const closeBtn = modal.querySelector(".magic-modal_close");
				const prevModal = modals[(i + cards.length - 1) % cards.length];
				const nextModal = modals[(i + 1) % cards.length];
				const prevBtn = modal.querySelector(".magic-modal_arrow.is-prev");
				const nextBtn = modal.querySelector(".magic-modal_arrow.is-next");

				gsap.set(modal, { autoAlpha: 0, display: "block", pointerEvents: "none" });

				card.addEventListener("click", () => {
					openModal(modal);
				});

				if (prevBtn && prevModal) {
					prevBtn.addEventListener("click", () => {
						openModal(prevModal);
						closeModal(modal, false, 0.3);
					});
				}

				if (nextBtn && nextModal) {
					nextBtn.addEventListener("click", () => {
						openModal(nextModal);
						closeModal(modal, false, 0.3);
					});
				}

				if (closeBtn) {
					closeBtn.addEventListener("click", () => {
						closeModal(modal, true);
					});
				}
			});

			// cleanup when leaving mobile view
			return () => {
				modals.forEach((modal) => {
					gsap.set(modal, { autoAlpha: 0, pointerEvents: "none" });
				});
				gsap.set(document.body, { overflow: "auto" });
			};
		});
	};


	tyx.helperFunctions.horizontalLoop = function (items, config) {
		let timeline;
		items = gsap.utils.toArray(items);
		config = config || {};
		gsap.context(() => {
			// use a context so that if this is called from within another context or a gsap.matchMedia(), we can perform proper cleanup like the "resize" event handler on the window
			let onChange = config.onChange,
				lastIndex = 0,
				tl = gsap.timeline({
					repeat: config.repeat,
					onUpdate:
						onChange &&
						function () {
							let i = tl.closestIndex();
							if (lastIndex !== i) {
								lastIndex = i;
								onChange(items[i], i);
							}
						},
					paused: config.paused,
					defaults: { ease: "none" },
					onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100),
				}),
				length = items.length,
				startX = items[0].offsetLeft,
				times = [],
				widths = [],
				spaceBefore = [],
				xPercents = [],
				curIndex = 0,
				indexIsDirty = false,
				center = config.center,
				pixelsPerSecond = (config.speed || 1) * 100,
				snap = config.snap === false ? (v) => v : gsap.utils.snap(config.snap || 1), // some browsers shift by a pixel to accommodate flex layouts, so for example if width is 20% the first element's width might be 242px, and the next 243px, alternating back and forth. So we snap to 5 percentage points to make things look more natural
				timeOffset = 0,
				container =
					center === true
						? items[0].parentNode
						: gsap.utils.toArray(center)[0] || items[0].parentNode,
				totalWidth,
				getTotalWidth = () =>
					items[length - 1].offsetLeft +
					(xPercents[length - 1] / 100) * widths[length - 1] -
					startX +
					spaceBefore[0] +
					items[length - 1].offsetWidth * gsap.getProperty(items[length - 1], "scaleX") +
					(parseFloat(config.paddingRight) || 0),
				populateWidths = () => {
					let b1 = container.getBoundingClientRect(),
						b2;

					// Reset all items to their natural position first
					gsap.set(items, {
						x: 0,
						xPercent: 0,
						clearProps: "transform",
					});

					// Force a reflow
					items[0].offsetWidth;

					// Get the container's new position after reset
					startX = items[0].offsetLeft;

					items.forEach((el, i) => {
						// Get the natural width without any transforms
						widths[i] = el.offsetWidth;

						// Calculate the space between items
						b2 = el.getBoundingClientRect();
						spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
						b1 = b2;

						// Reset xPercent to 0 for accurate calculations
						xPercents[i] = 0;
					});

					// Set all items to their calculated positions
					gsap.set(items, {
						xPercent: (i) => xPercents[i],
					});

					// Calculate total width after all items are positioned
					totalWidth = getTotalWidth();
				},
				timeWrap,
				populateOffsets = () => {
					timeOffset = center ? (tl.duration() * (container.offsetWidth / 2)) / totalWidth : 0;
					center &&
						times.forEach((t, i) => {
							times[i] = timeWrap(
								tl.labels["label" + i] + (tl.duration() * widths[i]) / 2 / totalWidth - timeOffset
							);
						});
				},
				getClosest = (values, value, wrap) => {
					let i = values.length,
						closest = 1e10,
						index = 0,
						d;
					while (i--) {
						d = Math.abs(values[i] - value);
						if (d > wrap / 2) {
							d = wrap - d;
						}
						if (d < closest) {
							closest = d;
							index = i;
						}
					}
					return index;
				},
				populateTimeline = () => {
					let i, item, curX, distanceToStart, distanceToLoop;
					tl.clear();
					for (i = 0; i < length; i++) {
						item = items[i];
						curX = (xPercents[i] / 100) * widths[i];
						distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
						distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
						tl.to(
							item,
							{
								xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100),
								duration: distanceToLoop / pixelsPerSecond,
							},
							0
						)
							.fromTo(
								item,
								{
									xPercent: snap(((curX - distanceToLoop + totalWidth) / widths[i]) * 100),
								},
								{
									xPercent: xPercents[i],
									duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond,
									immediateRender: false,
								},
								distanceToLoop / pixelsPerSecond
							)
							.add("label" + i, distanceToStart / pixelsPerSecond);
						times[i] = distanceToStart / pixelsPerSecond;
					}
					timeWrap = gsap.utils.wrap(0, tl.duration());
				},
				refresh = (deep) => {
					let progress = tl.progress();
					tl.progress(0, true);

					// Reset only the x transforms while preserving other properties
					gsap.set(items, {
						x: 0,
						xPercent: 0,
					});

					// Force a reflow
					items[0].offsetWidth;

					populateWidths();
					deep && populateTimeline();
					populateOffsets();

					if (deep && tl.draggable && tl.paused()) {
						tl.time(times[curIndex], true);
					} else {
						tl.progress(progress, true);
					}
				},
				onResize = () => {
					if (window.resizeTimeout) clearTimeout(window.resizeTimeout);
					window.resizeTimeout = setTimeout(() => {
						refresh(true);
					}, 100);
				},
				proxy;
			gsap.set(items, { x: 0 });
			populateWidths();
			populateTimeline();
			populateOffsets();
			window.addEventListener("resize", onResize);
			function toIndex(index, vars) {
				vars = vars || {};
				Math.abs(index - curIndex) > length / 2 && (index += index > curIndex ? -length : length); // always go in the shortest direction
				let newIndex = gsap.utils.wrap(0, length, index),
					time = times[newIndex];
				if (time > tl.time() !== index > curIndex && index !== curIndex) {
					// if we're wrapping the timeline's playhead, make the proper adjustments
					time += tl.duration() * (index > curIndex ? 1 : -1);
				}
				if (time < 0 || time > tl.duration()) {
					vars.modifiers = { time: timeWrap };
				}
				curIndex = newIndex;
				vars.overwrite = true;
				gsap.killTweensOf(proxy);
				return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars);
			}
			tl.toIndex = (index, vars) => toIndex(index, vars);
			tl.closestIndex = (setCurrent) => {
				let index = getClosest(times, tl.time(), tl.duration());
				if (setCurrent) {
					curIndex = index;
					indexIsDirty = false;
				}
				return index;
			};
			tl.current = () => (indexIsDirty ? tl.closestIndex(true) : curIndex);
			tl.next = (vars) => toIndex(tl.current() + 1, vars);
			tl.previous = (vars) => toIndex(tl.current() - 1, vars);
			tl.times = times;
			tl.progress(1, true).progress(0, true); // pre-render for performance
			if (config.reversed) {
				tl.vars.onReverseComplete();
				tl.reverse();
			}
			if (config.draggable && typeof Draggable === "function") {
				proxy = document.createElement("div");
				let wrap = gsap.utils.wrap(0, 1),
					ratio,
					startProgress,
					draggable,
					dragSnap,
					lastSnap,
					initChangeX,
					wasPlaying,
					align = () => tl.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio)),
					syncIndex = () => tl.closestIndex(true);
				typeof InertiaPlugin === "undefined" &&
					console.warn(
						"InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club"
					);
				draggable = Draggable.create(proxy, {
					trigger: items[0].parentNode,
					type: "x",
					onPressInit() {
						let x = this.x;
						gsap.killTweensOf(tl);
						wasPlaying = !tl.paused();
						tl.pause();
						startProgress = tl.progress();
						refresh();
						ratio = 1 / totalWidth;
						initChangeX = startProgress / -ratio - x;
						gsap.set(proxy, { x: startProgress / -ratio });
					},
					onDrag: align,
					onThrowUpdate: align,
					overshootTolerance: 0,
					inertia: true,
					...config.draggableOptions,
					snap(value) {
						//note: if the user presses and releases in the middle of a throw, due to the sudden correction of proxy.x in the onPressInit(), the velocity could be very large, throwing off the snap. So sense that condition and adjust for it. We also need to set overshootTolerance to 0 to prevent the inertia from causing it to shoot past and come back
						if (Math.abs(startProgress / -ratio - this.x) < 10) {
							return lastSnap + initChangeX;
						}
						let time = -(value * ratio) * tl.duration(),
							wrappedTime = timeWrap(time),
							snapTime = times[getClosest(times, wrappedTime, tl.duration())],
							dif = snapTime - wrappedTime;
						Math.abs(dif) > tl.duration() / 2 && (dif += dif < 0 ? tl.duration() : -tl.duration());
						lastSnap = (time + dif) / tl.duration() / -ratio;
						return lastSnap;
					},
					onRelease() {
						syncIndex();
						draggable.isThrowing && (indexIsDirty = true);
					},
					onThrowComplete: () => {
						syncIndex();
						align;
						gsap.delayedCall(0.01, () => tl.play());
					},
				})[0];
				tl.draggable = draggable;
			}
			tl.closestIndex(true);
			lastIndex = curIndex;
			onChange && onChange(items[curIndex], curIndex);

			tl.refresh = refresh; // expose refresh() method

			timeline = tl;
			return () => window.removeEventListener("resize", onResize); // cleanup
		});

		return timeline;
	};

	tyx.functions.chaosMarqueeV2 = function () {
		const wrapper = document.querySelector(".chaos-marquee-v2_track");
		if (!wrapper) return;
		const slides = [...wrapper.querySelector(".chaos-marquee-v2_content").children];
		if (!slides.length) return;

		const mm = gsap.matchMedia();
		const breakpoint = tyx.breakpoints.tab;
		let loop;

		mm.add(
			{
				isDesktop: `(min-width: ${breakpoint}px)`,
				isMobile: `(max-width: ${breakpoint - 1}px)`,
				reduceMotion: "(prefers-reduced-motion: reduce)",
			},
			(context) => {
				let { isDesktop, isMobile, reduceMotion } = context.conditions;

				if (reduceMotion) {
					return () => { }; // Skip slider entirely
				}

				// Clean up old loop if re-init (in case of breakpoint change)
				if (loop && typeof loop.kill === "function") loop.kill();

				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						loop = tyx.helperFunctions.horizontalLoop(slides, {
							draggable: true,
							draggableOptions: {
								dragResistance: isDesktop ? 0.75 : 0.25, // 0 to 1
								// add some speed limits
								minDuration: isDesktop ? 0.3 : 0.1,
								maxDuration: isDesktop ? 1.2 : 1.2,
							},
							speed: isDesktop ? 1.2 : 0.6,
							center: true,
							onChange: (element, index) => { },
						});
						loop.refresh(true);

						if (!isMobile) {
							loop.play();
						}
					});
				});

				// Return a cleanup function for breakpoint switch
				return () => {
					if (loop && typeof loop.kill === "function") {
						loop.kill();
					}
					console.log("killing loop");
				};
			}
		);

		// detect visibility changes and force resync
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible" && loop) {
				loop.pause(0); // force a playhead reset to be safe
				loop.progress(1, true).progress(0, true); // pre-render
				requestAnimationFrame(() => loop.play());
			}
		});
	};

	tyx.functions.homeHero();
	tyx.functions.changeIntroColors();
	tyx.functions.handleVideos();
	tyx.functions.counter();
	tyx.functions.serviceCard();
	tyx.functions.chaosMarquee();
	tyx.functions.process();

	tyx.functions.benefits();

	tyx.functions.textAnim();
	tyx.functions.sticky5050();
	tyx.functions.serviceHero();
	tyx.functions.visualiser();
	tyx.functions.faq();
	tyx.functions.testimonials();
	tyx.functions.magicCarousel();
	tyx.functions.largeSlider();
	tyx.functions.teamSlider();
	tyx.functions.fancyHero();
	tyx.functions.nav();
	tyx.functions.magicModal();
	//tyx.functions.chaosMarqueeV2();

	// parallax functions need to be called at end once GSAP has moved things around, otherwise heights are off - especially benefits()
	ScrollTrigger.refresh();

	tyx.functions.parallax();
	tyx.functions.parallaxBasic();

	// Initialize the randomText function after fonts are loaded
	document.fonts.ready.then(function () {
		gsap.set(".anim-in", { autoAlpha: 1 });
		tyx.functions.randomText();
		// tyx.functions.counter();
	});
}
