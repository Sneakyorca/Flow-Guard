"use client";
import { useEffect, useState } from "react";
import { Icon } from "./ui";

const SAMPLE_STEPS = ["Open the shop", "Add Everyday Body Oil to the bag", "Fill in contact details", "Click “Pay Now”"];
const LENGTH = 11;

function CheckoutMock({ step }: { step: number }) {
  return (
    <div className="phone" aria-hidden="true">
      <div className="bar"><span>9:41</span><span>5G</span></div>
      <div className="url">shopkemi.com/checkout</div>
      <div className="shop">kemi<span>.</span></div>
      <div className="body">
        <h3>{step === 1 ? "Your bag" : "Checkout"}</h3>
        <div className="line"><span>Everyday Body Oil, 100ml</span><span>₦18,500</span></div>
        <div className="label">Email</div>
        <div className="field-mock">{step >= 3 ? "amara@example.com" : " "}</div>
        <div className="line"><span>Delivery, Lagos</span><span>₦2,000</span></div>
        <div className="line total"><span>Total</span><span>₦20,500</span></div>
        <div className={`pay ${step === 4 ? "err" : ""}`}>Pay Now</div>
        <div className="small">Payments by Paystack</div>
      </div>
    </div>
  );
}

/**
 * Real recordings play in a <video>. Without one (demo mode, scanner landing) we show a
 * labelled, scrubbable sample built from the same four steps as the sample incident.
 */
export function ReplayPlayer({ videoUrl, label = "390 × 844 · mobile" }: { videoUrl?: string | null; label?: string }) {
  const [time, setTime] = useState(LENGTH);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setTime((t) => { if (t >= LENGTH) { setPlaying(false); return LENGTH; } return t + 1; }), 650);
    return () => window.clearInterval(id);
  }, [playing]);

  if (videoUrl) {
    return (
      <section className="panel player" aria-label="Recording">
        <div className="player-bar"><span>Recording</span><span className="mono">{label}</span></div>
        <video className="video" src={videoUrl} controls playsInline preload="metadata" />
      </section>
    );
  }

  const step = Math.min(4, Math.floor(time / 3) + 1);
  const failedNow = time >= LENGTH;
  return (
    <section className="panel player" aria-label="Sample recording">
      <div className="player-bar"><span>Sample recording</span><span className="mono">{label}</span></div>
      <div className="stage">
        <div className="stage-note" aria-live="polite">
          <span className="mono">Step {step} of 4</span>
          <b>{SAMPLE_STEPS[step - 1]}</b>
          {failedNow ? <span className="t-bad"><Icon name="x-circle" size={14} /> Nothing happened. TypeError in checkout.js</span> : <span className="t-ok"><Icon name="check-circle" size={14} /> Done</span>}
        </div>
        <CheckoutMock step={step} />
        <span className="stage-caption">Illustration of a recording. Real runs show the actual video.</span>
      </div>
      <div className="controls">
        <button aria-label={playing ? "Pause" : "Play"} onClick={() => { if (time === LENGTH) setTime(0); setPlaying(!playing); }}>
          <Icon name={playing ? "pause" : "play"} />
        </button>
        <span className="mono num">0:{String(time).padStart(2, "0")} <span className="faint">/ 0:{LENGTH}</span></span>
        <input aria-label="Seek" type="range" min="0" max={LENGTH} value={time} onChange={(e) => { setPlaying(false); setTime(+e.target.value); }} />
      </div>
    </section>
  );
}
