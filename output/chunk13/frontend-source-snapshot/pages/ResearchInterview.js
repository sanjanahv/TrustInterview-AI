import React, { useEffect, useRef, useState } from 'react';
import './ResearchInterview.css';

export default function ResearchInterview() {
  const [credential, setCredential] = useState('');
  const [authMode, setAuthMode] = useState('loading');
  const [session, setSession] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [answer, setAnswer] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [existingId, setExistingId] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [reviewItem, setReviewItem] = useState(null);
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState('reject');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const epoch = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const response = await fetch('/api/research/auth/config');
        const config = await response.json();
        if (!response.ok || !['local', 'google'].includes(config.mode)) throw new Error('Sign-in configuration is unavailable.');
        if (cancelled) return;
        setAuthMode(config.mode);
        const url = new URL(window.location.href);
        if (config.mode === 'google' && url.searchParams.get('auth') === 'complete') {
          url.searchParams.delete('auth'); window.history.replaceState(null, '', url.pathname + url.search + url.hash);
          setBusy(true);
          const completed = await fetch('/api/research/oauth/session', { method: 'POST',
            headers: { 'Content-Type': 'application/json' }, body: '{}' });
          const data = await completed.json();
          if (!completed.ok || !data.token || !['candidate', 'reviewer'].includes(data.role)) throw new Error('Google sign-in could not be completed. Please try again.');
          if (!cancelled) setSession(data);
        }
      } catch (failure) { if (!cancelled) setError(failure.message); }
      finally { if (!cancelled) setBusy(false); }
    }
    initialize();
    return () => { cancelled = true; };
  }, []);

  function clearSession() {
    epoch.current += 1;
    setSession(null); setCredential(''); setAssessment(null); setAnswer(''); setExistingId('');
    setResumeText('');
    setReviewItem(null); setReviewId(''); setReason('');
  }
  async function request(path, method = 'GET', body, token = session?.token) {
    const response = await fetch(`/api/research${path}`, {
      method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 && token) clearSession();
      throw new Error(response.status === 401 ? 'Your session is invalid. Please sign in again.' : `Request denied: ${data.error || response.status}`);
    }
    return data;
  }
  async function perform(work, apply) {
    const current = epoch.current;
    setBusy(true); setError('');
    try {
      const data = await work();
      if (current === epoch.current) apply(data);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  function signIn(event) {
    event.preventDefault();
    perform(() => request('/session', 'POST', { credential }, null), data => {
      setSession(data); setCredential('');
    });
  }
  function signOut() {
    const token = session.token;
    clearSession();
    perform(() => request('/session', 'DELETE', undefined, token), () => {});
  }
  const stateLabels = { awaiting_answer: 'Awaiting your answer', evaluating: 'Evaluation in progress',
    released: 'Result released', pending_review: 'Held for authorized review', abstained: 'No result released', rejected: 'Release rejected by reviewer' };

  return <main className="research-page">
    <header><p className="research-kicker">TrustInterview AI</p><h1>Research interview</h1>
      <p>This prototype uses an offline feedback fixture and a fixed keyword rubric. Scores are for testing the workflow, not hiring decisions.</p>
    </header>
    {error && <p role="alert" className="research-error">{error}</p>}
    {!session ? <section className="research-card"><h2>Sign in</h2>
      {authMode === 'loading' && <p>Checking sign-in availability...</p>}
      {authMode === 'google' && <a href="/api/research/oauth/google/start">Continue with Google</a>}
      {authMode === 'local' && <form onSubmit={signIn}><label htmlFor="credential">Provisioned credential</label>
        <input id="credential" type="password" autoComplete="off" value={credential} onChange={e => setCredential(e.target.value)} required />
        <button disabled={busy}>Sign in</button>
      </form>}
    </section> : <>
      <div className="research-session"><p>Signed in as {session.role}</p><button onClick={signOut} disabled={busy}>Sign out</button></div>
      {session.role === 'candidate' && <section className="research-card"><h2>Candidate assessment</h2>
        {!assessment ? <><button disabled={busy} onClick={() => perform(() => request('/assessments', 'POST', {}), data => {
          setAssessment({ ...data, state: 'awaiting_answer' }); setAnswer(''); setResumeText('');
        })}>Start assessment</button>
          <form onSubmit={event => { event.preventDefault(); perform(() => request(`/assessments/${encodeURIComponent(existingId.trim())}`), data => {
            setAssessment(data); setExistingId(''); setResumeText('');
          }); }}><label htmlFor="existing-id">Existing assessment ID</label><input id="existing-id" required value={existingId} onChange={e => setExistingId(e.target.value)} />
            <button disabled={busy}>Open assessment</button>
          </form>
        </> : <>
          <p><strong>Assessment ID:</strong> <code>{assessment.id}</code></p>
          <p role="status">{stateLabels[assessment.state] || assessment.state}</p>
          {assessment.question && <p>{assessment.question}</p>}
          {assessment.resume && <p>Resume source attached. Candidate supplied; qualifications have not been verified.</p>}
          {assessment.state === 'awaiting_answer' && !assessment.resume && <form onSubmit={event => {
            event.preventDefault(); perform(() => request(`/assessments/${assessment.id}/resume`, 'POST', { text: resumeText }), data => {
              setAssessment(data); setResumeText('');
            });
          }}><label htmlFor="resume-text">Resume text (optional)</label>
            <p>Paste plain text. Attach once before answering. PDF and OCR uploads are not supported in this prototype.</p>
            <textarea id="resume-text" required maxLength={8000} value={resumeText} onChange={e => setResumeText(e.target.value)} />
            <button disabled={busy}>Attach resume evidence</button>
          </form>}
          {assessment.state === 'awaiting_answer' && <form onSubmit={event => {
            event.preventDefault(); perform(() => request(`/assessments/${assessment.id}/answer`, 'POST', { answer }), data => {
              setAssessment(previous => ({ ...previous, ...data })); setAnswer('');
            });
          }}><label htmlFor="answer">Your answer</label><textarea id="answer" maxLength={5000} required value={answer} onChange={e => setAnswer(e.target.value)} />
            <button disabled={busy}>Submit answer</button>
          </form>}
          {assessment.state === 'released' && assessment.score && <div>
            <h3>Test rubric score: {assessment.score.score}/100</h3>
            <p>Matched rubric terms: {assessment.score.matchedTerms.join(', ') || 'None'}</p>
            <h3>Evidence quotations</h3>{assessment.feedback.observations.map((o, i) => <blockquote key={i}>{o.quote}<footer>Source: {o.evidenceId}</footer></blockquote>)}
          </div>}
          {assessment.policy?.reasons?.length > 0 && <p>Policy reasons: {assessment.policy.reasons.join(', ')}</p>}
          <button disabled={busy} onClick={() => perform(() => request(`/assessments/${assessment.id}`), data => setAssessment(previous => ({ ...previous, ...data })))}>Refresh result</button>
          {['released', 'abstained', 'rejected'].includes(assessment.state) && <button disabled={busy} onClick={() => setAssessment(null)}>New assessment</button>}
        </>}
      </section>}
      {session.role === 'reviewer' && <section className="research-card"><h2>Pending output review</h2>
        <form onSubmit={event => { event.preventDefault(); setReviewItem(null); perform(() => request(`/reviews/${encodeURIComponent(reviewId.trim())}`), setReviewItem); }}>
          <label htmlFor="review-id">Assessment ID</label><input id="review-id" required value={reviewId} onChange={e => setReviewId(e.target.value)} />
          <button disabled={busy}>Load pending review</button>
        </form>
        {reviewItem && <div><h3>Evidence available to reviewer</h3><p>{reviewItem.evidence.question}</p><blockquote>{reviewItem.evidence.answer}</blockquote>
          {reviewItem.evidence.resume && <><h4>Candidate supplied resume</h4><blockquote>{reviewItem.evidence.resume}</blockquote></>}
          <p>Policy reasons: {reviewItem.policy.reasons.join(', ')}</p>
          <h3>Proposed quotations</h3>{reviewItem.feedback.observations.map((o, i) => <blockquote key={i}>{o.quote}</blockquote>)}
          <form onSubmit={event => { event.preventDefault(); perform(() => request(`/reviews/${reviewItem.id}`, 'POST', { decision, reason }), () => {
            setReviewItem(null); setReason(''); setReviewId('');
          }); }}>
            <label htmlFor="decision">Release decision</label><select id="decision" value={decision} onChange={e => setDecision(e.target.value)}><option value="reject">Reject release</option><option value="approve">Approve release</option></select>
            <label htmlFor="reason">Review reason</label><textarea id="reason" required minLength={10} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} />
            <button disabled={busy}>Record review decision</button>
          </form>
        </div>}
      </section>}
    </>}
  </main>;
}
