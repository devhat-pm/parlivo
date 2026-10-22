// k6 placeholder. Run with: k6 run tests/load/scripts/placeholder.js
// Real scenarios (concurrent streams, participant fan-out, pool C burst) arrive with
// the load-test prompt; see ARCHITECTURE.md section 5 for the targets.
export const options = { vus: 1, iterations: 1 };

export default function () {}
