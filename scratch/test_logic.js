const fs = require('fs');
const vm = require('vm');

// Read index.html and extract the JS script
const html = fs.readFileSync('index.html', 'utf8');
const scriptCode = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Setup Mock DOM Environment
const domElements = {};
const localStore = {};

function createMockElement(id) {
    return {
        id: id,
        style: { display: 'none' },
        innerText: '',
        src: '',
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
        }
    };
}

const documentMock = {
    querySelector: (selector) => {
        if (selector === '.container') return { style: { setProperty: (k, v) => { documentMock.containerDelay = v; } }, classList: { add: (c) => { documentMock.containerClass = c; }, remove: (c) => { documentMock.containerClass = ''; } } };
        if (selector === '.gol-overlay') return { addEventListener: () => {} };
        return null;
    },
    getElementById: (id) => {
        if (!domElements[id]) {
            domElements[id] = createMockElement(id);
        }
        return domElements[id];
    },
    containerClass: '',
    containerDelay: ''
};

const windowMock = {
    location: {
        get search() { return this._search || '?id=9'; },
        set search(v) { this._search = v; },
        reload() { windowMock.locationReloadCalled = true; }
    },
    locationReloadCalled: false
};

const localStorageMock = {
    getItem: (key) => localStore[key] || null,
    setItem: (key, val) => { localStore[key] = String(val); }
};

// Future match template (June 11, 2026 at 19:00:00)
const futureMatch = {
    fecha_hora: "2026-06-11 19:00:00",
    local: { nombre: "Ecuador", codigo_iso: "ECU", bandera: "ecuador.png" },
    visitante: { nombre: "Alemania", codigo_iso: "GER", bandera: "germany.png" },
    marcador: { local: 0, visitante: 0 },
    tiempo: { texto: "0'" },
    goles: []
};

// Mock fetch
const fetchMock = (url) => {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ partidos: [futureMatch] })
    });
};

// Create a context with mock globals
const context = {
    Date: Date,
    Math: Math,
    console: console,
    document: documentMock,
    window: windowMock,
    localStorage: localStorageMock,
    URLSearchParams: URLSearchParams, // Native URLSearchParams
    fetch: fetchMock,
    setInterval: () => {},
    setTimeout: (fn, ms) => { fn(); } // Call immediately for testing
};

console.log("=== COMPILING AND RUNNING SCRIPT IN MOCK DOM CONTEXT ===");
try {
    const script = new vm.Script(scriptCode);
    script.runInNewContext(context);
    console.log("Compilation and startup successful!\n");
} catch(err) {
    console.error("Compilation failed:", err);
    process.exit(1);
}

// --- TESTS ---

console.log("=== RUNNING TEST 1: Countdown Layout A (FALTAN X hrs) ===");
// Force layout A via URL state
windowMock.location._search = '?state=countdown-a&mockDate=2026-06-09T11:22:52';
context.updateDisplayState(futureMatch);

const bg = domElements['bg-template'];
const countdownPill = domElements['countdown-pill'];
const topLeftTeams = domElements['top-left-teams'];
const homeFlag = domElements['countdown-home-flag'];
const homeName = domElements['countdown-home-name'];
const awayFlag = domElements['countdown-away-flag'];
const awayName = domElements['countdown-away-name'];

const lblLeft = domElements['countdown-lbl-left'];
const lblHours = domElements['countdown-hours'];
const lblRight = domElements['countdown-lbl-right'];

console.assert(bg.src === './assets/Plantilla_conteo regresivo_samsung.jpg', `Expected countdown background, got ${bg.src}`);
console.assert(countdownPill.style.display === 'flex', "Expected countdown pill to be displayed");
console.assert(topLeftTeams.style.display === 'flex', "Expected top-left teams list to be displayed");
console.assert(homeFlag.src === 'ecuador.png', `Expected ecuador.png, got ${homeFlag.src}`);
console.assert(homeName.innerText === 'Ecuador', `Expected Ecuador, got ${homeName.innerText}`);
console.assert(awayFlag.src === 'germany.png', `Expected germany.png, got ${awayFlag.src}`);
console.assert(awayName.innerText === 'Alemania', `Expected Alemania, got ${awayName.innerText}`);

