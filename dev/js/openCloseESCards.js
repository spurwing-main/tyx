//  ELEMENTS & STATE
let es = {};

const logging = true;

const list = document.querySelector(".es_list");
const container = list.closest(".container");
const cards = Array.from(list.querySelectorAll(".es-card"));
const btnPrev = document.querySelector(".es_arrow.is-prev");
const btnNext = document.querySelector(".es_arrow.is-next");
const progressBar = document.querySelector(".es_progress-bar");
const gap = 32;
let drag;
let currentIndex = 0;
let snapPoints_closed,
	snapPoints_open = [];
let expanded = false; // track if cards are expanded or not
let openCardIndex = null;
// let bounds = { minX: 0, maxX: 0 };
let collapsedWidthVar = "--es--w-collapsed"; // CSS variable for collapsed width
let expandedWidthVar = "--es--w-expanded"; // CSS variable for expanded width
let expandedDetailWidthVar = "--es--detail-w-expanded"; // CSS variable for expanded detail width
const mm_value = "(max-width: 768px)"; // media query for mobile
let maxWidth, containerWidth;
let expandedWidth = getExpandedWidth();
let collapsedWidth = getRemVarInPx(collapsedWidthVar);
let isMobile = window.matchMedia(mm_value).matches; // also updated on resize
let progress = 0,
	progressBarTL = initProgressBarTL(),
	progressSetter = progressBarQuickSet();
let totalWidth_closed,
	totalWidth_open = 0; // store the total width of cards in closed and open states and update on resize
let bounds_closed, bounds_open;

const modals = Array.from(document.querySelectorAll(".es-modal"));
const modalOpenDuration = 0.5; // duration for modal open/close animations
let isAnyModalOpen = false; // state to check if a modal is open

const cardTimelines = new Map(); // timelines for each card

function updateSliderState() {
	// if slider not progressed beyond first card
	if (currentIndex == 0) {
		list.setAttribute("es-progress", "start");
	}
	// if slider in progress but not at end
	else if (currentIndex < snapPoints_closed.length - 1) {
		list.setAttribute("es-progress", "incomplete");
	}
	// if slider at last card
	else if (currentIndex == snapPoints_closed.length - 1) {
		list.setAttribute("es-progress", "end");
	}
}

function updateProgressBar() {
	// update progress from GSAP Draggable
	progress = drag.x / drag.minX;

	// round progress to 0 or 1 if we are very close
	if (Math.abs(progress) < 0.01) {
		progress = 0;
	} else if (Math.abs(progress - 1) < 0.01) {
		progress = 1;
	}

	// update where we are in the progress bar's animation. Slight duration lets us smooth out any jumps when cards open/close
	progressSetter(progress);
}

function initProgressBarTL() {
	const tl = gsap
		.timeline({
			paused: true,
		})
		.from(progressBar, { scaleX: 0, ease: "none", duration: 2 });
	gsap.set(progressBar, { transformOrigin: "0% 50%" });
	return tl;
}

function progressBarQuickSet() {
	// create a quickTo for ease
	const setter = gsap.utils.pipe(
		gsap.utils.clamp(0, 1), //make sure the number is between 0 and 1
		gsap.utils.snap(0.01), //snap to the closest increment of 0.01
		gsap.quickTo(progressBarTL, "progress", {
			duration: 0.05,
			ease: "none",
		})
	);
	return setter;
}

