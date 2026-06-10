import { useState } from "react";

const C = {
  green:      "#3A6B35",
  greenDark:  "#2D5229",
  greenLight: "#E8F0E5",
  offWhite:   "#F5F7F4",
  cream:      "#F0F5EE",
  white:      "#FFFFFF",
  text:       "#1C2B1A",
  gray:       "#6B7B69",
  lightGray:  "#D6E0D4",
  // keep gold only for price highlights
  gold:       "#B8860B",
  goldLight:  "#F5EDD0",
};

const EVENT_TYPES = [
  { id: "wedding",    label: "Wedding / Engagement", icon: "💍" },
  { id: "baby",       label: "Baby Shower",           icon: "🍼" },
  { id: "birthday",   label: "Birthday",              icon: "🎂" },
  { id: "graduation", label: "Graduation",            icon: "🎓" },
  { id: "corporate",  label: "Corporate",             icon: "💼" },
  { id: "general",    label: "General Party",         icon: "🎉" },
];

const ALL_ADDONS = [
  { id: "flower_pink",   label: "Pink Flower Wall",     price: 175, icon: "🌸", events: ["wedding","baby","general"] },
  { id: "flower_white",  label: "White Flower Wall",    price: 175, icon: "🤍", events: ["wedding","baby","general"] },
  { id: "string_lights", label: "Tent Lights (80ft)", price: 80,  icon: "✦",  events: ["wedding","baby","birthday","graduation","corporate","general"] },
  { id: "cocktail",      label: "Cocktail Table",       price: 13,  icon: "◎",  events: ["wedding","baby","birthday","graduation","corporate","general"], maxQty: 8 },
  { id: "sidewall",      label: "Sidewall Panel",       price: 25,  icon: "▦",  events: ["wedding","birthday","graduation","corporate","general"], maxQty: 4 },
  { id: "cooler",        label: "Cooler (248 cans)",    price: 20,  icon: "🧊", events: ["baby","birthday","graduation","corporate","general"], maxQty: 2 },
  { id: "speaker",       label: "Bluetooth Speaker",    price: 35,  icon: "🔊", events: ["birthday","graduation","corporate","general"] },
  { id: "cornhole",      label: "Cornhole Set",         price: 15,  icon: "🎯", events: ["birthday","graduation","general"] },
];

function getAddons(eventId) {
  return ALL_ADDONS.filter(a => a.events.includes(eventId));
}

function getTentSize(guests) {
  if (guests <= 48) return "20x20";
  if (guests <= 96) return "20x40";
  return "40x60";
}

function distributeChairs(guests, numTables, min, max) {
  const base = Math.max(min, Math.min(max, Math.floor(guests / numTables)));
  const counts = Array(numTables).fill(base);
  let rem = guests - base * numTables;
  for (let i = 0; i < numTables && rem > 0; i++) {
    if (counts[i] < max) { counts[i]++; rem--; }
  }
  return counts;
}

// ─── PRICING ─────────────────────────────────────────────────────────────────
const PRICES = {
  tent_pole:  { "20x20": 200, "20x40": 400, "40x60": 800 },
  tent_frame: { "20x20": 300, "20x40": 600, "40x60": 1200 },
  round_table: 12,
  long_table:  10,
  chair:        2,
};

function calcPrice(tentSize, tableType, numTables, totalChairs, tentPref) {
  const tentCost = tentPref === "frame"
    ? PRICES.tent_frame[tentSize]
    : PRICES.tent_pole[tentSize];
  const tableCost = tableType === "round"
    ? numTables * PRICES.round_table
    : numTables * PRICES.long_table;
  const chairCost = totalChairs * PRICES.chair;
  return tentCost + tableCost + chairCost;
}


