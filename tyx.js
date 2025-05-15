function main() {
	gsap.registerPlugin(SplitText, ScrollTrigger, Flip);
	tyx.breakpoints = {
		dsk: 992,
		tab: 768,
		mbl: 480,
	};

	tyx.functions.randomText = function () {
		let mm = gsap.matchMedia();

		// only do this on desktop
		mm.add("(min-width: 767px)", () => {
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

			return () => {};
		});
	};
	tyx.functions.homeHero = function () {
		const mediaElem = document.querySelector(".home-hero_media-wrap");
		const scrollTargetDsk = document.querySelector(".scroll-target-dsk");
		const scrollTargetMbl = document.querySelector(".scroll-target-mbl");
		const sizeTargetDsk = document.querySelector(".size-target-dsk");
		if (!mediaElem || !scrollTargetDsk || !scrollTargetMbl) {
			console.error("[Hero Animation] Missing required elements.");
			return;
		}

		// Clear any existing ScrollTriggers on this element
		ScrollTrigger.getAll().forEach((trigger) => {
			if (trigger.pin === mediaElem) trigger.kill();
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
					gsap.set(mediaElem, {
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
							pin: mediaElem,
							pinSpacing: true,
							onUpdate: function (self) {
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
							onLeaveBack: function () {
								gsap.set(mediaElem, {
									clearProps: "position, top, left, xPercent, yPercent, transformOrigin",
								});
							},
						},
					})
					.to(mediaElem, {
						scale: scaleFactor,
						left: 0,
						ease: "power2.out",
					})
					.to(
						[".home-hero_content", ".home-hero_video-overlay"],
						{
							opacity: 0,
							ease: "power2.out",
						},
						"<"
					);
			}
		);
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
					nextEl: ".splide__arrow",
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
		});
	};
	tyx.functions.changeIntroColors = function () {
		if (!document.querySelector(".s-home-intro")) return;
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: ".s-home-intro",
				start: "bottom 60%",
				// end: "bottom-=400 top",
				toggleActions: "play none none reverse",
			},
			defaults: {
				duration: 1,
				ease: "power1.inOut",
			},
		});
		tl.to(
			[".s-home-intro .section-bg-neg", ".s-home-stats"],
			{
				// color: "white",
				backgroundColor: "var(--_color---grey--dark-2)",
				"--_theme---body": "white",
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

	tyx.functions.teamSlider = function () {
		var check = document.querySelector(".s-team .splide");
		if (!check) return;
		var splide = new Splide(".s-team .splide", {
			type: "loop",
			autoplay: false,
			autoScroll: {
				speed: 1,
			},
			arrows: false,
			trimSpace: "move",
			pagination: false,
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
			gsap.set(steps, { yPercent: 200, autoAlpha: 0 });

			// Create a timeline for the animation
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top 60%",
					end: "bottom 80%",
					scrub: true,
					once: true,
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
					start: "bottom 95%",
					end: "bottom 40%",
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

	tyx.functions.fancyHero = function () {
		const sections = document.querySelectorAll(".hero.is-fancy");
		if (!sections.length) return;

		let scrollTriggerOptions = {};

		sections.forEach((section) => {
			const media = section.querySelector(".media");
			if (!media) return;

			scrollTriggerOptions = {
				trigger: section,
				start: "bottom 97%",
				scrub: false,
				// markers: true,
				toggleActions: "play none none reverse",
			};

			gsap.set(media, { transformOrigin: "50% 75%" });

			let q = gsap.utils.selector(".hero_split-h1");

			const tl = gsap.timeline({
				scrollTrigger: {
					...scrollTriggerOptions,
				},
			});
			tl.set(media, { autoAlpha: 1 }); // CSS hides media to avoid FOUC
			tl.to(
				q(":nth-child(even)"),
				{
					translateX: "-80vw",
					duration: 1.5,
					ease: "power3.out",
				},
				"0.05"
			);
			tl.to(
				q(":nth-child(odd)"),
				{
					translateX: "80vw",
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
			tl.from(
				media,
				{ scale: 0.5, yPercent: 100, duration: 1.5, ease: "power3.out" },

				"0"
			);
		});
	};

	/* ---------------------------------------------------------------------------
 TYX Nav – hover-driven desktop, click-driven mobile
--------------------------------------------------------------------------- */
	tyx.functions.nav = function () {
		console.log("🌟 TYX nav script booted");
		console.log("📄 DOMContentLoaded → initialise nav");

		// gsap.registerPlugin(ScrollTrigger);

		const nav = document.querySelector(".nav");
		if (!nav) {
			console.error("❌ .nav element not found");
			return;
		}

		/* ── 1) hide/show on scroll past 50 vh ──────────────────────────────────── */
		ScrollTrigger.create({
			trigger: document.body,
			start: "top top",
			end: "bottom bottom",
			onUpdate(self) {
				const past = self.scroll() > window.innerHeight * 0.5;
				nav.classList.toggle("is-past-threshold", past);

				if (!past) {
					nav.classList.remove("is-hidden"); // always show above threshold
				} else {
					nav.classList.toggle("is-hidden", self.direction === 1); // hide ↓, show ↑
				}
			},
		});

		/* ── 2) desktop vs mobile panels/drawer ─────────────────────────────────── */
		const mm = gsap.matchMedia();

		/* ===== DESKTOP – HOVER =================================================== */
		mm.add("(min-width: 992px)", () => {
			console.log("🔵 Enter DESKTOP (hover version)");

			const bar = nav.querySelector(".nav_bar");
			const barH = bar ? bar.offsetHeight : 0;
			let current = null; // currently-open <a>

			const panels = new Map(); // <a> ➜ matching .nav_content
			const handlers = new Map(); // <a> ➜ listener fn (for cleanup)

			/* ---------- helper to close everything -------------------------------- */
			function closeAll() {
				if (!current) return;

				const pane = panels.get(current);
				gsap.killTweensOf(pane); // stop any running tween
				gsap.set(pane, { autoAlpha: 0, pointerEvents: "none" });
				gsap.to(nav, { height: barH, duration: 0.35 });

				current.classList.remove("is-active", "is-open");
				nav.classList.remove("is-open");
				current = null;
			}

			/* ---------- set up every .nav_link ------------------------------------ */
			nav.querySelectorAll(".nav_link").forEach((link) => {
				/* work out panel name from data-attr or helper class */
				const name =
					link.dataset.panel || [...link.classList].find((c) => c.startsWith("is-"))?.slice(3);

				const pane = nav.querySelector(`.nav_content.is-${name}`);

				/* CASE 1 – link HAS a corresponding panel -------------------------- */
				if (pane) {
					panels.set(link, pane);
					gsap.set(pane, { autoAlpha: 0, pointerEvents: "none" });

					const openPane = (e) => {
						e.preventDefault(); // keep behaviour uniform
						if (current === link) return; // already open

						/* close previous */
						if (current) {
							const prevPane = panels.get(current);
							gsap.killTweensOf(prevPane);
							gsap.set(prevPane, { autoAlpha: 0, pointerEvents: "none" });
							current.classList.remove("is-active", "is-open");
						}

						/* open new */
						const targetH = barH + pane.scrollHeight;
						gsap.set(pane, { autoAlpha: 0, pointerEvents: "auto" });
						gsap.to(nav, { height: targetH, duration: 0.35 });
						gsap.to(pane, { autoAlpha: 1, duration: 0.25, delay: 0.1 });

						link.classList.add("is-active", "is-open");
						nav.classList.add("is-open");
						current = link;
					};

					link.addEventListener("mouseenter", openPane);
					link.addEventListener("focus", openPane); // keyboard a11y
					handlers.set(link, openPane);
					return; // ← done for a “panel” link
				}

				/* CASE 2 – link HAS NO panel → just close everything --------------- */
				const closeOnEnter = () => closeAll();
				link.addEventListener("mouseenter", closeOnEnter);
				link.addEventListener("focus", closeOnEnter);
				handlers.set(link, closeOnEnter);
			});

			/* close when pointer leaves whole nav, or focus moves out -------------- */
			nav.addEventListener("mouseleave", closeAll);
			nav.addEventListener("focusout", (e) => {
				if (!nav.contains(e.relatedTarget)) closeAll();
			});

			/* ---------- CLEAN-UP when media query changes ------------------------- */
			return () => {
				console.log("🔵 Exit DESKTOP (hover version)");
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

		/* ===== MOBILE – click-driven drawer ===================================== */
		mm.add("(max-width: 991px)", () => {
			console.log("🟢 Enter MOBILE");

			const btn = nav.querySelector(".nav_mob-icon");
			const icons = btn.querySelectorAll(".nav_mob-icon-svg");
			const drawer = nav.querySelector(".nav_mob-content");
			let open = false;
			const accordions = [];

			/* initial state */
			gsap.set(icons[0], { autoAlpha: 0 });
			gsap.set(drawer, { height: 0, autoAlpha: 0 });

			/* hamburger → drawer */
			const onBtn = () => {
				open = !open;
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

			/* sub-menu accordions */
			nav.querySelectorAll("[data-toggle]").forEach((toggle) => {
				const key = toggle.dataset.toggle;
				const pane = nav.querySelector(`[data-details="${key}"]`);
				if (!pane) return;

				gsap.set(pane, { height: 0, autoAlpha: 0, overflow: "hidden" });

				const fn = (e) => {
					e.preventDefault();
					const isOpen = toggle.classList.toggle("is-open");
					toggle.querySelector(".nav_content-link-toggle")?.classList.toggle("is-open", isOpen);

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

			/* ---------- CLEAN-UP for mobile variant ------------------------------- */
			return () => {
				console.log("🟢 Exit MOBILE");
				btn.removeEventListener("click", onBtn);
				accordions.forEach(({ toggle, fn }) => toggle.removeEventListener("click", fn));
				gsap.set(drawer, { height: 0, autoAlpha: 0 });
				nav.classList.remove("is-open");
				nav.style.removeProperty("height");
			};
		});

		console.log("✅ Nav script fully initialised after DOM ready");
	};

	tyx.functions.magicModal = function () {
		//check we have some .magic-card elements
		const cards = document.querySelectorAll(".magic-card");
		if (!cards.length) return;

		const modals = document.querySelectorAll(".magic-modal");
		if (!modals.length) return;

		const mm = gsap.matchMedia();

		/* for each card, we have a hidden .magic-modal element. On click of the relevant button on each card:
		- open the modal
		- disable scroll on the body
		
		And on click of the close button:
		- close the modal
		- enable scroll on the body
		*/

		mm.add("(max-width: 768px)", () => {
			cards.forEach((card, i) => {
				const btn = card.querySelector(".magic-card_btn");
				const modal = modals[i];
				// const modal = card.querySelector(".magic-modal");
				const closeBtn = modal.querySelector(".magic-modal_close");

				if (!btn || !modal || !closeBtn) return;

				btn.addEventListener("click", function () {
					// modal.classList.add("is-open");
					// document.body.classList.add("is-modal-open");
					gsap.set(modal, { display: "block" });
					gsap.set(document.body, { overflow: "hidden" });
					// gsap.set(modal, { pointerEvents: "auto" });
				});

				closeBtn.addEventListener("click", function () {
					// modal.classList.remove("is-open");
					// document.body.classList.remove("is-modal-open");
					gsap.set(modal, { display: "none" });
					gsap.set(document.body, { overflow: "auto" });
					// gsap.set(modal, { pointerEvents: "none" });
				});
			});
			return () => {
				gsap.set(modals, { display: "none" });
				gsap.set(document.body, { overflow: "auto" });
			};
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

	// Initialize the randomText function after fonts are loaded
	document.fonts.ready.then(function () {
		gsap.set(".anim-in", { autoAlpha: 1 });
		tyx.functions.randomText();
		tyx.functions.counter();
	});
}