console.assert(lblLeft.innerText === 'FALTAN', `Expected FALTAN, got ${lblLeft.innerText}`);
console.assert(lblHours.innerText === 56, `Expected 56 hours, got ${lblHours.innerText}`);
console.assert(lblRight.innerText === 'hrs', `Expected hrs, got ${lblRight.innerText}`);
console.assert(countdownPill.classList.contains('layout-a'), "Expected class 'layout-a' to be set on countdownPill");
console.assert(!countdownPill.classList.contains('layout-b'), "Expected class 'layout-b' to be removed from countdownPill");
console.log("Test 1 Passed: Countdown Layout A verified!");

console.log("\n=== RUNNING TEST 2: Countdown Layout B (Hoy/Fecha H:MM PM) ===");
// Force layout B and mock system time to June 11, 2026 10:00:00 (approx 9 hours before match start, same day!)
windowMock.location._search = '?state=countdown-b&mockDate=2026-06-11T10:00:00';
context.updateDisplayState(futureMatch);

console.assert(bg.src === './assets/Plantilla_conteo regresivo_samsung.jpg', `Expected countdown background, got ${bg.src}`);
console.assert(lblLeft.innerText === 'Hoy', `Expected Hoy (since it is the same day), got ${lblLeft.innerText}`);
console.assert(lblHours.innerText === '7:00', `Expected 7:00 (19:00:00 is 7:00 PM), got ${lblHours.innerText}`);
console.assert(lblRight.innerText === 'PM', `Expected PM, got ${lblRight.innerText}`);
console.assert(countdownPill.classList.contains('layout-b'), "Expected class 'layout-b' to be set on countdownPill");
console.assert(!countdownPill.classList.contains('layout-a'), "Expected class 'layout-a' to be removed from countdownPill");
console.log("Test 2 Passed: Countdown Layout B verified!");

console.log("\n=== RUNNING TEST 3: Scoreboard Mode ===");
// Force layout C (Score)
windowMock.location._search = '?state=score';
context.updateDisplayState(futureMatch);

const homeCard = domElements['home-card'];
const awayCard = domElements['away-card'];
const clockOverlay = domElements['clock-overlay'];

console.assert(bg.src === './assets/Plantilla_score_samsung.jpg', `Expected scoreboard background, got ${bg.src}`);
console.assert(countdownPill.style.display === 'none', "Expected countdown pill to be hidden");
console.assert(topLeftTeams.style.display === 'none', "Expected top-left teams to be hidden");
console.assert(homeCard.style.display === 'flex', "Expected home card to be displayed");
console.assert(awayCard.style.display === 'flex', "Expected away card to be displayed");
console.assert(clockOverlay.style.display === 'flex', "Expected clock to be displayed");
console.log("Test 3 Passed: Scoreboard mode verified!");

console.log("\n=== RUNNING TEST 4: Goal Animation Overlay ===");
// Mock goal details
const goalMatch = {
    ...futureMatch,
    marcador: { local: 2, visitante: 0 },
    goles: [
        {
            minuto: 12,
            jugador: "Lozano",
            equipo: "Ecuador",
            equipo_codigo: "ECU"
        }
    ]
};

// Trigger goal animation
context.triggerGoalAnimation(2, 0, 1500, goalMatch.goles);

const golTitle = domElements['gol-title'];
const golScorer = domElements['gol-scorer'];
const homeScore = domElements['home-score'];

console.assert(documentMock.containerClass === 'is-goal', "Expected container to have class 'is-goal'");
console.assert(golTitle.innerText === '¡GOL DE ECU!', `Expected GOL DE ECU, got ${golTitle.innerText}`);
console.assert(golScorer.innerText === 'LOZANO (12\')', `Expected LOZANO (12'), got ${golScorer.innerText}`);
console.assert(String(homeScore.innerText) === '2', `Expected score to update to 2, got ${homeScore.innerText}`);
console.log("Test 4 Passed: Goal animation and text details verified!");

console.log("\nAll tests completed successfully!");
