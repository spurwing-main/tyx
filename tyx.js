function main() {
	gsap.registerPlugin(SplitText, ScrollTrigger);
	tyx.breakpoints = {
		dsk: 992,
		tab: 768,
		mbl: 480,
	};

	tyx.functions.randomText = function () {
		document.querySelectorAll(".home-hero_header h1").forEach((el) => {
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
	};
	tyx.functions.homeHero = function () {
		const videoElem = document.querySelector(".home-hero_video");
		const scrollTargetDsk = document.querySelector(".scroll-target-dsk");
		const scrollTargetMbl = document.querySelector(".scroll-target-mbl");
		const sizeTargetDsk = document.querySelector(".size-target-dsk");
		if (!videoElem || !scrollTargetDsk || !scrollTargetMbl) {
			console.error("[Hero Animation] Missing required elements.");
			return;
		}

		// Clear any existing ScrollTriggers on this element
		ScrollTrigger.getAll().forEach((trigger) => {
			if (trigger.pin === videoElem) trigger.kill();
		});

		const mm = gsap.matchMedia();
		mm.add(
			{
				// set up any number of arbitrarily-named conditions. The function below will be called when ANY of them match.
				isDesktop: `(min-width: ${tyx.breakpoints.tab}px)`,
				isMobile: `(max-width: ${tyx.breakpoints.tab - 1}px)`,
				//   reduceMotion: "(prefers-reduced-motion: reduce)",
			},
			(context) => {
				let { isDesktop, isMobile } = context.conditions;
				const scrollTarget = isDesktop ? scrollTargetDsk : scrollTargetMbl;

				const windowWidth = window.innerWidth;
				// const desiredWidth = scrollTarget.offsetWidth / 2 - 32;
				const desiredWidth = sizeTargetDsk.offsetWidth;

				const scaleFactor =
					isDesktop && windowWidth >= desiredWidth ? desiredWidth / windowWidth : 0.5;

				const transformOriginX = (scrollTargetDsk.offsetLeft / windowWidth) * 100;
				if (isDesktop) {
					gsap.set(videoElem, {
						transformOrigin: `${transformOriginX}% 50%`,
					});
				}

				gsap
					.timeline({
						scrollTrigger: {
							trigger: ".s-home-hero",
							start: "top top",
							end: "center center",
							endTrigger: scrollTarget,
							scrub: true,
							markers: true,
							pin: videoElem,
							pinSpacing: true,
							onUpdate: function (self) {
								if (self.progress === 1) {
									gsap.set(videoElem, {
										position: "relative",
										top: "auto",
										left: "auto",
										xPercent: 0,
										yPercent: 0,
									});
								}
							},
							onLeaveBack: function () {
								gsap.set(videoElem, {
									clearProps: "position, top, left, xPercent, yPercent, transformOrigin",
								});
							},
						},
					})
					.to(videoElem, {
						scale: scaleFactor,
						left: 0,
						ease: "power2.out",
					})
					.to(
						".home-hero_content",
						{
							opacity: 0,
							ease: "power2.out",
						},
						"<"
					);
			}
		);
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
		});
	};
	tyx.functions.changeIntroColors = function () {
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: ".s-home-intro",
				start: "center center",
				end: "bottom-=400 top",
				toggleActions: "play none none reverse",
			},
			defaults: {
				duration: 0.35,
				ease: "power1.inOut",
			},
		});
		tl.to(
			[".s-home-intro, .s-home-stats"],
			{
				color: "white",
				backgroundColor: "black",
				"--_theme---body": "white",
			},
			0
		);
		tl.to(
			[".label"],
			{
				color: "white",
			},
			0
		);
	};
	tyx.functions.playVideosOnHover = function () {
		const triggers = document.querySelectorAll(".video-hover-trigger");
		triggers.forEach((trigger) => {
			const video = trigger.querySelector("video");
			if (!video) return;

			var isPlaying = false;

			video.onplaying = function () {
				isPlaying = true;
				console.log("change to playing");
			};
			video.onpause = function () {
				isPlaying = false;
				console.log("change to pause");
			};
			trigger.addEventListener("mouseenter", function () {
				playVid(video, isPlaying);
			});
			trigger.addEventListener("mouseleave", function () {
				pauseVid(video, isPlaying);
			});
		});

		// Play video function
		async function playVid(video, isPlaying) {
			if (video.paused && !isPlaying) {
				console.log("play");
				return video.play();
			}
		}

		// Pause video function
		function pauseVid(video, isPlaying) {
			if (!video.paused && isPlaying) {
				console.log("pause");
				video.pause();
			}
		}
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
				gsap.set(".home-service-card_bottom", { height: auto });
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
		// Updates the bar width whenever the carousel moves:
		splide.on("mounted move", function () {
			var end = splide.Components.Controller.getEnd() + 1;
			var rate = Math.min((splide.index + 1) / end, 1);
			bar.style.width = String(100 * rate) + "%";
		});
		splide.mount();
	};

	tyx.functions.chaosMarquee = function () {
		// duplicate marquee content element
		const marqueeContent = document.querySelector(".chaos-marquee_content");
		if (!marqueeContent) return;
		const marqueeContentClone = marqueeContent.cloneNode(true);
		marqueeContent.parentNode.appendChild(marqueeContentClone);
	};

	gsap.registerPlugin(Flip);

	tyx.functions.homeHero();
	tyx.functions.changeIntroColors();
	tyx.functions.playVideosOnHover();
	// tyx.functions.magicCard();
	tyx.functions.serviceCard();
	tyx.functions.chaosMarquee();

	// Initialize the randomText function after fonts are loaded
	document.fonts.ready.then(function () {
		gsap.set(".anim-in", { autoAlpha: 1 });
		tyx.functions.randomText();
		tyx.functions.counter();
	});
}