// Open/close card animations and timeline setup
function openCloseESCards() {
	cards.forEach((card, idx) => {
		const detail = card.querySelector(".es-card_detail");
		const contentHidden = card.querySelector(".es-card_content-hidden");
		const icon = card.querySelector(".es-card_icon");
		const cardControl = card.querySelector(".es-card_control");

		const tl = gsap.timeline({
			defaults: { duration: 0.5, ease: "power2.inOut" },
			paused: true,
		});

		tl.to(contentHidden, { height: () => contentHidden.scrollHeight + "px" }, "<");
		tl.to(detail, { width: "var(" + expandedDetailWidthVar + ")", autoAlpha: 1 }, 0.1);

		tl.to(card, { width: () => getExpandedWidth() }, 0.1);
		tl.to(icon, { rotate: "45deg" }, 0.2);

		// snap card when timeline starts
		tl.eventCallback("onStart", () => {
			openCardIndex = idx; // store the index of the currently opening card
			// update bounds to open state
			updateBounds(true);

			// update expanded state
			expanded = true;

			// if we are on last card and this card is not already expanded, recalculate bounds and snap to RH edge
			if (idx === cards.length - 1 && card.classList.contains("is-open")) {
				gsap.to(list, {
					x: drag.minX, // snap to the left edge
					duration: 0.5,
					ease: "power2.inOut",
					onUpdate: () => {
						drag.update();
					},
				});
			} else {
				snapToIndex(idx, snapPoints_open);
			}
		});

		// when expansion finishes → recalc bounds & snap this card to left edge
		tl.eventCallback("onComplete", () => {
			card.classList.remove("is-opening", "is-closing");
		});
		tl.eventCallback("onReverseComplete", () => {
			if (openCardIndex !== null && openCardIndex === idx) {
				// only collapse bounds when no other card is open or opening
				console.log("Collapsing bounds");
				updateBounds(false);
				// update expanded state
				expanded = false;
				openCardIndex = null; // reset the open card index
			}

			card.classList.remove("is-opening", "is-closing");
		});

		cardTimelines.set(card, tl);

		card.addEventListener("click", () => {
			currentIndex = idx;
			console.log("Current index: " + currentIndex);

			// if mobile, open the modal instead
			if (isMobile) {
				openMobileModal(idx);
			}
			// otherwise handle the card click
			else {
				// Close all other cards
				cards.forEach((other) => {
					if (other !== card) {
						reverse(other);
					}
				});

				// Toggle this card
				const isOpen = !card.classList.contains("is-open");
				isOpen ? play(card) : reverse(card);
			}
		});
	});
}

function play(card) {
	// add is-opening class
	card.classList.add("is-opening", "is-open");
	// remove is-closing class
	card.classList.remove("is-closing");

	// play timeline for card
	const tl = cardTimelines.get(card);
	if (tl) {
		tl.play();
	}
}

function reverse(card, animated = true) {
	// add is-closing class
	card.classList.add("is-closing");
	// remove is-open class
	card.classList.remove("is-open", "is-opening");

	// reverse timeline for card
	const tl = cardTimelines.get(card);
	if (tl) {
		tl.reverse();
	}
}

function updateBodyScrollIfModalOpen() {
	// if any modal is open, disable body scroll
	isAnyModalOpen = modals.some((modal) => modal.classList.contains("is-open"));
	if (isAnyModalOpen) {
		document.body.style.overflow = "hidden";
	} else {
		document.body.style.overflow = "auto";
	}
}

function initialiseModals() {
	// set all modals to display block and autoAlpha 0
	modals.forEach((modal, idx) => {
		gsap.set(modal, { display: "block", autoAlpha: 0 });

		// add click event to close modal
		const closeButton = modal.querySelector(".es-modal_controls");
		if (closeButton) {
			closeButton.addEventListener("click", () => {
				closeModal(idx);
			});
		}

		// add clicks to arrows to navigate to next/previous cards
		const nextButton = modal.querySelector(".es_arrow.is-next");
		const prevButton = modal.querySelector(".es_arrow.is-prev");
		if (nextButton) {
			nextButton.addEventListener("click", () => {
				if (idx < modals.length - 1) {
					// crossfade to next modal
					crossfadeModal(idx, idx + 1);
				}
			});
		}
		if (prevButton) {
			prevButton.addEventListener("click", () => {
				if (idx > 0) {
					// crossfade to previous modal
					crossfadeModal(idx, idx - 1);
				}
			});
		}

		// make bg fill visible
		const fill = document.querySelector(".es_modals-bg-fill");
		if (fill) {
			gsap.set(fill, { display: "block", autoAlpha: 0 });
		}
	});
}

function openMobileModal(idx) {
	// ensure no card is left in “open” state
	cards.forEach((c) => c.classList.contains("is-open") && reverse(c));

	const modal = modals[idx];

	if (modal) {
		modal.classList.add("is-open");
		gsap.to(modal, { autoAlpha: 1, duration: modalOpenDuration, ease: "power2.inOut" });
	}
	updateBodyScrollIfModalOpen(); // update body scroll state
}

