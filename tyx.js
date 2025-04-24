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

	// Initialize the homeHero function
	tyx.functions.homeHero();

	// Initialize the randomText function after fonts are loaded
	document.fonts.ready.then(function () {
		gsap.set(".anim-in", { autoAlpha: 1 });
		tyx.functions.randomText();
	});
}
