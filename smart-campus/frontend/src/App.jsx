import { useEffect, useMemo, useState } from 'react';

const edgePairs = [['gate','sg'],['sg','circle'],['sg','srix'],['srix','canteen'],['circle','block3'],['circle','ground'],['circle','girls'],['girls','boys'],['circle','ece'],['ece','library'],['library','b810'],['library','block1'],['library','canteen'],['canteen','block1'],['block1','gym'],['block1','cultural']];

function App() {
  const [locations, setLocations] = useState([]);
  const [start, setStart] = useState('gate');
  const [destination, setDestination] = useState('library');
  const [middleStops, setMiddleStops] = useState([]);
  const [mode, setMode] = useState('normal');
  const [journey, setJourney] = useState(null);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('light');
  const [live, setLive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [mapZoom, setMapZoom] = useState(1);

  useEffect(() => {
    fetch('/api/locations').then((response) => response.json()).then(setLocations).catch(() => setError('Could not load campus locations.'));
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  const locationMap = useMemo(() => Object.fromEntries(locations.map((place) => [place.id, place])), [locations]);
  const stops = [start, ...middleStops, destination];
  const instructions = journey?.segments.flatMap((segment, segmentIndex) => segment.legs.map((leg) => ({ ...leg, segmentIndex, toName: locationMap[leg.to]?.name }))) || [];
  const currentInstruction = instructions[stepIndex];

  async function findRoute() {
    setError('');
    const response = await fetch(`/api/route?stops=${stops.join(',')}&mode=${mode}`);
    const data = await response.json();
    if (!response.ok) { setJourney(null); setError(data.error); return; }
    setJourney(data);
    setLive(false);
    setStepIndex(0);
  }

  function addMiddleStop() {
    if (middleStops.length < 3) setMiddleStops([...middleStops, locations[0]?.id || 'gate']);
  }

  function updateMiddleStop(index, value) {
    setMiddleStops(middleStops.map((stop, stopIndex) => stopIndex === index ? value : stop));
  }

  function removeMiddleStop(index) {
    setMiddleStops(middleStops.filter((_, stopIndex) => stopIndex !== index));
  }

  function speakInstruction(instruction = currentInstruction) {
    if (!voiceEnabled || !instruction || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${instruction.hint} You will reach ${instruction.toName}.`));
  }

  function startLiveGuidance() {
    setLive(true);
    setStepIndex(0);
    window.setTimeout(() => speakInstruction(instructions[0]), 0);
  }

  function nextInstruction() {
    if (stepIndex < instructions.length - 1) {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      speakInstruction(instructions[nextIndex]);
    }
  }

  return <>
    <header className="topbar"><div className="brand"><span className="brand-mark">SC</span><span>SMART CAMPUS NAVIGATION</span></div><div className="top-actions"><span className="status"><i /> Campus map prototype</span><button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? '☾ Dark' : '☀ Light'}</button></div></header>
    <main className={`layout ${theme === 'dark' ? 'dark-mode' : ''}`}>
      <section className="hero">
        <p className="eyebrow">SR UNIVERSITY / NAVIGATION DESK</p>
        <h1>Find your way<br /><em>across campus.</em></h1>
        <p className="intro">Build a journey between any campus locations. Add a middle stop when your day has more than one destination.</p>
        <div className="route-form">
          <LocationSelect label="Start point" value={start} locations={locations} onChange={setStart} />
          {middleStops.map((stop, index) => <div className="middle-row" key={`${index}-${stop}`}><LocationSelect label={`Middle stop ${index + 1}`} value={stop} locations={locations} onChange={(value) => updateMiddleStop(index, value)} /><button className="remove-stop" onClick={() => removeMiddleStop(index)} aria-label="Remove middle stop">×</button></div>)}
          <LocationSelect label="Final destination" value={destination} locations={locations} onChange={setDestination} />
          <div className="form-actions"><button className="add-stop" onClick={addMiddleStop}>+ Add middle stop</button><button className="go" onClick={findRoute}>Find route <span>↗</span></button></div>
          <div className="mode-row"><label className="radio"><input type="radio" name="mode" value="normal" checked={mode === 'normal'} onChange={() => setMode('normal')} /> Normal route</label><label className="radio"><input type="radio" name="mode" value="accessible" checked={mode === 'accessible'} onChange={() => setMode('accessible')} /> Accessibility-friendly</label></div>
          <p className={`mode-help ${mode === 'accessible' ? 'mode-help-active' : ''}`}>{mode === 'accessible' ? 'Avoids stairs and blocked paths. Current campus data marks outdoor paths as step-free; indoor accessibility details still need verification.' : 'Uses the shortest available walking path, including ordinary campus routes.'}</p>
        </div>
        <p className="note">Distances are prototype estimates. Verify paths on campus before relying on them.</p>
      </section>
      <section className="map-panel">
        <div className="map-head"><div><span className="eyebrow">LIVE JOURNEY</span><h2>{journey ? `${locationMap[start]?.name} → ${locationMap[destination]?.name}` : 'Choose your places'}</h2>{journey && <span className={`route-mode-badge ${journey.mode === 'accessible' ? 'accessible-badge' : ''}`}>{journey.mode === 'accessible' ? 'STEP-FREE ROUTE' : 'STANDARD WALKING ROUTE'}</span>}</div>{journey && <div className="metrics"><strong>{Math.round(journey.distance)} m</strong><span>distance</span><strong>{journey.minutes} min</strong><span>walk time</span></div>}</div>
        <CampusMap locations={locations} journey={journey} activeNodeId={live ? currentInstruction?.to : undefined} zoom={mapZoom} onZoomIn={() => setMapZoom(Math.min(1.8, mapZoom + 0.15))} onZoomOut={() => setMapZoom(Math.max(0.7, mapZoom - 0.15))} />
        {journey && <LiveGuidance active={live} currentInstruction={currentInstruction} stepIndex={stepIndex} totalSteps={instructions.length} voiceEnabled={voiceEnabled} onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)} onStart={startLiveGuidance} onNext={nextInstruction} onReplay={() => speakInstruction()} />}
        <div className="results">{error && <div className="empty error">{error}</div>}{!journey && !error && <div className="empty">Your route and directions will appear here.</div>}{journey?.mode === 'accessible' && <div className="accessibility-result"><strong>Accessibility check</strong><span>{journey.accessibility.status}</span></div>}{journey?.segments.map((segment, index) => <Segment key={`${segment.from.id}-${segment.to.id}`} segment={segment} index={index} total={journey.segments.length} />)}</div>
      </section>
    </main>
  </>;
}

function LocationSelect({ label, value, locations, onChange }) {
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{locations.map((place) => <option value={place.id} key={place.id}>{place.name}</option>)}</select></label>;
}

function CampusMap({ locations, journey, activeNodeId, zoom, onZoomIn, onZoomOut }) {
  const routeNodes = journey?.segments.flatMap((segment, index) => index ? segment.nodes.slice(1) : segment.nodes) || [];
  const destinationIds = new Set(journey?.segments.map((segment) => segment.to.id) || []);
  const checkpointIds = new Set(routeNodes.map((place) => place.id));
  return <div className="map"><svg viewBox="0 0 1200 650" aria-label="Schematic campus map"><g transform={`translate(${600 - 600 * zoom} ${325 - 325 * zoom}) scale(${zoom})`}><g id="paths">{edgePairs.map(([from, to]) => { const a = locations.find((place) => place.id === from); const b = locations.find((place) => place.id === to); return a && b && <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />; })}</g><g id="route-line">{routeNodes.slice(0, -1).map((place, index) => <RouteSegment key={`${place.id}-${routeNodes[index + 1].id}`} from={place} to={routeNodes[index + 1]} />)}</g><g id="markers">{locations.map((place) => { const isDestination = destinationIds.has(place.id); const isCheckpoint = checkpointIds.has(place.id) && !isDestination; const label = labelPosition(place, isDestination); return <g className={`marker poi-marker poi-${place.type} ${place.id === activeNodeId ? 'active-marker' : ''} ${isDestination ? 'destination-marker' : ''} ${isCheckpoint ? 'checkpoint-marker' : ''}`} transform={`translate(${place.x},${place.y})`} key={place.id}>{isDestination ? <><path className="destination-pin" d="M 0,-24 C -14,-24 -21,-14 -21,-2 C -21,13 0,31 0,31 C 0,31 21,13 21,-2 C 21,-14 14,-24 0,-24 Z" /><circle className="destination-pin-center" r="7" /></> : <circle className="poi-circle" r="16" />}<text className="marker-icon" y={isDestination ? -2 : 1}>{locationIcon(place)}</text><text className="marker-label" x={label.x} y={label.y} textAnchor={label.anchor}>{mapLabel(place)}</text></g>; })}</g></g></svg><div className="map-controls"><button onClick={onZoomIn} aria-label="Zoom in">+</button><button onClick={onZoomOut} aria-label="Zoom out">−</button></div><div className="map-key"><span><b className="dot route" /> Blue route</span><span><b className="dot place" /> Red destination pin</span></div></div>;
}

function labelPosition(place, isDestination) {
  if (isDestination) return { x: 0, y: -35, anchor: 'middle' };
  if (place.id === 'sg') return { x: -22, y: -24, anchor: 'end' };
  if (place.id === 'circle') return { x: 22, y: -24, anchor: 'start' };
  return { x: 0, y: -24, anchor: 'middle' };
}

function mapLabel(place) {
  const labels = { circle: 'University Circle', block3: 'Block 3 - CSE', ground: 'Sports Ground', ece: 'Block 2 - Engineering', b810: 'Blocks 8-10 - CSE', srix: 'SRiX Innovation', block1: 'Block 1 - Admin', cultural: 'Cultural Club' };
  return labels[place.id] || place.name;
}

function locationIcon(place) {
  const icons = { gate: '▥', junction: '•', roundabout: '↻', academic: '▦', sports: '⚽', hostel: '⌂', library: '📖', innovation: '✦', facility: place.id === 'canteen' ? '🍴' : place.id === 'gym' ? '🏋' : '★' };
  return icons[place.type] || '•';
}

function RouteSegment({ from, to }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const count = 1;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return <g className="route-segment"><line className="route-stroke" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />{Array.from({ length: count }, (_, index) => { const ratio = (index + 1) / (count + 1); const x = from.x + dx * ratio; const y = from.y + dy * ratio; return <g className="route-direction" transform={`translate(${x} ${y}) rotate(${angle})`} key={`${from.id}-${to.id}-direction-${index}`}><circle r="8" /><path d="M -3 -4 L 2 0 L -3 4" /></g>; })}</g>;
}

function LiveGuidance({ active, currentInstruction, stepIndex, totalSteps, voiceEnabled, onVoiceToggle, onStart, onNext, onReplay }) {
  const finished = active && stepIndex >= totalSteps - 1;
  return <section className={`live-guidance ${active ? 'is-active' : ''}`}><div className="live-heading"><span className="live-pulse" /> LIVE GUIDANCE <button className="voice-toggle" onClick={onVoiceToggle}>{voiceEnabled ? '🔊 Voice on' : '🔇 Voice off'}</button></div>{!active ? <div className="live-start"><p>Start from your selected location and receive directions one step at a time.</p><button className="go live-button" onClick={onStart}>Start live navigation <span>▶</span></button></div> : <div className="instruction"><div><span className="step">STEP {stepIndex + 1} / {totalSteps}</span><h3>{finished ? `Arrive at ${currentInstruction.toName}` : currentInstruction.hint}</h3><p>{finished ? 'You have reached this stop. Continue when ready for the next journey leg.' : `Next landmark: ${currentInstruction.toName}`}</p></div><div className="instruction-actions"><button onClick={onReplay}>Replay</button><button className="next-button" onClick={onNext} disabled={finished}>{finished ? 'Arrived' : 'Next step →'}</button></div></div>}</section>;
}

function Segment({ segment, index, total }) {
  return <article className="segment"><div className="segment-image"><img src={segment.to.image} alt={segment.to.name} /></div><div className="segment-copy"><span className="step">STOP {index + 1} / {total}</span><h3>{segment.from.name} <b>→</b> {segment.to.name}</h3><p>{segment.legs.map((leg) => leg.hint).join(' ')}</p><small>{Math.round(segment.distance)} m · {segment.minutes} min</small></div></article>;
}

export default App;
