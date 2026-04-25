import { useEffect, useMemo, useRef, useState } from 'react';
import { Film, AlertCircle } from 'lucide-react';
import './TimelinePreview.css';

/**
 * YouTube-style scrubber: a range slider with a floating frame preview
 * anchored above the thumb. Frames are extracted lazily via ffmpeg with
 * a debounced request and an in-memory cache keyed by rounded seconds.
 */
const cache = new Map(); // key: `${filePath}::${sec}` → dataURL

function format(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return [h, m, ss].map(v => String(v).padStart(2, '0')).join(':');
}

export default function TimelinePreview({
    file,
    min = 0,
    max = 100,
    step = 1,
    value,
    onChange,
    disabled = false,
}) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const debounceRef = useRef(null);
    const requestIdRef = useRef(0);
    const trackRef = useRef(null);

    const range = Math.max(1, max - min);
    const percent = useMemo(
        () => Math.min(100, Math.max(0, ((value - min) / range) * 100)),
        [value, min, range]
    );

    // Reveal preview while interacting; hide shortly after release
    const reveal = () => setShowPreview(true);
    const hideSoon = () => {
        setTimeout(() => setShowPreview(false), 800);
    };

    // Fetch frame for the current value (debounced + cached)
    useEffect(() => {
        if (!file || !showPreview) return;
        const sec = Math.round(value);
        const key = `${file}::${sec}`;

        if (cache.has(key)) {
            setPreviewUrl(cache.get(key));
            setLoading(false);
            setErrorMsg(null);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        setLoading(true);
        setErrorMsg(null);
        const myReqId = ++requestIdRef.current;

        debounceRef.current = setTimeout(async () => {
            try {
                if (typeof window.ffmcp?.extractFrame !== 'function') {
                    const msg = 'extractFrame bridge missing — restart the Electron app';
                    console.warn('[TimelinePreview]', msg);
                    if (myReqId === requestIdRef.current) {
                        setErrorMsg(msg);
                        setLoading(false);
                    }
                    return;
                }
                const url = await window.ffmcp.extractFrame(file, sec, 240);
                if (!url) {
                    console.warn('[TimelinePreview] empty frame result');
                    if (myReqId === requestIdRef.current) {
                        setErrorMsg('Empty frame');
                        setLoading(false);
                    }
                    return;
                }
                cache.set(key, url);
                if (myReqId === requestIdRef.current) {
                    setPreviewUrl(url);
                    setLoading(false);
                }
            } catch (err) {
                console.error('[TimelinePreview] extractFrame failed:', err);
                if (myReqId === requestIdRef.current) {
                    setErrorMsg(err?.message || 'Frame extraction failed');
                    setLoading(false);
                }
            }
        }, 120);

        return () => clearTimeout(debounceRef.current);
    }, [file, value, showPreview]);

    // Compute clamped left position so the bubble doesn't overflow the track
    const bubbleStyle = useMemo(() => {
        const trackWidth = trackRef.current?.offsetWidth || 0;
        const bubbleWidth = 220;
        const halfBubble = bubbleWidth / 2;
        const xPx = (percent / 100) * trackWidth;
        const clampedX = Math.min(
            Math.max(xPx, halfBubble),
            Math.max(halfBubble, trackWidth - halfBubble)
        );
        return {
            left: trackWidth ? `${clampedX}px` : `${percent}%`,
            transform: 'translateX(-50%)',
        };
    }, [percent]);

    return (
        <div className="tp-wrap">
            <div className={`tp-bubble${showPreview && file ? ' visible' : ''}`} style={bubbleStyle}>
                <div className="tp-bubble-inner">
                    {previewUrl ? (
                        <img className="tp-img" src={previewUrl} alt="Frame preview" />
                    ) : errorMsg ? (
                        <div className="tp-img tp-img-empty tp-img-error" title={errorMsg}>
                            <AlertCircle size={20} />
                            <span>{errorMsg}</span>
                        </div>
                    ) : (
                        <div className="tp-img tp-img-empty">
                            <Film size={20} />
                        </div>
                    )}
                    <div className={`tp-img-loader${loading ? ' active' : ''}`} />
                </div>
                <span className="tp-time">{format(value)}</span>
            </div>

            <div className="tp-track" ref={trackRef}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange?.(+e.target.value)}
                    onMouseEnter={reveal}
                    onMouseDown={reveal}
                    onMouseUp={hideSoon}
                    onMouseLeave={hideSoon}
                    onFocus={reveal}
                    onBlur={hideSoon}
                    onTouchStart={reveal}
                    onTouchEnd={hideSoon}
                />
            </div>
        </div>
    );
}
