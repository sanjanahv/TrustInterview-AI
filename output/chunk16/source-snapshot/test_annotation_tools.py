"""Arithmetic/schema fixtures only; these are not applicant or human-annotation results."""
import copy
import unittest
from annotation_tools import (InvalidData, LABELS, agreement, analyze_annotations,
                              analyze_grounding, analyze_pairs, case_hash, confusion_metrics)

def case(key='g1', task='grounding', resume='A😀B'):
    return {'caseId': key, 'datasetVersion': 'unit-fixture', 'task': task, 'job': 'Junior role',
            'resume': resume, 'answer': 'Test answer', 'claim': 'Test claim' if task == 'grounding' else None,
            'claimOrigin': 'model' if task == 'grounding' else None}

def packet(c, identity='human-test-fixture-A', label=None, ambiguity=False):
    row = copy.deepcopy(c)
    row['annotation'] = dict(label=None, evidence=[], rationale=None, ambiguity=None, annotatorId=None, completedAt=None)
    if label:
        row['annotation'].update(label=label, evidence=[{'source': 'resume', 'start': 1, 'end': 2, 'quote': '😀'}],
                                 rationale='Unit-test fixture only', ambiguity=ambiguity, annotatorId=identity,
                                 completedAt='2026-10-11T10:00:00Z')
    return row

def run(c, **changes):
    row = dict(caseId=c['caseId'], runId='fixture-run', configuration='fixture-config', model='offline-unit',
               provider='offline', promptHash='a' * 64, rawResponseSha256='b' * 64, policyVersion='fixture-policy',
               rubricVersion='fixture-rubric', requestId='fixture-request', inputSha256=case_hash(c),
               runKind='offline', decoding={}, rawResponseRef='unit-fixture-not-a-real-response', recordedAt='2026-10-11T11:00:00Z',
               status='extracted', predictedLabel='source_supported', decision='release')
    row.update(changes)
    return row