// Returns array of 4 options: { id, label, tableType, numTables, chairsPerTable }
function generateOptions(guests, tentSize) {
  const maxRound = tentSize === "20x20" ? 4 : tentSize === "20x40" ? 8 : 16;
  const maxLong  = tentSize === "20x20" ? 6 : tentSize === "20x40" ? 12 : 24;

  const roundCozyN  = Math.min(Math.ceil(guests / 10), maxRound);
  const roundRelaxN = Math.min(Math.ceil(guests / 8),  maxRound);
  const longCozyN   = Math.min(Math.ceil(guests / 8),  maxLong);
  const longRelaxN  = Math.min(Math.ceil(guests / 6),  maxLong);

  // Always distribute exactly `guests` chairs — never more
  const opts = [
    {
      id: "round-cozy",
      label: "Round · Intimate",
      tableType: "round",
      numTables: roundCozyN,
      chairsPerTable: distributeChairs(guests, roundCozyN, 6, 10),
    },
    {
      id: "round-relaxed",
      label: "Round · Relaxed",
      tableType: "round",
      numTables: roundRelaxN,
      chairsPerTable: distributeChairs(guests, roundRelaxN, 6, 8),
    },
    {
      id: "long-cozy",
      label: "Long · Intimate",
      tableType: "long",
      numTables: longCozyN,
      chairsPerTable: distributeChairs(guests, longCozyN, 6, 8),
    },
    {
      id: "long-relaxed",
      label: "Long · Relaxed",
      tableType: "long",
      numTables: longRelaxN,
      chairsPerTable: distributeChairs(guests, longRelaxN, 5, 7),
    },
  ];

  return opts.filter((opt, idx, arr) => {
    if (idx === 0) return true;
    const prev = arr[idx - 1];
    if (opt.tableType !== prev.tableType) return true;
    return opt.numTables !== prev.numTables;
  });
}

// ─── STAGGERED POSITION BUILDER ──────────────────────────────────────────────
// Distributes tables into balanced rows — e.g. 5 tables = [3, 2] not [4, 1]
function buildRowCounts(numTables, maxCols) {
  const rows = Math.ceil(numTables / maxCols);
  const base = Math.floor(numTables / rows);
  const extra = numTables % rows;
  // First `extra` rows get base+1, rest get base
  return Array.from({ length: rows }, (_, i) => i < extra ? base + 1 : base);
}

function buildPositions(numTables, maxCols, VW, VH, pad) {
  const rowCounts = buildRowCounts(numTables, maxCols);
  const innerW = VW - pad * 2;
  const innerH = VH - pad * 2;
  const cellH = innerH / rowCounts.length;
  const positions = [];
  rowCounts.forEach((count, r) => {
    const cellW = innerW / count;
    for (let c = 0; c < count; c++) {
      positions.push({
        cx: pad + cellW * c + cellW / 2,
        cy: pad + cellH * r + cellH / 2,
      });
    }
  });
  return positions;
}

