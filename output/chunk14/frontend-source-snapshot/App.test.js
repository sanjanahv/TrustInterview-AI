import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

afterEach(() => { jest.restoreAllMocks(); window.history.replaceState(null, '', '/'); });

test('candidate sends only an answer and held results do not expose scores', async () => {
  const responses = [
    { mode: 'local' },
    { token: 'test-token', role: 'candidate' },
    { id: 'assessment-1', question: 'Explain access decisions.' },
    { id: 'assessment-1', state: 'pending_review', policy: { reasons: ['sensitive_attribute_reference'] },
      score: { score: 100, matchedTerms: [] }, feedback: { observations: [{ quote: 'withheld content' }] } }
  ];
  global.fetch = jest.fn().mockImplementation(async () => ({ ok: true, json: async () => responses.shift() }));
  render(<App />);
  fireEvent.change(await screen.findByLabelText('Provisioned credential'), { target: { value: 'private-test-credential' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Start assessment' }));
  fireEvent.change(await screen.findByLabelText('Your answer'), { target: { value: 'identity gender' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
  expect(await screen.findByText('Held for authorized review')).toBeInTheDocument();
  expect(screen.queryByText(/Test rubric score/)).not.toBeInTheDocument();
  expect(screen.queryByText('withheld content')).not.toBeInTheDocument();
  const [url, request] = global.fetch.mock.calls[3];
  expect(url).toBe('/api/research/assessments/assessment-1/answer');
  expect(JSON.parse(request.body)).toEqual({ answer: 'identity gender' });
  expect(request.headers.Authorization).toBe('Bearer test-token');
});

test('reviewer records a decision and reason through the controlled endpoint', async () => {
  const responses = [
    { mode: 'local' },
    { token: 'review-token', role: 'reviewer' },
    { id: 'assessment-2', evidence: { question: 'Question', answer: 'gender identity' },
      policy: { reasons: ['sensitive_attribute_reference'] }, feedback: { observations: [{ quote: 'gender identity' }] } },
    { id: 'assessment-2', state: 'rejected' }
  ];
  global.fetch = jest.fn().mockImplementation(async () => ({ ok: true, json: async () => responses.shift() }));
  render(<App />);
  fireEvent.change(await screen.findByLabelText('Provisioned credential'), { target: { value: 'reviewer-credential' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  fireEvent.change(await screen.findByLabelText('Assessment ID'), { target: { value: 'assessment-2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Load pending review' }));
  fireEvent.change(await screen.findByLabelText('Review reason'), { target: { value: 'Not appropriate for release.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record review decision' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4));
  expect(global.fetch.mock.calls[3][0]).toBe('/api/research/reviews/assessment-2');
  expect(JSON.parse(global.fetch.mock.calls[3][1].body)).toEqual({ decision: 'reject', reason: 'Not appropriate for release.' });
  await waitFor(() => expect(screen.queryByLabelText('Review reason')).not.toBeInTheDocument());
});

test('Google mode exposes provider sign-in and has no demo credential fallback', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ mode: 'google' }) });
  render(<App />);
  expect(await screen.findByRole('link', { name: 'Continue with Google' })).toHaveAttribute('href', '/api/research/oauth/google/start');
  expect(screen.queryByLabelText('Provisioned credential')).not.toBeInTheDocument();
});

test('provider callback redeems an HTTP-only handoff without a bearer token in the URL', async () => {
  window.history.replaceState(null, '', '/?auth=complete');
  const responses = [{ mode: 'google' }, { token: 'opaque-application-session', role: 'candidate' }];
  global.fetch = jest.fn().mockImplementation(async () => ({ ok: true, json: async () => responses.shift() }));
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Start assessment' })).toBeInTheDocument();
  expect(global.fetch.mock.calls[1][0]).toBe('/api/research/oauth/session');
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({});
  expect(window.location.search).toBe('');
});