function closeModal(idx, animated = true) {
	const modal = modals[idx];

	if (modal) {
		modal.classList.remove("is-open");

		gsap.to(modal, {
			autoAlpha: 0,
			duration: animated ? modalOpenDuration : 0,
			delay: animated ? 0 : modalOpenDuration, // if not animated, delay to allow any ongoing animations to finish
			ease: "power2.inOut",
		});
	}
	updateBodyScrollIfModalOpen(); // update body scroll state
}

function crossfadeModal(fromIdx, toIdx) {
	const modal_old = modals[fromIdx];
	const modal_new = modals[toIdx];

	// mark states
	modal_new.classList.add("is-open");
	modal_old.classList.remove("is-open");

	// adjust z indexes to ensure the incoming modal is on top
	gsap.set(modal_new, { zIndex: 2001 });
	gsap.set(modal_old, { zIndex: 2000 });

	gsap
		.timeline({
			onComplete: () => {
				// reset z-index after animation
				gsap.set(modal_new, { zIndex: 2000 });

				updateBodyScrollIfModalOpen;
			},
		})
		.to(modal_old, { autoAlpha: 0, duration: 0.1, ease: "none" }, modalOpenDuration)
		.fromTo(
			modal_new,
			{ autoAlpha: 0 },
			{ autoAlpha: 1, duration: modalOpenDuration, ease: "none" },
			0
		);
}

function closeAllModals() {
	modals.forEach((modal, idx) => {
		if (modal.classList.contains("is-open")) {
			closeModal(idx);
		}
	});
}

function updateTotalWidths() {
	// totalWidth_closed = Array.from(cards).reduce((sum, card, idx) => {
	// 	return sum + card.offsetWidth + (idx < cards.length - 1 ? gap : 0);
	// }, 0);

	// recalc collapsedWidth
	collapsedWidth = getRemVarInPx(collapsedWidthVar);

	// total width closed
	totalWidth_closed = cards.length * collapsedWidth + gap * (cards.length - 1);

	// total width open
	totalWidth_open = totalWidth_closed + (getExpandedWidth() - collapsedWidth);
}

// Generate draggable bounds
function generateBounds() {
	if (!container) {
		const result = { minX: 0, maxX: 0 };
		bounds = result;
		return result;
	}
	const containerWidth = container.offsetWidth;

	// generate closed bounds
	bounds_closed = { minX: Math.min(containerWidth - totalWidth_closed, 0), maxX: 0 };
	// generate open bounds
	bounds_open = { minX: Math.min(containerWidth - totalWidth_open, 0), maxX: 0 };
}

// Expand or collapse bounds
function updateBounds(expanded = false) {
	if (expanded) {
		bounds = bounds_open;
	} else {
		bounds = bounds_closed;
	}

	drag.applyBounds(bounds);
}

function generateSnapPoints() {
	snapPoints_closed = cards.map((card, i) => {
		let pt = Math.round(-card.offsetLeft);
		// clamp into [minX…maxX] so it never lies outside
		return Math.min(Math.max(pt, bounds_closed.minX), bounds_closed.maxX);
	});
	snapPoints_open = cards.map((card, i) => {
		let pt = Math.round(-card.offsetLeft);
		return Math.min(Math.max(pt, bounds_open.minX), bounds_open.maxX);
	});
}

// update drag instance with new bounds
// function applyBounds(drag, updatedBounds) {
// 	if (!drag) return;
// 	drag.applyBounds(updatedBounds);
// }

// animate the list to the given card index
function snapToIndex(idx, snapPoints = snapPoints_closed) {
	console.log(idx);
	let target = snapPoints[idx];

	gsap.to(list, {
		x: target,
		duration: 0.5,
		ease: "power2.inOut",
		onUpdate: () => {
			drag.update();

			updateProgressBar();
		},
	});
	currentIndex = idx;

	if (logging) {
		console.log("Snapping to index:", target);
	}
}

