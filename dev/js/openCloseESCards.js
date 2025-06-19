//  ELEMENTS & STATE
const list = document.querySelector(".es_list");
const cards = Array.from(list.querySelectorAll(".es-card"));
const btnPrev = document.querySelector(".es_arrow.is-prev");
const btnNext = document.querySelector(".es_arrow.is-next");
let myDraggableInstance;
let currentIndex = 0;
let snapPoints = [];
let collapsedWidthVar = "--es--w-collapsed"; // CSS variable for collapsed width
let expandedWidthVar = "--es--w-expanded"; // CSS variable for expanded width
let expandedDetailWidthVar = "--es--detail-w-expanded"; // CSS

const cardTimelines = new Map(); // ← global

// Open/close card animations and timeline setup
function openCloseESCards() {
	cards.forEach((card, idx) => {
		const detail = card.querySelector(".es-card_detail");
		const contentHidden = card.querySelector(".es-card_content-hidden");
		const icon = card.querySelector(".es-card_icon");

		const tl = gsap.timeline({
			defaults: { duration: 0.5, ease: "power2.inOut" },
			paused: true,
		});

		tl.to(contentHidden, { height: () => contentHidden.scrollHeight + "px" }, "<");
		tl.to(detail, { width: "var(" + expandedDetailWidthVar + ")", autoAlpha: 1 }, 0.1);

		tl.to(card, { width: "var(" + expandedWidthVar + ")" }, 0.1);
		tl.to(icon, { rotate: "45deg" }, 0.2);

		// snap card when timeline starts
		tl.eventCallback("onStart", () => {
			// if last card and card is not already expanded, recalculate bounds and snap to RH edge
			if (idx === cards.length - 1 && card.classList.contains("is-open")) {
				console.log("Last card is not open, recalculating bounds and snapping to left edge");
				updateSliderBounds(false); // recalc bounds with expanded width
				console.log("MinX:", myDraggableInstance.minX, "MaxX:", myDraggableInstance.maxX);
				gsap.to(list, {
					x: myDraggableInstance.minX, // snap to the left edge
					duration: 0.5,
					ease: "power2.inOut",
					onUpdate: () => {
						myDraggableInstance.update();
					},
				});
			} else {
				snapToIndex(idx);
			}
		});

		// when expansion finishes → recalc bounds & snap this card to left edge
		tl.eventCallback("onComplete", () => {
			updateSliderBounds();
			card.classList.remove("is-opening", "is-closing");
		});
		tl.eventCallback("onReverseComplete", () => {
			updateSliderBounds();
			card.classList.remove("is-opening", "is-closing");
		});

		cardTimelines.set(card, tl);

		card.addEventListener("click", () => {
			// Close all other cards
			cards.forEach((other) => {
				if (other !== card) {
					reverse(other);
				}
			});

			// Toggle this card
			const isOpen = !card.classList.contains("is-open");
			isOpen ? play(card) : reverse(card);

			currentIndex = idx;
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

// Generate draggable bounds based on total cards width
function generateBounds(expanded = false) {
	const gap = 32;
	let totalWidth = Array.from(cards).reduce((sum, card, idx) => {
		return sum + card.offsetWidth + (idx < cards.length - 1 ? gap : 0);
	}, 0);

	if (expanded) {
		// get the values in pixels of the collapsed and expanded widths
		let collapsedWdith = parseFloat(getCssVar(collapsedWidthVar)) * getRemInPixels();
		let expandedWidth = parseFloat(getCssVar(expandedWidthVar)) * getRemInPixels();

		// if expanded, we need to account for the expanded width of 1 card, so just add on the difference to totalWidth
		totalWidth = totalWidth + (expandedWidth - collapsedWdith);
	}

	const container = list.closest(".container");
	if (!container) {
		return { minX: 0, maxX: 0 };
	}

	const containerWidth = container.offsetWidth;
	// minX should never be positive
	return {
		minX: Math.min(containerWidth - totalWidth, 0),
		maxX: 0,
	};
}

// compute one snap-point per card: negative of its offsetLeft

function updateSnapPoints() {
	const pts = cards.map((c) => -c.offsetLeft);
	const { minX } = generateBounds();
	// force the final card’s snap point to be exactly the leftmost bound
	pts[pts.length - 1] = minX;
	snapPoints = pts;
}

// re-apply Draggable bounds
function updateSliderBounds(expanded = false) {
	const bounds = generateBounds(expanded);
	console.log("Updating bounds:", bounds);
	applyBounds(myDraggableInstance, bounds);
}

// helper to apply to an instance
function applyBounds(drag, { minX, maxX }) {
	if (!drag) return;
	drag.applyBounds({ minX, maxX });
}

// animate the list to the given card index
function snapToIndex(idx) {
	let target = snapPoints[idx];
	// clamp to bounds
	const b = generateBounds();
	target = Math.max(Math.min(target, b.maxX), b.minX);

	gsap.to(list, {
		x: target,
		duration: 0.5,
		ease: "power2.inOut",
		onUpdate: () => {
			myDraggableInstance.update();
		},
	});
	currentIndex = idx;

	console.log("Snapping to index:", target);
}

// Initialize the GSAP Draggable slider
function makeSliderDraggable() {
	const drag = Draggable.create(list, {
		type: "x",
		bounds: { minX: 0, maxX: 0 }, // temporary initial bounds
		inertia: true,
		cursor: "grab",
		activeCursor: "grabbing",
	})[0];

	// Apply correct initial bounds
	applyBounds(drag, generateBounds());
	console.log("Initial bounds:", drag.minX, drag.maxX);
	return drag;
}

function getCurrentIndex() {
	const currentX = myDraggableInstance.x; // Get the current x position of the slider
	let closestIndex = 0;
	let closestDistance = Infinity;

	snapPoints.forEach((snapPoint, index) => {
		const distance = Math.abs(currentX - snapPoint);
		if (distance < closestDistance) {
			closestDistance = distance;
			closestIndex = index;
		}
	});
	console.log("Current X:", currentX, "Closest index:", closestIndex);
	currentIndex = closestIndex; // Update the global currentIndex
	return closestIndex;
}

// handle previous button click
btnPrev.addEventListener("click", () => {
	const openCard = cards.find((card) => card.classList.contains("is-open"));
	if (openCard) {
		reverse(openCard);
	}
	// get current index, bearing in mind we might be in between cards
	//...
	if (getCurrentIndex() > 0) {
		snapToIndex(currentIndex - 1);
	}
});

// handle next button click
btnNext.addEventListener("click", () => {
	const openCard = cards.find((card) => card.classList.contains("is-open"));
	if (openCard) {
		reverse(openCard);
	}
	// get current index, bearing in mind we might be in between cards
	if (getCurrentIndex() < cards.length - 1) {
		snapToIndex(currentIndex + 1);
	}
});

// On window resize, clear inline props and recalc bounds
function onResize() {
	// clear any inline sizes on the cards
	gsap.set([".es-card", ".es-card_detail", ".es-card_content-hidden"], { clearProps: true });
	// remove is-open class
	cards.forEach((card) => card.classList.remove("is-open", "is-opening", "is-closing"));

	// force each timeline to recalc its “auto” values next time it plays
	cardTimelines.forEach((tl) => {
		tl.invalidate();
		if (tl.progress() > 0) {
			tl.pause(0).kill(true);
		}
		// tl.invalidate();
		// tl.seek(0);
	});

	// recalc bounds & snap back to the current index
	updateSliderBounds();
	updateSnapPoints();
	snapToIndex(currentIndex);
}

// DOM ready
document.addEventListener("DOMContentLoaded", () => {
	gsap.registerPlugin(Draggable);

	openCloseESCards();
	myDraggableInstance = makeSliderDraggable();
	updateSnapPoints();

	window.addEventListener("resize", onResize);
});

function getRemInPixels() {
	return parseFloat(getComputedStyle(document.documentElement).fontSize);
}

// function to return CSS variable value
function getCssVar(varName) {
	return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}
