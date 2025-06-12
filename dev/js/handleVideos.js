tyx.functions.handleVideos = () => {
    /* ——————————————————————————————————————————————————————— constants */
    const DEF_WIDTH = 1280; // px, when data-width missing/invalid
    const DEF_QUALITY = "good"; // Cloudinary q_auto:eco default
    const PLAY_T = 0.5; // viewport threshold to play

    // Detect iOS Safari (to avoid using WebM, which is unsupported)
    const isIOSSafari = /iP(ad|hone|od).+Version\/[\d.]+.*Safari/i.test(navigator.userAgent);

    /* ———————————————————————————————————————————————— helpers (scoped) */
    const cleanCloudURL = (u = "") =>
        u.split("?")[0].replace(/\/upload\/(?:[^/]+\/)*v(\d+)\//, "/upload/v$1/");

    const buildTransforms = (url, w, q) => {
        const m = cleanCloudURL(url).match(/^(https:\/\/[^\/]+\/[^\/]+)\/video\/upload\/v(\d+)\/(.+)$/);
        if (!m) return null; // not Cloudinary
        const [, base, ver, rest] = m;
        const dot = rest.lastIndexOf(".");
        const pubId = rest.slice(0, dot);
        const width = parseInt(w, 10) || DEF_WIDTH;
        const quality = normaliseQuality(q);
        const manip = `c_scale,w_${width},fps_15-30,ac_none`;
        return {
            poster: `${base}/video/upload/so_auto,${quality}/v${ver}/${pubId}.jpg`,
            webm: `${base}/video/upload/${manip},${quality},f_webm/v${ver}/${pubId}.webm`,
            mp4: `${base}/video/upload/${manip},${quality},f_mp4/v${ver}/${pubId}.mp4`,
        };
    };

    const normaliseQuality = (q) => {
        if (!q) return `q_auto:${DEF_QUALITY}`;
        if (/^\d+$/.test(q)) return `q_${q}`; // explicit number
        if (/^(eco|good|best|low)$/i.test(q)) return `q_auto:${q.toLowerCase()}`;
        return `q_auto:${DEF_QUALITY}`; // fallback
    };

    const setType = (s) => {
        const want = /\.mp4$/i.test(s.src) ? "video/mp4" : "video/webm";
        if (s.type !== want) s.setAttribute("type", want);
    };

    const hoverTriggers = (video) => {
        const parent = video.closest("[play-on-hover-parent]");
        if (parent) {
            return [
                parent,
                ...[...parent.querySelectorAll("[play-on-hover-sibling]")].filter(
                    (n) => !n.contains(video)
                ),
            ];
        }
        return video.getAttribute("play-on-hover") === "hover" ? [video] : [];
    };

    /* ———————————————————————————————————————————————— early exit */
    const vids = [...document.querySelectorAll("video")];
    if (!vids.length) return;
    console.log(vids);

    /* ————————————————————————————————————————————— browser capability */
    const canWebM = !!document.createElement("video").canPlayType('video/webm; codecs="vp9"');
    const useLazy =
        (typeof tyx.lazyLoadVideos === "undefined" ? true : tyx.lazyLoadVideos) &&
        "IntersectionObserver" in window;

    const loadObs = useLazy
        ? new IntersectionObserver(onLoad, { rootMargin: "0px 0px 200px 0px" })
        : null;
    const playObs = useLazy ? new IntersectionObserver(onPlay, { threshold: PLAY_T }) : null;

    /* —————————————————————————————————————————— initialise each <video> */
    vids.forEach((v) => {
        // Prevent double-initialization (idempotency)
        if (v.dataset._tyxInit) return;
        v.dataset._tyxInit = "1";

        const originals = [...v.querySelectorAll("source")];
        const keep = [];

        originals.forEach((src) => {
            const raw = src.dataset.src || src.getAttribute("src");
            if (!raw) return; // empty <source>

            const tr = buildTransforms(
                raw,
                src.getAttribute("data-width"),
                src.getAttribute("data-quality")
            );

            if (tr) {
                /* Cloudinary ➜ swap in optimised rendition */
                // Only use WebM if supported and not iOS Safari
                if (!isIOSSafari && canWebM) {
                    src.src = tr.webm;
                } else {
                    src.src = tr.mp4;
                }
                setType(src);
                src.removeAttribute("data-src");
                v.poster = tr.poster;
                keep.push(src);
            } else {
                /* External ➜ leave untouched except ensure src/type */
                src.src = raw; // copy data-src → src if needed
                setType(src);
                src.removeAttribute("data-src");
                keep.push(src);
            }
        });

        /* prune leftover Cloudinary masters */
        originals
            .filter((s) => /\/video\/upload\//.test(s.src || s.dataset.src || "") && !keep.includes(s))
            .forEach((n) => n.remove());

        if (!keep.length) return; // nothing playable

        /* global video attributes */
        v.removeAttribute("src");
        v.preload = "none";
        v.muted = true; // autoplay safety

        const hEls = hoverTriggers(v);
        const hOnly = hEls.length > 0;

        // Only call .load() ONCE per video, after all sources are set
        if (!useLazy) {
            if (!v.dataset._tyxLoaded) {
                v.dataset._tyxLoaded = "1";
                v.load();
                v.dataset.loaded = "1";
            }
            if (!hOnly) playOnScroll(v);
        } else {
            loadObs.observe(v);
            if (hOnly) hookHover(v, hEls);
        }
    });

    /* ————————————————————————————————————————————— observers */
    function onLoad(entries, obs) {
        entries.forEach(({ isIntersecting, target }) => {
            // Defensive: Only load if not already loaded or loading
            if (!isIntersecting || target.dataset.loaded === "1" || target.dataset._tyxLoaded === "1")
                return;
            target.dataset._tyxLoaded = "1"; // mark as loaded before calling .load()
            target.load();
            target.dataset.loaded = "1";
            console.log("[tyx] Video loaded:", target); // ← log when loaded

            obs.unobserve(target);
            if (!target.autoplay)
                target.addEventListener("loadeddata", () => target.pause(), { once: true });
            if (!hoverTriggers(target).length) playObs.observe(target);
        });
    }

    function onPlay(entries) {
        entries.forEach(({ intersectionRatio, target }) => {
            if (!target.dataset.loaded) return;
            intersectionRatio >= PLAY_T ? target.play() : target.pause();
        });
    }

    /* ——————————————————————————————————————————— hover handling */
    function hookHover(v, els) {
        let playing = false;
        v.addEventListener("playing", () => (playing = true));
        v.addEventListener("pause", () => (playing = false));
        els.forEach((el) => {
            el.addEventListener("mouseenter", () => {
                // Defensive: Only load if not already loaded or loading
                if (v.dataset._tyxLoaded !== "1") {
                    v.dataset._tyxLoaded = "1";
                    v.load();
                    v.dataset.loaded = "1";
                }
                if (v.paused && !playing) v.play();
            });
            el.addEventListener("mouseleave", () => {
                if (!v.paused && playing) v.pause();
            });
        });
    }

    /* ——————————————————————————————————————————— scroll handling */
    function playOnScroll(v) {
        let raf = null;
        const evaluate = () => {
            raf = null;
            const r = v.getBoundingClientRect();
            const inView = r.top < innerHeight * (1 - PLAY_T) && r.bottom > innerHeight * PLAY_T;
            inView ? v.play() : v.pause();
        };
        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(evaluate);
        };
        addEventListener("scroll", onScroll, { passive: true });
        evaluate();
    }
};