// Initialize the GSAP Draggable slider
function initialiseDraggable() {
	drag = Draggable.create(list, {
		type: "x",
		bounds: { minX: 0, maxX: 0 }, // temporary initial bounds
		inertia: true,
		cursor: "grab",
		activeCursor: "grabbing",
		onDrag: dragUpdateHandler,
		onThrowUpdate: dragUpdateHandler,
		onDragEnd: dragEndHandler,
		onThrowComplete: dragEndHandler,
	})[0];

	// Apply correct initial bounds
	updateTotalWidths();
	generateBounds();
	updateBounds(false); // start with closed bounds
	generateSnapPoints();
	if (logging) {
		console.log("Initial bounds:", drag.minX, drag.maxX);
	}
}

function dragUpdateHandler() {
	updateProgressBar();
}

function dragEndHandler() {
	// update index
	getCurrentIndex();
	// update slider state
	updateSliderState();
	// update progress bar
	updateProgressBar();
}

// function refreshBounds(drag, expanded = false) {
// 	// const { minX, maxX } = generateBounds();

// 	drag.applyBounds({ minX, maxX });

// 	// 3) rebuild snapPoints
// 	snapPoints = cards.map((card, i) => {
// 		let pt = -card.offsetLeft;
// 		if (i === cards.length - 1) pt = minX; // last card stays flush‐right
// 		return Math.min(Math.max(pt, minX), maxX);
// 	});

// 	return { minX, maxX };
// }
function getCurrentIndex() {
	const currentX = drag.x; // Get the current x position of the slider
	let closestIndex = 0;
	let closestDistance = Infinity;
	// if (logging) {
	// 	console.log(snapPoints);
	// }

	// Determine which snap points to use based on expanded state
	if (expanded) {
		snapPoints = snapPoints_open;
	} else {
		snapPoints = snapPoints_closed;
	}
	// Find the closest snap point to the current x position
	snapPoints.forEach((snapPoint, index) => {
		const distance = Math.abs(currentX - snapPoint);
		if (distance < closestDistance) {
			closestDistance = distance;
			closestIndex = index;
		}
	});
	if (logging) {
		console.log("Current X:", currentX, "Closest index:", closestIndex);
	}
	currentIndex = closestIndex; // Update the global currentIndex
	return closestIndex;
}

// handle previous button click
btnPrev.addEventListener("click", () => {
	const openCard = cards.find((card) => card.classList.contains("is-open"));
	// get current index
	getCurrentIndex();

	// close any open cards
	if (openCard) {
		reverse(openCard);
	}

	updateBounds(false); // ensure we are in closed state

	if (currentIndex > 0) {
		snapToIndex(currentIndex - 1, snapPoints_closed);
		if (logging) {
			console.log("Snapping to previous index:", currentIndex);
		}
	}
	updateSliderState();
});

// handle next button click
btnNext.addEventListener("click", () => {
	const openCard = cards.find((card) => card.classList.contains("is-open"));
	// get current index
	getCurrentIndex();

	// close any open cards
	if (openCard) {
		reverse(openCard);
	}

	updateBounds(false); // ensure we are in closed state

	if (currentIndex < snapPoints_closed.length - 1) {
		snapToIndex(currentIndex + 1, snapPoints_closed); // NB snapToIndex also updates currentIndex
		if (logging) {
			console.log("Snapping to next index:", currentIndex);
		}
	}
	updateSliderState();
});

// On window resize, clear inline props and recalc bounds
function onResize() {
	// check if mobile
	isMobile = window.matchMedia(mm_value).matches;

	// if not mobile, recalc expanded widths and update bg image sizes
	if (!isMobile) {
		expandedWidth = getExpandedWidth();
		setAllBgSizes();
	}

	closeAllModals(); // close all modals on resize
	updateBodyScrollIfModalOpen(); // update body scroll state

	// clear any inline sizes on the cards
	gsap.set([".es-card", ".es-card_detail", ".es-card_content-hidden", ".es-card_icon"], {
		clearProps: true,
	});
	// remove is-open class
	cards.forEach((card) => {
		card.classList.remove("is-open", "is-opening", "is-closing");
	});

	// force each timeline to recalc its “auto” values next time it plays
	cardTimelines.forEach((tl) => {
		tl.invalidate();
		if (tl.progress() > 0) {
			tl.pause(0).kill(true);
		}
	});

	// recalc bounds & snap back to the current index
	updateTotalWidths();
	generateBounds();
	updateBounds(false); // start with closed bounds
	generateSnapPoints();
	snapToIndex(currentIndex, snapPoints_closed);
	updateSliderState();
	updateProgressBar();
	openCardIndex = null; // reset the open card index
	expanded = false; // reset expanded state
}