class AnnotationTests(unittest.TestCase):
    def test_blank_packets_are_pending_without_agreement_or_metrics(self):
        c = case()
        report, gold = analyze_annotations([c], [packet(c)], [packet(c)])
        self.assertEqual(report['status'], 'pending_annotations')
        self.assertIsNone(report['agreement']); self.assertIsNone(gold); self.assertIsNone(report['efficacyMetrics'])

    def test_unicode_codepoint_spans_and_distinct_reviewer_ids(self):
        c = case()
        a, b = packet(c, 'A', 'source_supported'), packet(c, 'B', 'source_supported')
        report, gold = analyze_annotations([c], [a], [b])
        self.assertEqual(gold, {'g1': 'source_supported'})
        self.assertEqual(report['agreement']['grounding']['exactSpanSetAgreement'], 1)
        with self.assertRaises(InvalidData): analyze_annotations([c], [a], [a])
        b['annotation']['evidence'][0]['end'] = 3
        with self.assertRaises(InvalidData): analyze_annotations([c], [a], [b])

    def test_duplicates_missing_cases_tampering_and_partial_completion_rejected(self):
        c = case(); blank = packet(c)
        for rows in [[blank, blank], [], [{**blank, 'resume': 'changed'}]]:
            with self.assertRaises(InvalidData): analyze_annotations([c], rows, [blank])
        partial = copy.deepcopy(blank); partial['annotation']['rationale'] = 'Partial'
        with self.assertRaises(InvalidData): analyze_annotations([c], [partial], [blank])

    def test_evidence_label_and_timestamp_validation(self):
        c = case(); a = packet(c, 'A', 'source_supported'); b = packet(c, 'B', 'source_supported')
        for field, value in [('label', 'ambiguous'), ('evidence', []), ('completedAt', '2026-10-11T10:00:00'), ('ambiguity', 1)]:
            changed = copy.deepcopy(a); changed['annotation'][field] = value
            with self.assertRaises(InvalidData): analyze_annotations([c], [changed], [b])

    def test_disagreement_and_ambiguity_require_independent_adjudication(self):
        c = case(); a, b = packet(c, 'A', 'source_supported'), packet(c, 'B', 'undetermined')
        report, gold = analyze_annotations([c], [a], [b])
        self.assertEqual(report['status'], 'pending_adjudication'); self.assertIsNone(gold)
        adj = dict(caseId='g1', finalLabel='undetermined', reason='Fixture adjudication', adjudicatorId='C', completedAt='2026-10-11T11:00:00Z')
        self.assertEqual(analyze_annotations([c], [a], [b], [adj])[1]['g1'], 'undetermined')
        for field, value in [('adjudicatorId', 'A'), ('completedAt', '2026-10-11T09:00:00Z')]:
            changed = {**adj, field: value}
            with self.assertRaises(InvalidData): analyze_annotations([c], [a], [b], [changed])
        b = packet(c, 'B', 'source_supported', ambiguity=True)
        self.assertIsNone(analyze_annotations([c], [a], [b])[1])

    def test_kappa_arithmetic_and_degenerate_marginals(self):
        stats = agreement(['s', 's', 'c', 'c'], ['s', 'c', 'c', 'c'], ['s', 'c'])
        self.assertEqual(stats['rawAgreement'], .75); self.assertEqual(stats['kappa'], .5)
        self.assertIsNone(agreement(['s'], ['s'], ['s', 'c'])['kappa'])
        self.assertIsNone(agreement([], [], ['s', 'c'])['rawAgreement'])

    def test_confusion_keeps_missing_prediction_in_end_to_end_denominator(self):
        labels = LABELS['grounding']
        stats = confusion_metrics(list(labels), ['source_supported', 'source_supported', None])
        self.assertAlmostEqual(stats['accuracy'], 1 / 3)
        self.assertEqual(stats['confusionMatrix']['undetermined']['missing_prediction'], 1)
        self.assertAlmostEqual(stats['macroF1'], 2 / 9)
        self.assertIsNone(confusion_metrics([], [])['accuracy'])

    def test_extraction_coverage_and_origin_stratification(self):
        a, b = case(), case('g2'); b['claimOrigin'] = 'candidate'
        rows = [run(a), run(b, status='extraction_failed', predictedLabel=None, decision='abstain')]
        stats = analyze_grounding([a, b], {'g1': 'source_supported', 'g2': 'source_supported'}, rows)
        self.assertEqual(stats['groups']['all']['extractionCoverage'], .5)
        self.assertEqual(stats['groups']['all']['endToEnd']['accuracy'], .5)
        self.assertEqual(stats['groups']['all']['conditionalOnExtraction']['accuracy'], 1)
        self.assertIsNone(stats['groups']['candidate']['conditionalOnExtraction']['accuracy'])

    def test_predictions_need_complete_ids_input_hashes_and_consistent_status(self):
        c = case(); gold = {'g1': 'source_supported'}
        for rows in [[], [run(c), run(c)], [run(c, inputSha256='bad')], [run(c, status='provider_failed', predictedLabel=None, decision='release')]]:
            with self.assertRaises(InvalidData): analyze_grounding([c], gold, rows)

    def test_mixed_grounding_configuration_rejected_and_unsupported_release_counted(self):
        a, b = case(), case('g2')
        gold = {'g1': 'source_supported', 'g2': 'undetermined'}
        with self.assertRaises(InvalidData): analyze_grounding([a, b], gold, [run(a), run(b, model='other-model')])
        stats = analyze_grounding([a, b], gold, [run(a), run(b)])
        self.assertEqual(stats['groups']['all']['releasedNonSupportedGoldCount'], 1)

    def paired_fixture(self):
        a = case('p1', 'paired_input', 'Pronouns: she/her.\nSkills: SQL')
        b = case('p2', 'paired_input', 'Pronouns: he/him.\nSkills: SQL')
        manifest = {'cases': [dict(caseId='p1', pairId='pair1', variant=0, attribute='pronoun'), dict(caseId='p2', pairId='pair1', variant=1, attribute='pronoun')]}
        rows = [run(c, status='completed', score=score) for c, score in [(a, 40), (b, 60)]]
        return [a, b], manifest, rows

    def test_pair_direction_and_missing_scores_not_imputed(self):
        cases, manifest, rows = self.paired_fixture()
        analyzed = analyze_pairs(cases, manifest, rows)
        self.assertEqual(analyzed['contrasts'][0]['scoreDifference'], 20)
        self.assertEqual(analyzed['descriptiveSummaries'][0]['meanAbsoluteScoreDifference'], 20)
        rows[1].update(status='failed', decision=None, score=None)
        contrast = analyze_pairs(cases, manifest, rows)['contrasts'][0]
        self.assertIsNone(contrast['scoreDifference']); self.assertEqual(contrast['failedVariants'], 1)
        self.assertEqual(contrast['releaseDifference'], -1)
        self.assertIsNone(analyze_pairs(cases, manifest, rows)['descriptiveSummaries'][0]['completedMeanReleaseDifference'])

    def test_pair_missing_variant_model_mismatch_and_held_score_rejected(self):
        cases, manifest, rows = self.paired_fixture()
        for bad in [rows[:1], [rows[0], {**rows[1], 'model': 'different'}], [rows[0], {**rows[1], 'decision': 'review'}]]:
            with self.assertRaises(InvalidData): analyze_pairs(cases, manifest, bad)

if __name__ == '__main__':
    unittest.main()
