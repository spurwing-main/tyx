const list = document.querySelector(".es_list");
const cards = list.querySelectorAll(".es-card");
let myDraggableInstance;
const cardTimelines = new Map(); // ← global

// Open/close card animations and timeline setup
function openCloseESCards() {
	cards.forEach((card) => {
		const detail = card.querySelector(".es-card_detail");
		const contentHidden = card.querySelector(".es-card_content-hidden");

		const tl = gsap.timeline({
			defaults: { duration: 0.5, ease: "power2.inOut" },
			paused: true,
		});

		tl.to(detail, { width: "22rem", autoAlpha: 1 });
		tl.to(contentHidden, { height: () => contentHidden.scrollHeight + "px" }, "<");
		tl.to(card, { width: "60rem" }, "<");

		// After expand/collapse finishes, recalc bounds
		tl.eventCallback("onComplete", recalcSliderBounds);
		tl.eventCallback("onReverseComplete", recalcSliderBounds);

		cardTimelines.set(card, tl);

		card.addEventListener("click", () => {
			// Close all other cards
			cards.forEach((other) => {
				if (other !== card) {
					other.classList.remove("is-open");
					cardTimelines.get(other).reverse();
				}
			});

			// Toggle this card
			const isOpening = !card.classList.contains("is-open");
			card.classList.toggle("is-open", isOpening);
			isOpening ? tl.play() : tl.reverse();
			// Bounds will update via timeline callbacks
		});
	});
}

// Generate draggable bounds based on total cards width
function generateBounds() {
	const gap = 32;
	let totalWidth = Array.from(cards).reduce((sum, card, idx) => {
		return sum + card.offsetWidth + (idx < cards.length - 1 ? gap : 0);
	}, 0);

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

// Apply new bounds to the draggable instance
function applyBounds(draggable, { minX, maxX }) {
	if (!draggable) return;
	draggable.applyBounds({ minX, maxX });
}

// Helper to regenerate & reapply bounds
function recalcSliderBounds() {
	if (!myDraggableInstance) return;
	const bounds = generateBounds();
	applyBounds(myDraggableInstance, bounds);
}

// Initialize the GSAP Draggable slider
function makeSliderDraggable() {
	const drag = Draggable.create(list, {
		type: "x",
		bounds: { minX: 0, maxX: 0 }, // temporary initial bounds
		inertia: true,
		cursor: "grab",
		activeCursor: "grabbing",
		// markers: true, // uncomment to debug bounds visually
	})[0];

	// Apply correct initial bounds
	applyBounds(drag, generateBounds());
	return drag;
}

// On window resize, clear inline props and recalc bounds
function onResize() {
	// clear any inline sizes on the cards
	gsap.set([".es-card", ".es-card_detail", ".es-card_content-hidden"], { clearProps: true });
	// remove is-open class
	cards.forEach((card) => card.classList.remove("is-open"));

	// recalc your draggable bounds
	recalcSliderBounds();

	// force each timeline to recalc its “auto” values next time it plays
	cardTimelines.forEach((tl) => {
		tl.invalidate();
		tl.seek(0);
	});
}

// DOM ready
document.addEventListener("DOMContentLoaded", () => {
	gsap.registerPlugin(Draggable);

	openCloseESCards();
	myDraggableInstance = makeSliderDraggable();

	window.addEventListener("resize", onResize);
});
