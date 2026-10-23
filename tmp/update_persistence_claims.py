from pathlib import Path
paper = Path('paper/TrustInterview_IEEE_working.tex')
source = paper.read_text(encoding='utf-8')
section = r'''
\subsection{Transactional Persistence and Restart Recovery}

The subsequent reference release replaces volatile assessment storage in the default API with a single-process SQLite store. An assessment transition and its correlated audit event commit within one transaction. Server-held record versions reject stale updates, and exclusive database ownership prevents another service instance from applying recovery to active work. Pending evidence and recorded review decisions remain available after reopening the database. Sessions are intentionally volatile, so previously issued bearer tokens become invalid after restart.

An interrupted evaluation is recovered as abstained with a recorded recovery reason. It is not automatically scored, replayed or released. Persistence checks exercise reopening, audit-failure rollback, stale-version rejection, owner and tenant enforcement, audit corruption and abrupt process exit. A separate HTTP test confirms that a released assessment can be retrieved after restart only with a fresh session. Together with the existing control tests, this release has twenty-seven passing backend tests. These are selected software checks; they do not certify hardware power-loss recovery, distributed operation, storage encryption or hiring-system efficacy. The earlier component benchmark retains its original in-memory configuration and is not a measurement of SQLite overhead.

'''
if r'\subsection{Transactional Persistence and Restart Recovery}' not in source:
    source = source.replace(r'\section{Evaluation}', section + r'\section{Evaluation}', 1)
replacements = {
    'The reference service uses provisioned credentials, volatile assessment state, an offline provider and a narrow keyword scorer.': 'The current reference service uses provisioned credentials, single-process SQLite assessment and audit storage, an offline provider and a narrow keyword scorer. Sessions and cache entries remain volatile.',
    'The next implementation step is integration with verified identity and transactional assessment storage, followed by a versioned live-model adapter and a frozen release.': 'The next implementation steps are verified external identity and resume-evidence integration, followed by a versioned live-model adapter and a frozen release. Single-process transactional assessment storage is implemented, but production persistence and backup requirements remain unvalidated.',
    'Transactional assessment persistence, verified external identity integration, semantic grounding, validated scoring, externally anchored audit storage and integration with the historical resume workflow remain required before the full protocol can be executed.': 'At the preliminary snapshot, transactional persistence was absent; the subsequent persistence subsection reports its limited implementation. Verified external identity integration, semantic grounding, validated scoring, externally anchored audit storage and integration with the historical resume workflow remain required before the full protocol can be executed.',
}
for old, new in replacements.items():
    if old not in source:
        raise RuntimeError('Missing persistence claim anchor: ' + old)
    source = source.replace(old, new)
paper.write_text(source, encoding='utf-8')
print('Manuscript distinguishes persistence release from historical benchmark.')