function setAllBgSizes() {
	cards.forEach((card) => {
		// set all images to expandedWidth so they cover the expanded version
		gsap.set(card.querySelector(".es-card_bg"), {
			width: expandedWidth,
		});
	});
}

function getRemVarInPx(varName) {
	let el = document.documentElement;
	let raw = getComputedStyle(el).getPropertyValue(varName).trim();
	let value = raw ? parseFloat(raw) : 0; // parseFloat ignores the trailing "rem"
	let remInPx = parseFloat(getComputedStyle(el).fontSize);
	return value * remInPx;
}

function getExpandedWidth() {
	const maxWidth = getRemVarInPx(expandedWidthVar); // absolute max width a slide can be in px, based on CSS variable
	const containerWidth = container.offsetWidth; // the component width
	let expandedWidth = 0;
	if (maxWidth) {
		expandedWidth = Math.min(maxWidth, 0.9 * containerWidth); // calculate width of expanded card, limited to 90% of parent and CSS variable
	} else {
		expandedWidth = 0.9 * containerWidth; // fallback to 90%
	}
	// console log max width, container width and final calculated expanded width
	if (logging) {
		console.log("getExpandedWidth:", { maxWidth, containerWidth, expandedWidth });
	}

	return expandedWidth;
}

function patchDetailBg() {
	// currently detail elements use a bg filter blur, but we can't animate the opacity of a parent of a filter, so lets swap the detail to use a semi-transparent bg color instead
	const detailElements = document.querySelectorAll(".magic-card-detail");
	detailElements.forEach((detail) => {
		const bgColor = getComputedStyle(detail).backgroundColor;
		detail.style.backgroundColor = "#00000087"; // set the background color to the current bg color
		detail.style.backdropFilter = "none"; // remove the filter
	});
}

function debounce(func, wait) {
	let timeout;
	return function (...args) {
		const context = this;
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			func.apply(context, args);
		}, wait);
	};
}

const onResizeDebounced = debounce(() => {
	onResize();
}, 250);

// INITIALIZATION
function init() {
	gsap.registerPlugin(Draggable);
	openCloseESCards();
	setAllBgSizes();
	initialiseDraggable();
	window.addEventListener("resize", onResizeDebounced);
	initialiseModals();
	patchDetailBg();
	updateSliderState();
	getCurrentIndex();
	updateProgressBar();
}

init();

// --- DEBUG MODAL ---
const debugModal = document.createElement("div");
debugModal.style.position = "fixed";
debugModal.style.bottom = "16px";
debugModal.style.right = "16px";
debugModal.style.background = "rgba(30,30,40,0.95)";
debugModal.style.color = "#fff";
debugModal.style.font = "12px/1.5 monospace";
debugModal.style.padding = "12px 16px";
debugModal.style.borderRadius = "8px";
debugModal.style.zIndex = "9999";
debugModal.style.pointerEvents = "none";
debugModal.style.opacity = 0.5;
debugModal.style.width = "640px";
debugModal.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
debugModal.style.whiteSpace = "pre";
debugModal.innerText = "Debug info";
document.body.appendChild(debugModal);

function renderDebugModal() {
	debugModal.innerText =
		`currentIndex: ${currentIndex}\n` +
		`snapPoints_open: [${snapPoints_open?.join(", ")}]\n` +
		`snapPoints_closed: [${snapPoints_closed?.join(", ")}]\n` +
		`bounds_open: ${JSON.stringify(bounds_open)}\n` +
		`bounds_closed: ${JSON.stringify(bounds_closed)}\n` +
		`progress: ${progress?.toFixed(3)}\n` +
		`currentX: ${drag?.x?.toFixed(2)}\n` +
		`isMobile: ${isMobile}\n` +
		`openCardIndex: ${openCardIndex}\n` +
		`expandedWidth: ${expandedWidth}\n` +
		`collapsedWidth: ${collapsedWidth}\n` +
		`containerWidth: ${container?.offsetWidth}\n` +
		`isAnyModalOpen: ${isAnyModalOpen}`;
	requestAnimationFrame(renderDebugModal);
}

// Start the live debug modal
// renderDebugModal();
