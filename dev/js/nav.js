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
	// const MAIN_THRESHOLD = 0.5; // 50 vh
	const SUB_THRESHOLD = 1.0; // 100 vh

	/* Thresholds */
	const hideThreshold = 100; // Distance to scroll before hiding is allowed
	const showThreshold = 50; // Distance from the top where the nav is always shown
	const revealBuffer = 50; // Buffer distance for revealing on scroll up

	let lastScrollY = window.scrollY;
	let scrollBuffer = 0;

	// state flags
	let subnavOpen = false;
	let subnavVisible = false;

	/* ─────────────────────── 1) MAIN NAV show / hide ──────────────────────── */
	ScrollTrigger.create({
		trigger: document.body,
		start: "top top",
		end: "bottom bottom",
		onUpdate: (self) => {
			if (subnavVisible) {
				// If the subnav is visible, keep the main nav hidden
				nav.classList.add("is-hidden");
				return;
			}

			const currentScrollY = window.scrollY;
			const deltaY = currentScrollY - lastScrollY;

			if (currentScrollY <= showThreshold) {
				// Always show nav near the top
				nav.classList.remove("is-hidden", "is-past-threshold");
				scrollBuffer = 0;
			} else if (deltaY > 0 && currentScrollY > hideThreshold) {
				// Hide nav when scrolling down past the hideThreshold
				nav.classList.add("is-hidden", "is-past-threshold");
				scrollBuffer = 0;
			} else if (deltaY < 0) {
				// Reveal nav when scrolling up
				scrollBuffer -= deltaY;
				if (scrollBuffer >= revealBuffer) {
					nav.classList.remove("is-hidden");
					scrollBuffer = 0;
				}
			}

			// Add or remove the is-past-threshold class based on scroll position
			if (currentScrollY > hideThreshold) {
				nav.classList.add("is-past-threshold");
			} else {
				nav.classList.remove("is-past-threshold");
			}

			lastScrollY = currentScrollY; // Update last scroll position
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
				subnavVisible = true;
				nav.classList.add("is-hidden"); // keep main nav hidden
			},
			/* leave zone back upward → close */
			onLeaveBack() {
				log("subnav → close");
				subnav.classList.remove("is-open");
				subnavVisible = false;
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
						// update state flag
						subnavOpen = true;
						// hide main nav
						nav.classList.add("is-hidden");
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
						subnavOpen = false;
						// Show main nav again when subnav closes
						nav.classList.remove("is-hidden");
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

			// Add or remove the no-scroll class on the body
			document.body.classList.toggle("no-scroll", open);

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
			document.body.classList.remove("no-scroll"); // Ensure no-scroll is removed on cleanup
			nav.style.removeProperty("height");
		};
	});
};