// ─── SVG PRIMITIVES ──────────────────────────────────────────────────────────
function RoundTableSVG({ cx, cy, r, chairs }) {
  const dotR = 2.5;
  const orbitR = r + 5 + dotR; // close but not touching
  return (
    <>
      {Array.from({ length: chairs }).map((_, i) => {
        const angle = (2 * Math.PI * i) / chairs - Math.PI / 2;
        return (
          <circle key={i}
            cx={cx + orbitR * Math.cos(angle)}
            cy={cy + orbitR * Math.sin(angle)}
            r={dotR} fill={C.green} opacity={0.9}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r} fill={C.white} stroke={C.green} strokeWidth={1.5} />
    </>
  );
}

function LongTableSVG({ x, y, w, h, chairs }) {
  const needsEnds = chairs > 6;
  const endSeats  = needsEnds ? Math.min(2, chairs - 6) : 0;
  const sideSeats = chairs - endSeats;
  const topCount  = Math.ceil(sideSeats / 2);
  const botCount  = Math.floor(sideSeats / 2);
  const ds = 4.5; const gap = 4.5;
  const els = [];
  for (let i = 0; i < topCount; i++) {
    const cx = x + ((i + 1) * w) / (topCount + 1);
    els.push(<rect key={`t${i}`} x={cx-ds/2} y={y-gap-ds} width={ds} height={ds} rx={1.2} fill={C.green} opacity={0.9}/>);
  }
  for (let i = 0; i < botCount; i++) {
    const cx = x + ((i + 1) * w) / (botCount + 1);
    els.push(<rect key={`b${i}`} x={cx-ds/2} y={y+h+gap} width={ds} height={ds} rx={1.2} fill={C.green} opacity={0.9}/>);
  }
  if (endSeats >= 1) els.push(<rect key="le" x={x-gap-ds} y={y+h/2-ds/2} width={ds} height={ds} rx={1.2} fill={C.green} opacity={0.9}/>);
  if (endSeats >= 2) els.push(<rect key="re" x={x+w+gap}  y={y+h/2-ds/2} width={ds} height={ds} rx={1.2} fill={C.green} opacity={0.9}/>);
  return (
    <>
      {els}
      <rect x={x} y={y} width={w} height={h} rx={2} fill={C.white} stroke={C.green} strokeWidth={1.5}/>
    </>
  );
}

// ─── FLOOR PLAN ──────────────────────────────────────────────────────────────
function FloorPlan({ tableType, tentSize, numTables, chairsPerTable }) {
  const isRound = tableType === "round";
  const maxCols = tentSize === "20x20" ? 2 : 4;
  const rowCounts = buildRowCounts(numTables, maxCols);
  const numRows = rowCounts.length;

  // Fixed viewBox per tent size — same scale across all layout options
  const VW = 280;
  const VH = tentSize === "20x20" ? 200 : tentSize === "20x40" ? 200 : 340;
  const pad = 24;
  const innerW = VW - pad * 2;
  const innerH = VH - pad * 2;
  const cellH = innerH / numRows;

  const positions = buildPositions(numTables, maxCols, VW, VH, pad);

  const rowForIdx = [];
  rowCounts.forEach((count, r) => {
    for (let c = 0; c < count; c++) rowForIdx.push(r);
  });

  const tables = positions.map(({ cx, cy }, i) => {
    const row = rowForIdx[i];
    const tablesInRow = rowCounts[row];
    const cellW = innerW / tablesInRow;

    if (isRound) {
      const r = 22;
      return <RoundTableSVG key={i} cx={cx} cy={cy} r={r} chairs={chairsPerTable[i]} />;
    } else {
      const w = Math.min(cellW * 0.58, 55);
      const h = 17;
      return <LongTableSVG key={i} x={cx - w/2} y={cy - h/2} w={w} h={h} chairs={chairsPerTable[i]} />;
    }
  });

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: "100%", borderRadius: 8, background: C.cream, border: `1.5px solid ${C.greenLight}` }}>
      <rect x={1} y={1} width={VW-2} height={VH-2} rx={5} fill="none" stroke={C.greenLight} strokeWidth={1} strokeDasharray="5,4"/>
      {tables}
      <text x={VW/2} y={VH-4} textAnchor="middle" fontSize={7} fill={C.gray} fontFamily="sans-serif">
        {tentSize} tent
      </text>
    </svg>
  );
}

