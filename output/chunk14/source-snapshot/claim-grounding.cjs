'use strict';
// Controlled-language source comparison, not general entailment or truth verification.
const VERSION = 'explicit-use-v1';
const aliases = new Map([
  ['python', 'python'], ['java', 'java'], ['javascript', 'javascript'], ['js', 'javascript'],
  ['typescript', 'typescript'], ['ts', 'typescript'], ['c++', 'cpp'], ['cpp', 'cpp'],
  ['c#', 'csharp'], ['csharp', 'csharp'], ['node.js', 'nodejs'], ['nodejs', 'nodejs'],
  ['react', 'react'], ['react.js', 'react'], ['sql', 'sql'], ['postgresql', 'postgresql'],
  ['postgres', 'postgresql'], ['docker', 'docker'], ['kubernetes', 'kubernetes']
]);
function statements(text) {
  // A whole line is required: embedded instructions, reported speech and conditions are not assertions.
  return typeof text === 'string' ? text.split(/\r?\n/).map(line => line.trim()).filter(Boolean) : [];
}
function parse(line) {
  const match = /^I have (not )?used ([A-Za-z][A-Za-z0-9.+#-]{0,39})\.?$/i.exec(line);
  if (!match) return null;
  const technology = aliases.get(match[2].toLowerCase().replace(/\.$/, ''));
  return technology ? { technology, polarity: match[1] ? 'negative' : 'positive' } : null;
}
function claimGrounding(answer, resume) {
  const sourceLines = statements(resume);
  const source = sourceLines.map(quote => ({ quote, parsed: parse(quote) })).filter(x => x.parsed);
  const claims = [];
  for (const quote of statements(answer)) {
    if (!/^I have (?:not )?used\b/i.test(quote)) continue;
    const parsed = parse(quote);
    const candidates = parsed ? source.filter(x => x.parsed.technology === parsed.technology) : [];
    const agrees = candidates.filter(x => x.parsed.polarity === parsed?.polarity);
    const disagrees = candidates.filter(x => x.parsed.polarity !== parsed?.polarity);
    const label = !parsed || (!agrees.length && !disagrees.length) || (agrees.length && disagrees.length)
      ? 'undetermined' : agrees.length ? 'source_supported' : 'source_contradicted';
    const reason = !parsed ? 'outside_controlled_language' : typeof resume !== 'string' || !resume.trim()
      ? 'missing_resume' : agrees.length && disagrees.length ? 'conflicting_source_statements'
        : !candidates.length ? 'no_explicit_source_statement' : 'explicit_polarity_comparison';
    claims.push({ claimId: `claim-${claims.length + 1}`, quote, ...parsed, label, reason,
      evidence: candidates.map(x => ({ evidenceId: 'resume', quote: x.quote })) });
  }
  return { version: VERSION, scope: 'explicit_first_person_technology_use',
    qualificationVerification: 'not_verified', claims };
}
module.exports = { claimGrounding, VERSION };
