// Tiny stack VM (ISA v1): runs every program in /input, writing each program's
// bytes and exit code under /output. Deterministic: no clock, no randomness.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIG = new Uint8Array(12);

// Per-opcode shape [byte, pops, pushes]; immediates follow from the byte
// (1: 1, 2: 4, 0x30-0x33: 2). A byte missing here is no opcode (trap 5).
const IMM = new Int8Array(256).fill(-1);
const POPS = new Int8Array(256);
const PUSHES = new Int8Array(256);
for (const [b, p, g] of [[0,0,0],[1,0,1],[2,0,1],[3,1,0],[4,1,2],[5,2,2],[6,2,3],[7,3,3],[16,2,1],[17,2,1],[18,2,1],[19,2,1],[20,2,1],[21,2,1],[22,2,1],[23,1,1],[24,2,1],[25,2,1],[26,2,1],[27,1,1],[28,2,1],[29,2,1],[30,2,1],[32,2,1],[33,2,1],[34,2,1],[48,0,0],[49,1,0],[50,1,0],[51,0,0],[52,0,0],[64,1,1],[65,2,0],[80,1,0],[81,1,0],[82,0,1],[83,1,0]]) {
  IMM[b] = b === 1 ? 1 : b === 2 ? 4 : b >= 48 && b <= 51 ? 2 : 0;
  POPS[b] = p;
  PUSHES[b] = g;
}

function execute(p: Uint8Array, inp: Uint8Array) {
  const stack = new Int32Array(256), calls = new Int32Array(64), mem = new Int32Array(256), out = new Uint8Array(65536);
  let sp = 0, cp = 0, pc = 0, ip = 0, olen = 0, steps = 0;
  const finish = (code: number) => ({ bytes: out.subarray(0, olen), code });

  for (;;) {
    if (steps === 1000000) return finish(10);
    if (pc < 0 || pc >= p.length) return finish(9);
    const op = p[pc], imm = IMM[op];
    if (imm < 0) return finish(5);
    if (pc + imm >= p.length) return finish(9);
    steps++;
    const next = pc + 1 + imm;
    const need = POPS[op];
    if (sp < need || sp - need + PUSHES[op] > 256) return finish(sp < need ? 2 : 3);
    pc = next;
    switch (op) {
      case 0x00:
        return finish(0);
      case 0x01:
        stack[sp++] = (p[next - 1] << 24) >> 24;
        break;
      case 0x02:
        stack[sp++] = p[next - 4] | (p[next - 3] << 8) | (p[next - 2] << 16) | (p[next - 1] << 24);
        break;
      case 0x03:
        sp--;
        break;
      case 0x04:
        stack[sp] = stack[sp-1];
        sp++;
        break;
      case 0x05:
        [stack[sp - 1], stack[sp - 2]] = [stack[sp - 2], stack[sp - 1]];
        break;
      case 0x06:
        stack[sp] = stack[sp-2];
        sp++;
        break;
      case 0x07:
        [stack[sp - 3], stack[sp - 2], stack[sp - 1]] = [stack[sp - 2], stack[sp - 1], stack[sp - 3]];
        break;
      case 0x17:
        stack[sp-1] = -stack[sp-1];
        break;
      case 0x1b:
        stack[sp-1] = ~stack[sp-1];
        break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16: case 0x18:
      case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e: case 0x20: case 0x21: case 0x22: {
        const b = stack[sp-1], a = stack[sp-2];
        let r: number;
        if (op >= 0x13 && op <= 0x16 && b === 0) return finish(4);
        if (op === 0x10) r = (a + b) | 0;
        else if (op === 0x11) r = (a - b) | 0;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        else if (op === 0x14) r = b === -1 ? 0 : (a % b) | 0;
        else if (op === 0x15) r = ((a >>> 0) / (b >>> 0)) | 0;
        else if (op === 0x16) r = ((a >>> 0) % (b >>> 0)) | 0; else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2;
        stack[sp++] = r;
        break;
      }
      case 0x30:
      case 0x31:
      case 0x32: {
        const rel = ((p[next - 2] | (p[next - 1] << 8)) << 16) >> 16;
        const v = op === 0x30 ? 0 : stack[--sp];
        if (op === 0x30 || (op === 0x31) === (v === 0)) pc = next + rel;
        break;
      }
      case 0x33:
        if (cp === 64) return finish(7);
        calls[cp++] = next;
        pc = p[next - 2] | (p[next - 1] << 8);
        break;
      case 0x34:
        if (cp === 0) return finish(8);
        pc = calls[--cp];
        break;
      case 0x40: {
        const a = stack[sp-1];
        if (a < 0 || a > 255) return finish(6);
        stack[sp-1] = mem[a];
        break;
      }
      case 0x41: {
        const a = stack[sp-1], v = stack[sp-2];
        if (a < 0 || a > 255) return finish(6);
        sp -= 2;
        mem[a] = v;
        break;
      }
      case 0x50: {
        // Decimal digits, built backwards in DIG then copied in; -INT_MIN is 2147483648, exact as a double.
        let v = stack[--sp], u = v < 0 ? -v : v, q = 12;
        do {
          DIG[--q] = 48 + (u % 10);
          u = (u / 10) | 0;
        } while (u > 0);
        if (v < 0) DIG[--q] = 45;
        if (olen + (12 - q) > 65536) return finish(11);
        out.set(DIG.subarray(q), olen);
        olen += 12 - q;
        break;
      }
      case 0x51:
        if (olen + 1 > 65536) return finish(11);
        out[olen++] = stack[--sp] & 255;
        break;
      case 0x52:
        stack[sp++] = ip < inp.length ? inp[ip++] : -1;
        break;
      case 0x53:
        return finish(stack[--sp] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = execute(readFileSync(`${I}/${id}/program.bin`), readFileSync(`${I}/${id}/input.bin`));
  mkdirSync(`${O}/${id}`, { recursive: true });
  writeFileSync(`${O}/${id}/stdout.bin`, r.bytes);
  writeFileSync(`${O}/${id}/exit.txt`, `${r.code}\n`);
}
