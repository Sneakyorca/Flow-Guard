"use client";
import { useEffect, useState } from "react";
import { Icon } from "./ui";

function Checkout({ step = 4 }: { step?: number }) {
  return (
    <div className="phone">
      <div className="phone-status"><b>9:41</b><span>▥ ▰</span></div>
      <div className="address"><Icon name="shield" size={13} /> shopkemi.com/checkout <span>↻</span></div>
      <div className="shop-head"><b>kemi<span>.</span></b><span>✳</span></div>
      <div className="checkout-content">
        <span className="checkout-kicker">SECURE CHECKOUT</span>
        <h3>{step === 1 ? "Your shopping bag" : "One last step."}</h3>
        <p>A little something, just for you.</p>
        <div className="product">
          <div className="product-art">
            <svg width="55" height="70" viewBox="0 0 55 70"><path d="M19 10h17v10l9 8v34H10V28l9-8Z" fill="#c9b08a" /><path d="M19 6h17v10H19Z" fill="#31352e" /><rect x="14" y="33" width="27" height="20" fill="#ede7db" /><text x="27" y="45" textAnchor="middle" fontSize="9" fill="#4f5144">kemi.</text></svg>
          </div>
          <div><b>Everyday Body Oil</b><p>100ml / Original</p><span>Qty: 1</span></div>
          <b>₦18,500</b>
        </div>
        <div className="checkout-label">CONTACT INFORMATION</div>
        <div className="fake-input">amara@example.com <span>✓</span></div>
        <div className="checkout-label">ORDER SUMMARY</div>
        <div className="checkout-line"><span>Subtotal</span><span>₦18,500</span></div>
        <div className="checkout-line"><span>Delivery</span><span>₦2,000</span></div>
        <div className="checkout-line total"><b>Total</b><b>₦20,500</b></div>
        <div className={`pay-now ${step === 4 ? "pay-error" : ""}`}>Pay Now <span>→</span>{step === 4 && <span className="click-cursor">↖</span>}</div>
        <div className="paystack">▰ Secured by <b>paystack</b></div>
      </div>
    </div>
  );
}

/** Sample replay (animated mock) used in demo mode and on the scanner landing. */
export function ReplayPlayer({ videoUrl, label = "390 × 844 · Mobile Safari" }: { videoUrl?: string | null; label?: string }) {
  const [time, setTime] = useState(11);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setTime((t) => { if (t >= 11) { setPlaying(false); return 11; } return t + 1; }), 650);
    return () => window.clearInterval(id);
  }, [playing]);

  if (videoUrl) {
    return (
      <div className="replay-player">
        <div className="player-top"><span><span className="dot red-dot" /> SESSION REPLAY</span><span className="mono">{label}</span></div>
        <video className="replay-video" src={videoUrl} controls playsInline preload="metadata" />
      </div>
    );
  }

  const step = Math.min(4, Math.floor(time / 3) + 1);
  return (
    <div className="replay-player">
      <div className="player-top"><span><span className="dot red-dot" /> SESSION REPLAY</span><span className="mono">{label}</span></div>
      <div className="player-stage">
        <div className="stage-grid" />
        <div className="replay-note">
          <span className="mono">STEP {step} OF 4</span>
          <b>{time >= 9 ? "Click “Pay Now”" : time >= 6 ? "Fill checkout details" : time >= 3 ? "Add product to cart" : "Navigate to storefront"}</b>
          <span className={time >= 11 ? "text-red" : "text-green"}>{time >= 11 ? "⚠ Click target unresponsive" : "✓ Action completed"}</span>
        </div>
        <Checkout step={step} />
        <span className="recorded-label">Sample browser recording</span>
      </div>
      <div className="player-controls">
        <button aria-label={playing ? "Pause replay" : "Play replay"} onClick={() => { if (time === 11) setTime(0); setPlaying(!playing); }}>
          {playing ? "Ⅱ" : <Icon name="play" size={17} />}
        </button>
        <span className="mono">00:{String(time).padStart(2, "0")} <span className="muted">/ 00:11</span></span>
        <input aria-label="Replay timeline" type="range" min="0" max="11" value={time} onChange={(e) => { setPlaying(false); setTime(+e.target.value); }} />
        <span className="timeline-markers"><i>✓</i><i>✓</i><i>✓</i><i>!</i></span>
        <span className="mono">1×</span>
      </div>
    </div>
  );
}
