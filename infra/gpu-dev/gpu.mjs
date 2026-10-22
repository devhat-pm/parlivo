#!/usr/bin/env node
// On-demand NVIDIA L4 benchmark box on RunPod (ADR 0009). Never left running: `pnpm gpu:down`.
//
//   pnpm gpu:login            store the RunPod API key in the macOS Keychain (prompted, hidden)
//   pnpm gpu:up               create (or start) the pod and wait for SSH
//   pnpm gpu:bootstrap        clone the repo at HEAD and install the GPU stack on the pod
//   pnpm gpu:ssh [-- args]    SSH into the pod (extra args go to ssh, e.g. -L 8300:localhost:8300)
//   pnpm gpu:status           state, GPU, $/h and uptime cost
//   pnpm gpu:stop             stop the pod (container disk wiped, volume kept and billed)
//   pnpm gpu:down             terminate the pod (nothing left, nothing billed)
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const API = "https://rest.runpod.io/v1";
const KEYCHAIN_SERVICE = "parlivo-runpod";
const STATE_DIR = join(homedir(), ".config", "parlivo");
const STATE = join(STATE_DIR, "gpu-pod.json");
const SSH_KEY = join(homedir(), ".ssh", "parlivo_gpu_ed25519");
const POD = {
  name: "parlivo-gpu-dev",
  imageName: "runpod/base:1.4.1-cuda1290-ubuntu2404",
  computeType: "GPU",
  gpuTypeIds: ["NVIDIA L4"],
  gpuCount: 1,
  cloudType: "SECURE",
  containerDiskInGb: 60,
  volumeInGb: 0,
  ports: ["22/tcp"],
  minRAMPerGPU: 16,
};

function apiKey() {
  if (process.env.RUNPOD_API_KEY) return process.env.RUNPOD_API_KEY;
  const found = spawnSync("security", ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"], {
    encoding: "utf8",
  });
  if (found.status !== 0) throw new Error("No RunPod API key: run `pnpm gpu:login` first.");
  return found.stdout.trim();
}

