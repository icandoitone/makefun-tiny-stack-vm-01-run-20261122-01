# Tiny Stack VM

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/icandoitone/makefun-tiny-stack-vm-01-run-20261122-01/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/icandoitone/makefun-tiny-stack-vm-01-run-20261122-01/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

A complete interpreter for make.fun's tiny stack ISA (v1). One run answers
all 40 programs of a set, reading `/input/<id>/program.bin` + `input.bin`
and writing `/output/<id>/stdout.bin` + `exit.txt` — wrapping 32-bit
arithmetic, all ten traps, and the step and output caps. Deterministic,
Node 22 standard library only.

```sh
mkdir -p out
MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```
