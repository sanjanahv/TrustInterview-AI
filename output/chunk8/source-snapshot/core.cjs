'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');

const POLICY_VERSION = 'research-0.1';
class Denial extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const id = () => crypto.randomUUID();
function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
}

// Structural grounding contract, not semantic entailment or a hallucination classifier.
function outputPolicy(output, evidence) {
  if (!exactKeys(output, ['observations', 'recommendation']) || !Array.isArray(output.observations)
      || output.observations.length < 1 || output.observations.length > 10
      || !['practice', 'continue'].includes(output.recommendation)) {
    return { decision: 'abstain', reasons: ['invalid_output_contract'], policy: POLICY_VERSION };
  }
  const reasons = [];
  for (const observation of output.observations) {
    if (!exactKeys(observation, ['evidenceId', 'quote']) || typeof observation.quote !== 'string'
        || observation.quote.length < 1 || observation.quote.length > 1000
        || !Object.hasOwn(evidence, observation.evidenceId)
        || !evidence[observation.evidenceId].includes(observation.quote)) {
      reasons.push('unsupported_observation');
      continue;
    }
    // Conservative review triggers. These do not establish discriminatory treatment.
    if (/\b(age|gender|pregnan\w*|married|religion|caste|race|disab\w*)\b/i.test(observation.quote)) {
      reasons.push('sensitive_attribute_reference');
    }
    if (/\b(ignore (all |previous |prior )?instructions|system prompt|override policy)\b/i.test(observation.quote)) {
      reasons.push('instruction_like_content');
    }
  }
  const unique = [...new Set(reasons)];
  return {
    decision: unique.includes('unsupported_observation') ? 'abstain' : unique.length ? 'review' : 'allow',
    reasons: unique, policy: POLICY_VERSION
  };
}

// Deliberately narrow, reproducible keyword rubric; not validated interview competence scoring.
function scoreAnswer(answer, rubric) {
  const terms = new Set(answer.toLowerCase().match(/[a-z]+/g) || []);
  const hits = rubric.terms.filter(term => terms.has(term));
  return { score: Math.round(100 * hits.length / rubric.terms.length),
    matchedTerms: hits, rubricVersion: rubric.version };
}

class Audit {
  constructor(file) {
    this.file = file;
    this.events = file && fs.existsSync(file)
      ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
    if (!Audit.verify(this.events)) throw new Error('audit_integrity_failure');
  }
  append(data) {
    const event = { sequence: this.events.length + 1, previousHash: this.events.at(-1)?.hash || '0', ...data };
    event.hash = digest(JSON.stringify(event));
    if (this.file) fs.appendFileSync(this.file, JSON.stringify(event) + '\n', { mode: 0o600 });
    this.events.push(event);
    return event;
  }
  static verify(events) {
    let previous = '0';
    for (let i = 0; i < events.length; i++) {
      const { hash, ...body } = events[i];
      if (body.sequence !== i + 1 || body.previousHash !== previous || digest(JSON.stringify(body)) !== hash) return false;
      previous = hash;
    }
    return true;
  }
}

