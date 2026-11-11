let locations = [];
let stopCount = 0;
const byId = (id) => document.getElementById(id);

async function init() {
  locations = await fetch('/api/locations').then((response) => response.json());
  populateSelect(byId('start'));
  populateSelect(byId('destination'));
  drawCampus();
  byId('add-stop').addEventListener('click', addMiddleStop);
  byId('find-route').addEventListener('click', findRoute);
  byId('start').value = 'gate';
  byId('destination').value = 'library';
}

function populateSelect(select) {
  select.innerHTML = locations.map((place) => `<option value="${place.id}">${place.name}</option>`).join('');
}

function addMiddleStop() {
  if (stopCount >= 3) return;
  stopCount += 1;
  const wrapper = document.createElement('label');
  wrapper.className = 'middle-stop';
  wrapper.innerHTML = `Middle stop ${stopCount}<select>${locations.map((place) => `<option value="${place.id}">${place.name}</option>`).join('')}</select>`;
  byId('middle-stops').appendChild(wrapper);
}

function selectedStops() {
  return [byId('start').value, ...[...document.querySelectorAll('#middle-stops select')].map((select) => select.value), byId('destination').value];
}

async function findRoute() {
  const stops = selectedStops();
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const response = await fetch(`/api/route?stops=${stops.join(',')}&mode=${mode}`);
  const data = await response.json();
  if (!response.ok) { byId('results').innerHTML = `<div class="empty error">${data.error}</div>`; return; }
  renderRoute(data, stops);
}

function drawCampus() {
  const nodeMap = Object.fromEntries(locations.map((place) => [place.id, place]));
  byId('paths').innerHTML = campusEdgesPlaceholder(nodeMap);
  byId('markers').innerHTML = locations.map((place) => `<g class="marker" transform="translate(${place.x},${place.y})"><circle r="7"></circle><text y="-14">${place.name.split(' (')[0]}</text></g>`).join('');
}

function campusEdgesPlaceholder(nodeMap) {
  const edges = [['gate','sg'],['sg','circle'],['sg','srix'],['srix','canteen'],['circle','block3'],['circle','ground'],['circle','girls'],['girls','boys'],['circle','ece'],['ece','library'],['library','b810'],['library','block1'],['library','canteen'],['canteen','block1'],['block1','gym'],['block1','cultural']];
  return edges.map(([a,b]) => `<line x1="${nodeMap[a].x}" y1="${nodeMap[a].y}" x2="${nodeMap[b].x}" y2="${nodeMap[b].y}"></line>`).join('');
}

function renderRoute(data, stops) {
  const names = stops.map((id) => locations.find((place) => place.id === id).name);
  byId('journey-title').textContent = `${names[0]} → ${names[names.length - 1]}`;
  byId('metrics').innerHTML = `<strong>${Math.round(data.distance)} m</strong><span>distance</span><strong>${data.minutes} min</strong><span>walk time</span>`;
  const routeNodes = data.segments.flatMap((segment, index) => index ? segment.nodes.slice(1) : segment.nodes);
  byId('route-line').innerHTML = routeNodes.slice(0, -1).map((place, index) => { const next = routeNodes[index + 1]; return `<line class="route-stroke" x1="${place.x}" y1="${place.y}" x2="${next.x}" y2="${next.y}"></line>`; }).join('');
  byId('results').innerHTML = data.segments.map((segment, index) => `<article class="segment"><div class="segment-image"><img src="${segment.to.image}" alt="${segment.to.name}"></div><div class="segment-copy"><span class="step">STOP ${index + 1} / ${data.segments.length}</span><h3>${segment.from.name} <b>→</b> ${segment.to.name}</h3><p>${segment.legs.map((leg) => leg.hint).join(' ')}</p><small>${Math.round(segment.distance)} m · ${segment.minutes} min</small></div></article>`).join('');
}

init();