async function api(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${apiKey()}`, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

const readState = () => (existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {});
const writeState = (state) => {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE, JSON.stringify(state, null, 2));
};

async function promptHidden(question) {
  process.stdout.write(question);
  const rl = createInterface({ input: process.stdin, terminal: true });
  rl._writeToOutput = () => undefined; // do not echo the key
  const answer = await new Promise((resolve) => rl.question("", resolve));
  rl.close();
  process.stdout.write("\n");
  return answer.trim();
}

async function login() {
  const key = await promptHidden("RunPod API key (input hidden): ");
  if (!key) throw new Error("empty key");
  // `security -i` reads the command from stdin, so the key never appears in a process list.
  execFileSync("security", ["-i"], {
    input: `add-generic-password -U -s ${KEYCHAIN_SERVICE} -a parlivo -w ${key}\n`,
  });
  const me = await fetch(`${API}/pods`, { headers: { authorization: `Bearer ${key}` } });
  console.log(
    me.ok ? "Stored in the Keychain and verified." : `Stored, but RunPod said ${me.status}.`,
  );
}

function ensureSshKey() {
  if (!existsSync(SSH_KEY)) {
    execFileSync("ssh-keygen", ["-t", "ed25519", "-N", "", "-C", "parlivo-gpu", "-f", SSH_KEY]);
  }
  return readFileSync(`${SSH_KEY}.pub`, "utf8").trim();
}

function sshTarget(pod) {
  const port = pod.portMappings?.["22"];
  if (!pod.publicIp || !port) return null;
  return { host: pod.publicIp, port: String(port) };
}

async function waitForSsh(id) {
  for (let i = 0; i < 120; i += 1) {
    const pod = await api("GET", `/pods/${id}`);
    const target = sshTarget(pod);
    if (pod.desiredStatus === "RUNNING" && target) {
      const ok = spawnSync("ssh", [...sshArgs(target), "true"], { stdio: "ignore" }).status === 0;
      if (ok) return { pod, target };
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("pod did not become reachable over SSH within 10 minutes");
}

function sshArgs(target) {
  return [
    "-i",
    SSH_KEY,
    "-p",
    target.port,
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "UserKnownHostsFile=/dev/null",
    "-o",
    "LogLevel=ERROR",
    "-o",
    "ConnectTimeout=8",
    `root@${target.host}`,
  ];
}

async function up() {
  const state = readState();
  let id = state.podId;
  if (id) {
    const pod = await api("GET", `/pods/${id}`).catch(() => null);
    if (!pod) id = undefined;
    else if (pod.desiredStatus !== "RUNNING") await api("POST", `/pods/${id}/start`);
  }
  if (!id) {
    const pod = await api("POST", "/pods", { ...POD, env: { PUBLIC_KEY: ensureSshKey() } });
    id = pod.id;
    writeState({ podId: id, createdAt: new Date().toISOString() });
    console.log(`created pod ${id} (${POD.gpuTypeIds[0]}, ${POD.cloudType})`);
  }
  const { pod, target } = await waitForSsh(id);
  writeState({ ...readState(), podId: id, startedAt: pod.lastStartedAt, costPerHr: pod.costPerHr });
  console.log(
    `ready: ${pod.gpu?.displayName ?? "GPU"} at $${pod.costPerHr}/h  ssh -p ${target.port} root@${target.host}`,
  );
}

async function current() {
  const { podId } = readState();
  if (!podId) throw new Error("no pod: run `pnpm gpu:up`");
  return api("GET", `/pods/${podId}`);
}

async function ssh(extra, input) {
  const target = sshTarget(await current());
  if (!target) throw new Error("pod has no SSH endpoint (stopped?)");
  const child = spawn("ssh", [...sshArgs(target), ...extra], {
    stdio: input ? ["pipe", "inherit", "inherit"] : "inherit",
  });
  if (input) child.stdin.end(input);
  const code = await new Promise((resolve) => child.on("exit", resolve));
  if (code !== 0) process.exitCode = code ?? 1;
}

async function bootstrap() {
  const ref = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const script = readFileSync(new URL("./bootstrap.sh", import.meta.url), "utf8");
  await ssh(["REF=" + ref, "bash", "-s"], script);
}

async function status() {
  const { podId } = readState();
  if (!podId) return console.log("no pod (nothing running, nothing billed)");
  const pod = await api("GET", `/pods/${podId}`).catch(() => null);
  if (!pod) return console.log(`pod ${podId} no longer exists`);
  const hours = pod.lastStartedAt ? (Date.now() - Date.parse(pod.lastStartedAt)) / 3.6e6 : 0;
  console.log(
    JSON.stringify(
      {
        id: pod.id,
        status: pod.desiredStatus,
        gpu: pod.gpu?.displayName,
        costPerHr: pod.costPerHr,
        sinceLastStart: `${hours.toFixed(2)} h`,
        estimatedCostSinceStart:
          pod.desiredStatus === "RUNNING"
            ? `$${(hours * pod.costPerHr).toFixed(2)}`
            : "$0 (stopped)",
      },
      null,
      2,
    ),
  );
}

async function stop() {
  const pod = await current();
  await api("POST", `/pods/${pod.id}/stop`);
  console.log(`stopped ${pod.id}`);
}

async function down() {
  const { podId } = readState();
  if (podId) {
    await api("DELETE", `/pods/${podId}`).catch((error) => console.error(String(error)));
    console.log(`terminated ${podId}`);
  }
  rmSync(STATE, { force: true });
}

const [command, ...rest] = process.argv.slice(2);
const commands = { login, up, bootstrap, ssh: () => ssh(rest), status, stop, down };
if (!commands[command]) {
  console.error(`usage: gpu.mjs ${Object.keys(commands).join("|")}`);
  process.exit(2);
}
await commands[command]();