class ResearchService {
  constructor({ principals, provider, audit = new Audit(), now = Date.now, sessionTTL = 900000,
    providerTimeout = 2000, providerVersion = 'fixture-v1' }) {
    if (!Array.isArray(principals) || !principals.length || typeof provider !== 'function') throw new Error('invalid_configuration');
    this.principals = principals.map(p => {
      if (!exactKeys(p, ['id', 'tenant', 'role', 'credential']) || !['candidate', 'reviewer'].includes(p.role)
          || ![p.id, p.tenant, p.credential].every(v => typeof v === 'string' && v.length)
          || Buffer.byteLength(p.credential) < 32) throw new Error('invalid_principal');
      return { id: p.id, tenant: p.tenant, role: p.role, credentialHash: digest(p.credential) };
    });
    if (new Set(this.principals.map(p => p.credentialHash)).size !== principals.length
        || new Set(this.principals.map(p => `${p.tenant}:${p.id}`)).size !== principals.length) throw new Error('duplicate_principal');
    this.provider = provider; this.providerVersion = providerVersion; this.audit = audit; this.now = now;
    this.sessionTTL = sessionTTL; this.providerTimeout = providerTimeout;
    this.sessions = new Map(); this.assessments = new Map(); this.cache = new Map(); this.loginAttempts = new Map();
    this.rubric = { version: 'keyword-v1', terms: ['identity', 'authorization', 'resource'],
      question: 'Explain how identity, authorization, and resource ownership affect access decisions.' };
  }
  event(requestId, action, decision, principal, extra = {}) {
    this.audit.append({ time: this.now(), requestId, action, decision, policy: POLICY_VERSION,
      principal: principal ? digest(`${principal.tenant}:${principal.id}`) : null, ...extra });
  }
  login(credential, requestId, peer = 'local') {
    const window = Math.floor(this.now() / 60000);
    const attempts = this.loginAttempts.get(peer);
    const count = attempts?.window === window ? attempts.count + 1 : 1;
    this.loginAttempts.set(peer, { window, count });
    if (count > 10) { this.event(requestId, 'login', 'deny', null); throw new Denial(429, 'login_rate_limit'); }
    const hash = digest(typeof credential === 'string' ? credential : '');
    const principal = this.principals.find(p => crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(p.credentialHash)));
    if (!principal) { this.event(requestId, 'login', 'deny', null); throw new Denial(401, 'invalid_credential'); }
    const token = crypto.randomBytes(32).toString('base64url');
    this.sessions.set(digest(token), { principal, expires: this.now() + this.sessionTTL });
    this.event(requestId, 'login', 'allow', principal);
    return { token, expires: this.now() + this.sessionTTL };
  }
  authenticate(token) {
    const key = digest(token || ''); const session = this.sessions.get(key);
    if (!session || session.expires <= this.now()) { this.sessions.delete(key); throw new Denial(401, 'invalid_session'); }
    return { ...session.principal, sessionKey: key };
  }
  revoke(principal, requestId) {
    this.sessions.delete(principal.sessionKey);
    for (const [key, entry] of this.cache) if (entry.session === principal.sessionKey) this.cache.delete(key);
    this.event(requestId, 'logout', 'allow', principal);
    return { revoked: true };
  }
  authorize(principal, assessmentId, role) {
    if (principal.role !== role) throw new Denial(403, 'role_denied');
    const assessment = this.assessments.get(assessmentId);
    if (!assessment || assessment.tenant !== principal.tenant
        || (role === 'candidate' && assessment.owner !== principal.id)) throw new Denial(404, 'resource_not_found');
    return assessment;
  }
  create(principal, body, requestId) {
    if (principal.role !== 'candidate') throw new Denial(403, 'role_denied');
    if (!exactKeys(body, [])) throw new Denial(400, 'unexpected_fields');
    const assessment = { id: id(), tenant: principal.tenant, owner: principal.id, state: 'awaiting_answer',
      question: this.rubric.question, rubricVersion: this.rubric.version };
    this.assessments.set(assessment.id, assessment);
    this.event(requestId, 'create', 'allow', principal, { assessmentId: assessment.id });
    return { id: assessment.id, question: assessment.question };
  }
  async submit(principal, assessmentId, body, requestId) {
    const a = this.authorize(principal, assessmentId, 'candidate');
    if (!exactKeys(body, ['answer']) || typeof body.answer !== 'string' || !body.answer.trim() || body.answer.length > 5000)
      throw new Denial(400, 'invalid_answer');
    if (a.state !== 'awaiting_answer') throw new Denial(409, 'invalid_state');
    a.state = 'evaluating'; // synchronous transition prevents concurrent/replayed submissions.
    const answer = body.answer;
    const evidence = { answer, question: a.question };
    a.evidence = structuredClone(evidence);
    const cacheKey = digest(JSON.stringify([principal.tenant, principal.id, principal.sessionKey,
      a.id, answer, this.rubric.version, this.providerVersion, POLICY_VERSION]));
    let timer;
    try {
      const output = await Promise.race([
        Promise.resolve().then(() => this.provider(structuredClone(evidence))),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('provider_timeout')), this.providerTimeout); })
      ]);
      // Recheck session after asynchronous untrusted provider work.
      if (!this.sessions.has(principal.sessionKey) || this.sessions.get(principal.sessionKey).expires <= this.now())
        throw new Error('session_changed');
      const policy = outputPolicy(output, evidence);
      a.policy = policy; a.state = policy.decision === 'allow' ? 'released' : policy.decision === 'review' ? 'pending_review' : 'abstained';
      a.score = scoreAnswer(answer, this.rubric); a.output = structuredClone(output);
      // Only validated releases enter cache. Cache is not a policy bypass or a source of scores.
      if (a.state === 'released') this.cache.set(cacheKey, { session: principal.sessionKey, expires: this.now() + 60000, output: structuredClone(output) });
      this.event(requestId, 'submit', policy.decision, principal, { assessmentId, reasons: policy.reasons, provider: this.providerVersion });
    } catch (error) {
      a.state = 'abstained'; a.policy = { decision: 'abstain', reasons: ['provider_or_session_failure'], policy: POLICY_VERSION };
      this.event(requestId, 'submit', 'abstain', principal, { assessmentId, reasons: a.policy.reasons });
    } finally { clearTimeout(timer); }
    return this.view(principal, assessmentId);
  }
  view(principal, assessmentId) {
    const a = this.authorize(principal, assessmentId, 'candidate');
    return { id: a.id, state: a.state, policy: a.policy || null,
      ...(a.state === 'released' ? { score: structuredClone(a.score), feedback: structuredClone(a.output) } : {}) };
  }
  review(principal, assessmentId, body, requestId) {
    const a = this.authorize(principal, assessmentId, 'reviewer');
    if (!exactKeys(body, ['decision', 'reason']) || !['approve', 'reject'].includes(body.decision)
        || typeof body.reason !== 'string' || body.reason.trim().length < 10 || body.reason.length > 1000)
      throw new Denial(400, 'invalid_review');
    if (a.state !== 'pending_review') throw new Denial(409, 'invalid_state');
    a.state = body.decision === 'approve' ? 'released' : 'rejected';
    a.review = { reviewer: principal.id, reason: body.reason, decision: body.decision };
    this.event(requestId, 'review', body.decision, principal, { assessmentId, reasonHash: digest(body.reason) });
    return { id: a.id, state: a.state };
  }
  reviewItem(principal, assessmentId) {
    const a = this.authorize(principal, assessmentId, 'reviewer');
    if (a.state !== 'pending_review') throw new Denial(409, 'invalid_state');
    return { id: a.id, policy: structuredClone(a.policy), evidence: structuredClone(a.evidence),
      feedback: structuredClone(a.output), score: structuredClone(a.score) };
  }
}
module.exports = { ResearchService, Audit, Denial, outputPolicy, scoreAnswer, POLICY_VERSION };
