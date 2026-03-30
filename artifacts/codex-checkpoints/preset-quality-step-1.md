Preset quality metric seam identified.

- Files inspected: `packages/shared-engine/score.ts`, `packages/shared-engine/learning/compute-corpus-affinity.ts`, `packages/shared-engine/tests/learning-effectiveness.test.ts`
- Plan: add a paired OFF/ON corpus-prior report using `scoreCandidates` survivors and the shipped rerank signal `score + corpusAffinity * weight`
- Next: implement helper, report script, artifact, and one non-regression test
