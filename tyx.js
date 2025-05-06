function main() {
	gsap.registerPlugin(SplitText, ScrollTrigger, Flip);
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
							// markers: true,
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

	tyx.functions.benefits = function () {
		var check = document.querySelector(".benefit-card");
		if (!check) return;

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
	};

	tyx.functions.testimonials = function () {
		var check = document.querySelector(".testimonial-card");
		if (!check) return;

		var splide = new Splide(".s-testimonials .splide", {
			type: "slide",
			autoplay: false,
			arrows: false,
			trimSpace: "move",
			pagination: false,
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

	tyx.functions.process = function () {
		const sections = document.querySelectorAll(".s-process");
		if (!sections) return;

		sections.forEach((section) => {
			const steps = section.querySelectorAll(".process-step");
			if (!steps) return;

			// Set initial state
			gsap.set(steps, { yPercent: 200, autoAlpha: 0 });

			// Create a timeline for the animation
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top 60%",
					end: "bottom 80%",
					scrub: true,
				},
			});

			tl.to(steps, {
				yPercent: 0,
				autoAlpha: 1,
				stagger: 0.3,
				duration: 0.3,
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

	tyx.functions.textAnim = function () {
		const fromColor = "#696969";
		const toColor = "#ffffff";

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
					{ color: fromColor },
					{
						color: toColor,
						duration: 4,
						ease: "cubic.out",
						stagger: { each: 0.4 },
					}
				);
		});
	};

	tyx.functions.swiped5050 = function () {
		const sections = document.querySelectorAll(".s-swiped-5050");
		if (!sections) return;
		const mediaElements = document.querySelectorAll(".swiped-5050_media");
		const mediaClass = ".swiped-5050_media";

		const firstSection = sections[0];
		const firstMedia = mediaElements[0];

		const lastSection = sections[sections.length - 1];
		const lastMedia = mediaElements[mediaElements.length - 1];

		sections.forEach((section, i) => {
			const media = section.querySelector(mediaClass);

			// Pin the media element
			ScrollTrigger.create({
				trigger: media,
				start: "center center",
				endTrigger: lastMedia,
				end: "center center",
				pin: media,
				pinSpacing: false,
			});

			// // Transition to next image (if one exists)
			// const next = sections[i + 1];
			// if (next) {
			// 	const nextMedia = next.querySelector(mediaClass);
			// 	gsap.fromTo(
			// 		nextMedia,
			// 		{
			// 			clipPath: "inset(100% 0% 0% 0%)",
			// 		},
			// 		{
			// 			clipPath: "inset(0% 0% 0% 0%)",
			// 			scrollTrigger: {
			// 				trigger: next,
			// 				start: "top bottom",
			// 				end: "top center",
			// 				scrub: true,
			// 			},
			// 		}
			// 	);
			// }
		});
	};

	tyx.functions.serviceHero = function () {
		const sections = document.querySelectorAll(".s-service-hero");
		if (!sections) return;

		sections.forEach((section) => {
			const heading = section.querySelector(".service-hero_heading");
			const bg = section.querySelector(".service-hero_bg");

			gsap.set(heading, { yPercent: 200 });

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
					start: "bottom 80%",
					end: "bottom top",
					scrub: true,
				},
			});
			// fade out bg
			bg_tl.to(bg, {
				opacity: 0,
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
				time += 0.01;
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

		console.log("faq");

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

	tyx.functions.homeHero();
	tyx.functions.changeIntroColors();
	tyx.functions.playVideosOnHover();
	// tyx.functions.magicCard();
	tyx.functions.serviceCard();
	tyx.functions.chaosMarquee();
	tyx.functions.process();
	tyx.functions.parallax();
	tyx.functions.benefits();
	tyx.functions.textAnim();
	tyx.functions.swiped5050();
	tyx.functions.serviceHero();
	tyx.functions.visualiser();
	tyx.functions.faq();
	tyx.functions.testimonials();

	// Initialize the randomText function after fonts are loaded
	document.fonts.ready.then(function () {
		gsap.set(".anim-in", { autoAlpha: 1 });
		tyx.functions.randomText();
		tyx.functions.counter();
	});
}
