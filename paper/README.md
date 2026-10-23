# IEEE systems-paper manuscript

`TrustInterview_IEEE_final.tex` is the current, self-contained IEEE conference source. Compile it twice with pdfLaTeX in Overleaf, or run `rtk proxy python paper/build_faculty_pdf.py --cached --final` from the workspace root. The compiled eight-page PDF is `../output/pdf/TrustInterview_IEEE_final.pdf`.

The current paper reports 91 backend tests, six interface tests, twelve analysis-tool tests and nine authored current-policy boundary probes. The separate 48-record pilot is an older offline recording artifact. Neither the probes nor the pilot measure live-model grounding accuracy or demographic fairness. The current keyword score is a software test fixture, not a validated student grading rubric. The research code is locally modified and has not been represented as an immutable public release.

The nine-probe script is `../TrustInterview-AI/backend/research/evaluation/characterize-current-policy.cjs`; its JSON output is `../output/chunk28/current-policy-probes.json`. The Zero Trust negative-case audit is `../output/chunk30/ZTA_Negative_Cases.md`; the latest backend JUnit report is `../output/chunk30/backend-tests.xml`.

`TrustInterview_IEEE_college.tex` and `TrustInterview_IEEE_faculty.tex` preserve earlier drafts. `build_college_source.py` regenerates the older college draft and must not be run over the final source.

Authors should verify names, affiliation, acknowledgment, bibliography metadata and the exact venue page limit before submission. The manuscript reports a prototype and preliminary verification, not measured live-model efficacy. No AI-detector or plagiarism score can be guaranteed.