// ─── LAYOUT OPTION CARD ───────────────────────────────────────────────────────
function LayoutCard({ option, tentSize, selected, onSelect }) {
  const total = option.chairsPerTable.reduce((a, b) => a + b, 0);
  const basePrice = calcPrice(tentSize, option.tableType, option.numTables, total, "pole");
  return (
    <div onClick={onSelect} style={{
      border: `2px solid ${selected ? C.green : C.lightGray}`,
      borderRadius: 10, padding: "12px",
      background: selected ? C.greenLight : C.white,
      cursor: "pointer", transition: "all 0.15s", position: "relative",
    }}>
      {selected && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: C.green, color: C.white,
          borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700,
        }}>Selected</div>
      )}
      <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{option.label}</div>
      <div style={{ color: C.gray, fontSize: 11 }}>
        {option.numTables} table{option.numTables > 1 ? "s" : ""} · {total} chairs
      </div>
      <div style={{ color: C.gold, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        From ${basePrice.toLocaleString()}
      </div>
      <FloorPlan
        tableType={option.tableType}
        tentSize={tentSize}
        numTables={option.numTables}
        chairsPerTable={option.chairsPerTable}
      />
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function GFPRPlanner() {
  const [step, setStep] = useState(1);
  const [guests, setGuests] = useState("");
  const [eventType, setEventType] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState({});
  const [tentPref, setTentPref] = useState("pole");
  const [form, setForm] = useState({ name: "", email: "", phone: "", date: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const guestNum   = parseInt(guests, 10) || 0;
  const tentSize   = getTentSize(guestNum);
  const is40x60    = tentSize === "40x60";
  const options    = guestNum > 0 ? generateOptions(guestNum, tentSize) : [];
  const chosenOpt  = options.find(o => o.id === selectedLayout);
  const availAddons = eventType ? getAddons(eventType) : [];
  const addonTotal  = availAddons.reduce((s, a) => s + a.price * (selectedAddons[a.id] || 0), 0);
  const toggleAddon = id => setSelectedAddons(p => {
    if (p[id]) { const n = {...p}; delete n[id]; return n; }
    return { ...p, [id]: 1 };
  });
  const setAddonQty = (id, qty) => setSelectedAddons(p =>
    qty === 0 ? (() => { const n = {...p}; delete n[id]; return n; })() : { ...p, [id]: qty }
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    const total = chosenOpt ? chosenOpt.chairsPerTable.reduce((a,b)=>a+b,0) : 0;
    const basePrice = chosenOpt && !is40x60 ? calcPrice(tentSize, chosenOpt.tableType, chosenOpt.numTables, total, tentPref) : null;
    const grandTotal = basePrice !== null ? basePrice + addonTotal : null;
    const addonList = Object.entries(selectedAddons).map(([id, qty]) => {
      const a = ALL_ADDONS.find(x => x.id === id);
      return a ? `${a.label}${qty > 1 ? ` x${qty}` : ""} ($${a.price * qty})` : "";
    }).join(", ");

    await fetch("https://formspree.io/f/mkoazjoj", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        date: form.date,
        notes: form.notes,
        guests: guestNum,
        tent_size: tentSize,
        tent_type: is40x60 ? "40x60 custom" : tentPref === "pole" ? "Pole Tent" : "Frame Tent",
        event_type: EVENT_TYPES.find(e => e.id === eventType)?.label,
        layout: chosenOpt ? `${chosenOpt.label} — ${chosenOpt.numTables} tables · ${total} chairs` : "",
        addons: addonList || "None",
        estimated_total: grandTotal ? `$${grandTotal.toLocaleString()}` : "Custom quote required",
      }),
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  const S = {
    wrap:      { fontFamily: "'Inter', system-ui, sans-serif", background: C.cream, minHeight: "100vh", padding: "24px 16px" },
    card:      { maxWidth: 820, margin: "0 auto", background: C.white, borderRadius: 14, boxShadow: "0 4px 24px rgba(42,80,38,0.10)", overflow: "hidden" },
    header:    { background: C.greenDark, padding: "20px 28px" },
    logo:      { color: C.white, fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.03em" },
    sub:       { color: C.greenLight, fontSize: 12, marginTop: 2 },
    body:      { padding: "28px 28px 36px" },
    stepLabel: { fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 },
    h2:        { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 20 },
    input:     { width: "100%", padding: "12px 14px", fontSize: 16, border: `1.5px solid ${C.lightGray}`, borderRadius: 8, outline: "none", background: C.cream, color: C.text, boxSizing: "border-box" },
    btn:       { background: C.green, color: C.white, border: "none", borderRadius: 8, padding: "13px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 20 },
    btnBack:   { background: "transparent", color: C.gray, border: `1.5px solid ${C.lightGray}`, borderRadius: 8, padding: "11px 20px", fontSize: 14, cursor: "pointer", marginTop: 20, marginRight: 10 },
    pill:      { display: "inline-block", background: C.greenLight, color: C.greenDark, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600, marginBottom: 14 },
    divider:   { border: "none", borderTop: `1px solid ${C.lightGray}`, margin: "20px 0" },
  };

  const Progress = () => (
    <div style={{ display: "flex", gap: 5, padding: "14px 28px 0" }}>
      {[1,2,3,4,5].map(s => (
        <div key={s} style={{ flex: 1, height: 3, borderRadius: 4, background: s <= step ? C.green : C.lightGray, transition: "background 0.3s" }}/>
      ))}
    </div>
  );

  if (submitted) {
    const confirmTotal = chosenOpt && !is40x60 ? (() => {
      const total = chosenOpt.chairsPerTable.reduce((a,b)=>a+b,0);
      const base = calcPrice(tentSize, chosenOpt.tableType, chosenOpt.numTables, total, tentPref);
      return base + addonTotal;
    })() : null;

    return (
      <div style={S.wrap}>
        <div style={S.card}>
          <div style={S.header}><div style={S.logo}>Greenfield Party Rentals</div></div>
          <div style={{ ...S.body, textAlign: "center", padding: "52px 28px" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>✦</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
              We'll be in touch, {form.name.split(" ")[0]}!
            </div>
            <div style={{ color: C.gray, fontSize: 14, maxWidth: 380, margin: "0 auto 24px" }}>
              Quote request received. Expect a response within 24 hours.
            </div>
            <div style={{ background: C.cream, borderRadius: 10, padding: "16px 20px", maxWidth: 380, margin: "0 auto", textAlign: "left", fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: C.green, marginBottom: 10 }}>Your summary</div>
              <div style={{ marginBottom: 4 }}>Guests: <b>{guestNum}</b> · Tent: <b>{tentSize} {!is40x60 && (tentPref === "pole" ? "Pole" : "Frame")}</b></div>
              <div style={{ marginBottom: 4 }}>Event: <b>{EVENT_TYPES.find(e => e.id === eventType)?.label}</b></div>
              {chosenOpt && <div style={{ marginBottom: 4 }}>Layout: <b>{chosenOpt.label}</b> — {chosenOpt.numTables} tables · {chosenOpt.chairsPerTable.reduce((a,b)=>a+b,0)} chairs</div>}
              {form.date && <div style={{ marginBottom: 8 }}>Date: <b>{form.date}</b></div>}

              {/* Price breakdown */}
              {confirmTotal !== null && (
                <>
                  <div style={{ borderTop: `1px solid ${C.lightGray}`, paddingTop: 10, marginTop: 6 }}>
                    {chosenOpt && (() => {
                      const total = chosenOpt.chairsPerTable.reduce((a,b)=>a+b,0);
                      const base = calcPrice(tentSize, chosenOpt.tableType, chosenOpt.numTables, total, tentPref);
                      return (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span>Tent + Tables + Chairs</span>
                          <b>${base.toLocaleString()}</b>
                        </div>
                      );
                    })()}
                    {addonTotal > 0 && (
                      <>
                        {Object.entries(selectedAddons).map(([id, qty]) => {
                          const a = ALL_ADDONS.find(x => x.id === id);
                          if (!a) return null;
                          return (
                            <div key={id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: C.gray }}>
                              <span>{a.label}{qty > 1 ? ` ×${qty}` : ""}</span>
                              <span>${a.price * qty}</span>
                            </div>
                          );
                        })}
                      </>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, color: C.green, borderTop: `1px solid ${C.lightGray}`, paddingTop: 8, marginTop: 6 }}>
                      <span>Estimated Total</span>
                      <span>${confirmTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}
              {is40x60 && <div style={{ marginTop: 8, color: C.green, fontWeight: 600 }}>40×60 — custom quote to follow</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.header}>
          <div style={S.logo}>Greenfield Party Rentals</div>
          <div style={S.sub}>Oakland County, MI · Luxury Event Rentals</div>
        </div>
        <Progress />
        <div style={S.body}>

          {/* STEP 1 — Guest count */}
          {step === 1 && (
            <div>
              <div style={S.stepLabel}>Step 1 of 5</div>
              <div style={S.h2}>How many guests?</div>
              <input style={S.input} type="number" min={1} max={216}
                placeholder="Enter guest count" value={guests}
                onChange={e => setGuests(e.target.value)} />
              {guestNum > 0 && guestNum <= 216 && (
                <div style={{ marginTop: 12, padding: "11px 14px", background: C.cream, borderRadius: 8, fontSize: 13, color: C.gray }}>
                  {guestNum <= 48 && "✓ A 20×20 tent covers this perfectly."}
                  {guestNum > 48 && guestNum <= 96 && "✓ A 20×40 tent is the right fit for your group."}
                  {guestNum > 96 && "✓ A 40×60 tent handles your guest list — we'll build a custom quote."}
                </div>
              )}
              {guestNum > 216 && (
                <div style={{ marginTop: 10, color: "#c0392b", fontSize: 13 }}>For events over 216 guests, please contact us directly.</div>
              )}
              <div>
                <button style={{ ...S.btn, opacity: guestNum >= 1 && guestNum <= 216 ? 1 : 0.4 }}
                  disabled={guestNum < 1 || guestNum > 216} onClick={() => setStep(2)}>Next →</button>
              </div>
            </div>
          )}

          {/* STEP 2 — Event type */}
          {step === 2 && (
            <div>
              <div style={S.stepLabel}>Step 2 of 5</div>
              <div style={S.h2}>What's the occasion?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {EVENT_TYPES.map(e => (
                  <div key={e.id} onClick={() => setEventType(e.id)} style={{
                    padding: "14px 16px", borderRadius: 10,
                    border: `2px solid ${eventType === e.id ? C.green : C.lightGray}`,
                    background: eventType === e.id ? C.greenLight : C.white,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 22 }}>{e.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: eventType === e.id ? 700 : 400 }}>{e.label}</span>
                  </div>
                ))}
              </div>
              <div>
                <button style={S.btnBack} onClick={() => setStep(1)}>← Back</button>
                <button style={{ ...S.btn, opacity: eventType ? 1 : 0.4 }} disabled={!eventType} onClick={() => setStep(3)}>See Layouts →</button>
              </div>
            </div>
          )}

          {/* STEP 3 — Layout options (4 cards in 2x2 grid) */}
          {step === 3 && (
            <div>
              <div style={S.stepLabel}>Step 3 of 5</div>
              <div style={S.h2}>Pick your layout</div>
              <div style={S.pill}>{guestNum} guests · {tentSize} tent</div>
              {is40x60 && (
                <div style={{ marginBottom: 14, padding: "10px 14px", background: C.greenLight, borderRadius: 8, fontSize: 13 }}>
                  ✦ This size requires a 40×60 tent — we'll build a custom quote for you.
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {options.map(opt => (
                  <LayoutCard key={opt.id} option={opt} tentSize={tentSize}
                    selected={selectedLayout === opt.id}
                    onSelect={() => setSelectedLayout(opt.id)} />
                ))}
              </div>
              <div>
                <button style={S.btnBack} onClick={() => setStep(2)}>← Back</button>
                <button style={{ ...S.btn, opacity: selectedLayout ? 1 : 0.4 }}
                  disabled={!selectedLayout} onClick={() => setStep(4)}>Add Extras →</button>
              </div>
            </div>
          )}

          {/* STEP 4 — Add-ons */}
          {step === 4 && (
            <div>
              <div style={S.stepLabel}>Step 4 of 5</div>
              <div style={S.h2}>Add to your setup</div>
              <div style={{ display: "grid", gap: 10 }}>
                {availAddons.map(a => {
                  const qty = selectedAddons[a.id] || 0;
                  const active = qty > 0;
                  const hasQty = !!a.maxQty;
                  return (
                    <div key={a.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "13px 16px", borderRadius: 8,
                      border: `1.5px solid ${active ? C.green : C.lightGray}`,
                      background: active ? C.greenLight : C.white,
                      transition: "all 0.15s",
                    }}>
                      {/* Left: icon + label */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{a.icon}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: active ? 700 : 400 }}>{a.label}</div>
                          <div style={{ fontSize: 11, color: C.gray }}>${a.price}{hasQty ? " each" : ""}</div>
                        </div>
                      </div>

                      {/* Right: stepper or checkbox */}
                      {hasQty ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {active && <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>${a.price * qty}</span>}
                          <div style={{ display: "flex", alignItems: "center", gap: 0, border: `1.5px solid ${active ? C.green : C.lightGray}`, borderRadius: 7, overflow: "hidden" }}>
                            <button
                              onClick={() => setAddonQty(a.id, Math.max(0, qty - 1))}
                              style={{ width: 30, height: 30, border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: C.text, fontWeight: 700 }}
                            >−</button>
                            <span style={{ minWidth: 22, textAlign: "center", fontSize: 14, fontWeight: 700 }}>{qty}</span>
                            <button
                              onClick={() => setAddonQty(a.id, Math.min(a.maxQty, qty + 1))}
                              style={{ width: 30, height: 30, border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: C.text, fontWeight: 700 }}
                            >+</button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => toggleAddon(a.id)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                          <span style={{ fontSize: 14, color: C.gray }}>${a.price}</span>
                          <div style={{
                            width: 20, height: 20, borderRadius: 4,
                            border: `2px solid ${active ? C.green : C.lightGray}`,
                            background: active ? C.green : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: C.white, fontSize: 12, fontWeight: 700,
                          }}>{active ? "✓" : ""}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {addonTotal > 0 && (
                <div style={{ marginTop: 14, padding: "11px 14px", background: C.cream, borderRadius: 8, fontSize: 13 }}>
                  Add-ons subtotal: <b>${addonTotal}</b>
                  <span style={{ color: C.gray, marginLeft: 6 }}>(base package quoted separately)</span>
                </div>
              )}
              <div>
                <button style={S.btnBack} onClick={() => setStep(3)}>← Back</button>
                <button style={S.btn} onClick={() => setStep(5)}>Review & Submit →</button>
              </div>
            </div>
          )}

          {/* STEP 5 — Contact form */}
          {step === 5 && (
            <div>
              <div style={S.stepLabel}>Step 5 of 5</div>
              <div style={S.h2}>Get your quote</div>

              {/* Tent preference toggle */}
              {!is40x60 && chosenOpt && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.gray, marginBottom: 8 }}>TENT TYPE</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { id: "pole",  label: "Pole Tent",  price: PRICES.tent_pole[tentSize],  desc: "Grass surfaces only" },
                      { id: "frame", label: "Frame Tent", price: PRICES.tent_frame[tentSize], desc: "Any surface · Luxury look" },
                    ].map(t => (
                      <div key={t.id} onClick={() => setTentPref(t.id)} style={{
                        flex: 1, padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                        border: `2px solid ${tentPref === t.id ? C.green : C.lightGray}`,
                        background: tentPref === t.id ? C.greenLight : C.white,
                        transition: "all 0.15s",
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                        <div style={{ color: C.gold, fontWeight: 700, fontSize: 13 }}>${t.price}</div>
                        <div style={{ color: C.gray, fontSize: 11, marginTop: 3 }}>{t.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live price summary */}
              {chosenOpt && !is40x60 && (() => {
                const total = chosenOpt.chairsPerTable.reduce((a,b)=>a+b,0);
                const base = calcPrice(tentSize, chosenOpt.tableType, chosenOpt.numTables, total, tentPref);
                const grand = base + addonTotal;
                return (
                  <div style={{ background: C.text, borderRadius: 8, padding: "14px 16px", fontSize: 13, marginBottom: 20, color: C.white }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>{tentPref === "pole" ? "Pole" : "Frame"} Tent + Tables + Chairs</span>
                      <span>${base.toLocaleString()}</span>
                    </div>
                    {addonTotal > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: C.greenLight }}>
                        <span>Add-ons</span>
                        <span>+${addonTotal}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, color: C.green, borderTop: `1px solid #333`, paddingTop: 8, marginTop: 4 }}>
                      <span>Estimated Total</span>
                      <span>${grand.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Summary */}
              <div style={{ background: C.cream, borderRadius: 8, padding: "14px 16px", fontSize: 13, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: C.green, marginBottom: 6 }}>Your summary</div>
                <div>Guests: <b>{guestNum}</b> · Tent: <b>{tentSize} {is40x60 ? "" : tentPref === "pole" ? "Pole" : "Frame"}</b></div>
                <div>Event: <b>{EVENT_TYPES.find(e => e.id === eventType)?.label}</b></div>
                {chosenOpt && <div>Layout: <b>{chosenOpt.label}</b> — {chosenOpt.numTables} tables · {chosenOpt.chairsPerTable.reduce((a,b)=>a+b,0)} chairs</div>}
                {Object.keys(selectedAddons).length > 0 && (
                  <div style={{ marginTop: 4 }}>Add-ons: <b>{Object.entries(selectedAddons).map(([id, qty]) => {
                    const a = ALL_ADDONS.find(x => x.id === id);
                    return a ? `${a.label}${qty > 1 ? ` ×${qty}` : ""}` : "";
                  }).join(", ")}</b></div>
                )}
                {is40x60 && <div style={{ marginTop: 6, color: C.green, fontWeight: 600 }}>40×60 — custom quote required</div>}
              </div>

              <hr style={S.divider} />
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { key: "name",  label: "Your name", type: "text",  placeholder: "Jane Smith" },
                  { key: "email", label: "Email",      type: "email", placeholder: "jane@email.com" },
                  { key: "phone", label: "Phone",      type: "tel",   placeholder: "(248) 555-0100" },
                  { key: "date",  label: "Event date", type: "date",  placeholder: "" },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.gray, display: "block", marginBottom: 4 }}>{label}</label>
                    <input style={S.input} type={type} placeholder={placeholder}
                      value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.gray, display: "block", marginBottom: 4 }}>Notes (optional)</label>
                  <textarea style={{ ...S.input, height: 80, resize: "vertical" }}
                    placeholder="Any special requests or questions?"
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div>
                <button style={S.btnBack} onClick={() => setStep(4)}>← Back</button>
                <button style={{ ...S.btn, opacity: form.name && form.email ? 1 : 0.4 }}
                  disabled={!form.name || !form.email || submitting} onClick={handleSubmit}>
                  {submitting ? "Sending..." : "Send My Quote Request ✦"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
