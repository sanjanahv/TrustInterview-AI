"""Strict annotation ingestion and descriptive pilot analysis; no synthetic gold labels."""
import argparse
from collections import Counter, defaultdict
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path

LABELS = {
    'grounding': ('source_supported', 'source_contradicted', 'undetermined'),
    'paired_input': ('job_relevant_evidence_sufficient', 'job_relevant_evidence_insufficient', 'ambiguous'),
}

class InvalidData(ValueError):
    pass

def require(condition, message):
    if not condition:
        raise InvalidData(message)

def timestamp(value):
    require(isinstance(value, str), 'completion timestamp required')
    try:
        result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError as error:
        raise InvalidData('invalid ISO completion timestamp') from error
    require(result.tzinfo is not None, 'completion timestamp must include timezone')
    return result

def index_records(records, expected, kind):
    require(isinstance(records, list), f'{kind}: list required')
    indexed = {}
    for record in records:
        require(isinstance(record, dict), f'{kind}: object required')
        key = record.get('caseId')
        require(isinstance(key, str) and key in expected, f'{kind}: unknown case ID')
        require(key not in indexed, f'{kind}: duplicate case ID {key}')
        indexed[key] = record
    require(set(indexed) == set(expected), f'{kind}: missing cases')
    return indexed

def validate_annotations(cases, records):
    indexed = index_records(records, cases, 'annotation')
    complete, pending, identities = {}, [], set()
    fields = {'label', 'evidence', 'rationale', 'ambiguity', 'annotatorId', 'completedAt'}
    for key, record in indexed.items():
        require({k: v for k, v in record.items() if k != 'annotation'} == cases[key], f'{key}: case content changed')
        a = record.get('annotation')
        require(isinstance(a, dict) and set(a) == fields, f'{key}: annotation schema mismatch')
        if a['label'] is None:
            require(a == dict(label=None, evidence=[], rationale=None, ambiguity=None, annotatorId=None, completedAt=None), f'{key}: partially completed annotation')
            pending.append(key)
            continue
        require(a['label'] in LABELS[cases[key]['task']], f'{key}: wrong task label')
        require(isinstance(a['rationale'], str) and a['rationale'].strip(), f'{key}: rationale required')
        require(type(a['ambiguity']) is bool, f'{key}: ambiguity flag required')
        require(isinstance(a['annotatorId'], str) and a['annotatorId'].strip(), f'{key}: annotator identity required')
        timestamp(a['completedAt'])
        identities.add(a['annotatorId'])
        require(isinstance(a['evidence'], list), f'{key}: evidence list required')
        resume = cases[key]['resume']
        seen = set()
        for span in a['evidence']:
            require(isinstance(span, dict) and set(span) == {'source', 'start', 'end', 'quote'}, f'{key}: span schema mismatch')
            require(span['source'] == 'resume' and isinstance(resume, str), f'{key}: unavailable source')
            start, end = span['start'], span['end']
            require(type(start) is int and type(end) is int and 0 <= start < end <= len(resume), f'{key}: invalid code-point offsets')
            require(isinstance(span['quote'], str) and resume[start:end] == span['quote'], f'{key}: quote mismatch')
            require((start, end) not in seen, f'{key}: duplicate span')
            seen.add((start, end))
        if a['label'] in {'source_supported', 'source_contradicted', 'job_relevant_evidence_sufficient'}:
            require(bool(a['evidence']), f'{key}: evidence required for this label')
        complete[key] = a
    require(len(identities) <= 1, 'one consistent annotator identity required per packet')
    return complete, pending, next(iter(identities), None)

def agreement(left, right, labels):
    require(len(left) == len(right), 'agreement length mismatch')
    n = len(left)
    if not n:
        return {'n': 0, 'rawAgreement': None, 'kappa': None, 'kappaReason': 'no_cases'}
    a, b = Counter(left), Counter(right)
    observed = sum(x == y for x, y in zip(left, right)) / n
    expected = sum(a[label] * b[label] for label in labels) / (n * n)
    kappa = None if math.isclose(expected, 1.0) else (observed - expected) / (1 - expected)
    return {'n': n, 'rawAgreement': observed, 'kappa': kappa,
            'kappaReason': 'degenerate_marginals' if kappa is None else None,
            'leftDistribution': dict(a), 'rightDistribution': dict(b)}

def confusion_metrics(gold, predictions, labels=LABELS['grounding']):
    require(len(gold) == len(predictions), 'metric length mismatch')
    matrix = {label: {p: 0 for p in (*labels, 'missing_prediction')} for label in labels}
    for actual, predicted in zip(gold, predictions):
        require(actual in labels and (predicted is None or predicted in labels), 'invalid metric label')
        matrix[actual][predicted if predicted is not None else 'missing_prediction'] += 1
    n = len(gold)
    if not n:
        return {'n': 0, 'accuracy': None, 'macroF1': None, 'confusionMatrix': matrix, 'perClass': None}
    per_class = {}
    for label in labels:
        tp = matrix[label][label]
        actual = sum(matrix[label].values())
        predicted = sum(matrix[row][label] for row in labels)
        precision = tp / predicted if predicted else 0.0
        recall = tp / actual if actual else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class[label] = {'support': actual, 'precision': precision, 'recall': recall, 'f1': f1}
    return {'n': n, 'accuracy': sum(matrix[label][label] for label in labels) / n,
            'macroF1': sum(x['f1'] for x in per_class.values()) / len(labels),
            'confusionMatrix': matrix, 'perClass': per_class,
            'zeroDivisionConvention': 'zero; macro includes all predefined classes'}

def case_hash(case):
    return hashlib.sha256(json.dumps(case, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()

def validate_run(row, case):
    for field in ['runId', 'configuration', 'model', 'policyVersion', 'rubricVersion', 'provider', 'requestId']:
        require(isinstance(row.get(field), str) and row[field].strip(), f'missing run metadata: {field}')
    for field in ['promptHash', 'rawResponseSha256']:
        value = row.get(field)
        require(isinstance(value, str) and len(value) == 64 and all(c in '0123456789abcdef' for c in value), f'invalid {field}')
    require(row.get('inputSha256') == case_hash(case), 'prediction input hash mismatch')
    require(row.get('runKind') in {'live', 'offline'}, 'declare run kind')
    require(isinstance(row.get('decoding'), dict), 'decoding settings required')
    require(isinstance(row.get('rawResponseRef'), str) and row['rawResponseRef'].strip(), 'raw response or error artifact reference required')
    timestamp(row.get('recordedAt'))

def analyze_annotations(case_list, left_records, right_records, adjudication=None):
    cases = index_records(case_list, {c['caseId'] for c in case_list}, 'case corpus')
    require(all(c.get('task') in LABELS for c in cases.values()), 'unknown task')
    left, pending_left, identity_left = validate_annotations(cases, left_records)
    right, pending_right, identity_right = validate_annotations(cases, right_records)
    if identity_left and identity_right:
        require(identity_left != identity_right, 'annotators must have different identities')
    report = {'status': 'pending_annotations', 'cases': len(cases), 'completedA': len(left), 'completedB': len(right),
              'pendingA': len(pending_left), 'pendingB': len(pending_right), 'agreement': None,
              'groundTruth': None, 'efficacyMetrics': None}
    if pending_left or pending_right:
        return report, None
    report['agreement'] = {}
    for task, labels in LABELS.items():
        keys = [k for k, c in cases.items() if c['task'] == task]
        stats = agreement([left[k]['label'] for k in keys], [right[k]['label'] for k in keys], labels)
        stats['ambiguousA'] = sum(left[k]['ambiguity'] for k in keys)
        stats['ambiguousB'] = sum(right[k]['ambiguity'] for k in keys)
        stats['exactSpanSetAgreement'] = sum(
            {(e['start'], e['end']) for e in left[k]['evidence']} == {(e['start'], e['end']) for e in right[k]['evidence']}
            for k in keys) / len(keys) if keys else None
        report['agreement'][task] = stats
    adjudicated = index_records(adjudication, cases, 'adjudication') if adjudication is not None else {}
    gold, unresolved, flags = {}, [], {}
    for key in cases:
        flags[key] = left[key]['ambiguity'] or right[key]['ambiguity']
        entry = adjudicated.get(key)
        if entry is not None:
            require(set(entry) == {'caseId', 'finalLabel', 'reason', 'adjudicatorId', 'completedAt'}, f'{key}: adjudication schema mismatch')
        if entry and entry['finalLabel'] is not None:
            require(entry['finalLabel'] in LABELS[cases[key]['task']], f'{key}: invalid adjudicated label')
            require(isinstance(entry['reason'], str) and entry['reason'].strip(), f'{key}: adjudication reason required')
            reviewer = entry['adjudicatorId']
            require(isinstance(reviewer, str) and reviewer.strip() and reviewer not in {identity_left, identity_right}, f'{key}: independent adjudicator required')
            completed = timestamp(entry['completedAt'])
            require(completed >= max(timestamp(left[key]['completedAt']), timestamp(right[key]['completedAt'])), f'{key}: adjudication predates annotation')
            gold[key] = entry['finalLabel']
        else:
            if entry:
                require(all(entry[f] is None for f in ['finalLabel', 'reason', 'adjudicatorId', 'completedAt']), f'{key}: partial adjudication')
            if left[key]['label'] == right[key]['label'] and not flags[key]:
                gold[key] = left[key]['label']
            else:
                unresolved.append(key)
    report.update(status='pending_adjudication' if unresolved else 'annotations_ready', unresolvedCases=unresolved,
                  ambiguityFlags=flags, groundTruth=gold if not unresolved else None)
    return report, gold if not unresolved else None

def analyze_grounding(cases, gold, records):
    expected = {c['caseId']: c for c in cases if c['task'] == 'grounding'}
    indexed = index_records(records, expected, 'grounding predictions')
    common = ['runId', 'configuration', 'provider', 'model', 'promptHash', 'policyVersion', 'rubricVersion', 'decoding', 'runKind']
    if indexed:
        first = next(iter(indexed.values()))
        require(all(all(row.get(f) == first.get(f) for f in common) for row in indexed.values()), 'grounding report must use one matched run/configuration')
    groups = {'all': list(expected), 'candidate': [], 'model': []}
    predictions, statuses, decisions = {}, Counter(), Counter()
    for key, case in expected.items():
        row = indexed[key]
        validate_run(row, case)
        require(row.get('status') in {'extracted', 'extraction_failed', 'provider_failed'}, f'{key}: invalid prediction status')
        predicted = row.get('predictedLabel')
        require((row['status'] == 'extracted' and predicted in LABELS['grounding']) or (row['status'] != 'extracted' and predicted is None), f'{key}: prediction/status mismatch')
        require(row.get('decision') in {'release', 'abstain', 'review', 'deny'}, f'{key}: output decision required')
        require(row['status'] != 'provider_failed' or row['decision'] != 'release', f'{key}: failed provider cannot release')
        predictions[key] = predicted
        statuses[row['status']] += 1
        decisions[row['decision']] += 1
        require(case['claimOrigin'] in {'candidate', 'model'}, f'{key}: claim origin required')
        groups[case['claimOrigin']].append(key)
    report = {'statuses': dict(statuses), 'decisions': dict(decisions), 'groups': {},
              'note': 'Source-relative descriptive pilot metrics; human provenance must be reviewed separately.'}
    for group, keys in groups.items():
        extracted = [k for k in keys if predictions[k] is not None]
        report['groups'][group] = {
            'endToEnd': confusion_metrics([gold[k] for k in keys], [predictions[k] for k in keys]),
            'conditionalOnExtraction': confusion_metrics([gold[k] for k in extracted], [predictions[k] for k in extracted]),
            'extractionCoverage': len(extracted) / len(keys) if keys else None,
            'ambiguousGoldIncluded': True,
            'releasedNonSupportedGoldCount': sum(indexed[k]['decision'] == 'release' and gold[k] != 'source_supported' for k in keys),
            'releaseDecisionCount': sum(indexed[k]['decision'] == 'release' for k in keys)}
    return report

def analyze_pairs(cases, author_manifest, records):
    expected = {c['caseId']: c for c in cases if c['task'] == 'paired_input'}
    mapping = {m['caseId']: m for m in author_manifest['cases'] if m.get('pairId')}
    require(set(mapping) == set(expected), 'pair manifest does not cover input cases')
    pairs = defaultdict(dict)
    for key, item in mapping.items():
        require(type(item.get('variant')) is int and item['variant'] in {0, 1}, 'invalid variant')
        require(item['variant'] not in pairs[item['pairId']], 'duplicate pair variant')
        pairs[item['pairId']][item['variant']] = key
    for pair in pairs.values():
        require(set(pair) == {0, 1}, 'incomplete manifest pair')
        a, b = expected[pair[0]], expected[pair[1]]
        require(isinstance(a['resume'], str) and isinstance(b['resume'], str) and '\n' in a['resume'] and '\n' in b['resume'], 'paired sources require signal and qualification lines')
        require(a['resume'].split('\n', 1)[0] != b['resume'].split('\n', 1)[0], 'pair signals must differ')
        require(a['job'] == b['job'] and a['answer'] == b['answer'] and a['resume'].split('\n', 1)[1:] == b['resume'].split('\n', 1)[1:], 'pair qualifications differ')
        require(mapping[pair[0]]['attribute'] == mapping[pair[1]]['attribute'], 'pair attributes differ')
    require(isinstance(records, list) and records, 'paired run records required')
    runs = defaultdict(dict)
    configurations = {}
    for row in records:
        require(isinstance(row, dict) and row.get('caseId') in expected, 'unknown paired case')
        key = row['caseId']
        validate_run(row, expected[key])
        fingerprint = {f: row[f] for f in ['provider', 'model', 'promptHash', 'policyVersion', 'rubricVersion', 'decoding', 'runKind']}
        require(row['configuration'] not in configurations or configurations[row['configuration']] == fingerprint, 'configuration metadata changed across paired runs')
        configurations[row['configuration']] = fingerprint
        require(row.get('status') in {'completed', 'failed'}, 'invalid paired status')
        require(row.get('decision') in {'release', 'abstain', 'review', 'deny'} or (row['status'] == 'failed' and row.get('decision') is None), 'invalid paired decision')
        score = row.get('score')
        require(score is None or (type(score) in {int, float} and math.isfinite(score) and 0 <= score <= 100), 'invalid score')
        require(score is None or (row['status'] == 'completed' and row['decision'] == 'release'), 'held or failed score must not be treated as released')
        require(not (row['status'] == 'failed' and row.get('decision') == 'release'), 'failed pair run cannot release')
        run_key = (row['configuration'], row['runId'])
        require(key not in runs[run_key], 'duplicate paired run')
        runs[run_key][key] = row
    contrasts = []
    for (configuration, run_id), rows in runs.items():
        require(set(rows) == set(expected), 'each run must retain all paired cases including failures')
        for pair_id, members in pairs.items():
            a, b = rows[members[0]], rows[members[1]]
            require(all(a[f] == b[f] for f in ['provider', 'model', 'promptHash', 'policyVersion', 'rubricVersion', 'decoding', 'runKind']), 'pair configuration mismatch')
            contrasts.append({'pairId': pair_id, 'runId': run_id, 'configuration': configuration,
                'attribute': mapping[members[0]]['attribute'], 'runKind': a['runKind'],
                'failedVariants': sum(x['status'] == 'failed' for x in [a, b]),
                'releaseDifference': int(b.get('decision') == 'release') - int(a.get('decision') == 'release'),
                'reviewDifference': int(b.get('decision') == 'review') - int(a.get('decision') == 'review'),
                'abstainDifference': int(b.get('decision') == 'abstain') - int(a.get('decision') == 'abstain'),
                'scoreDifference': b['score'] - a['score'] if a.get('score') is not None and b.get('score') is not None else None})
    groups = defaultdict(list)
    for contrast in contrasts:
        groups[(contrast['configuration'], contrast['attribute'])].append(contrast)
    summaries = []
    for (configuration, attribute), rows in groups.items():
        complete = [row for row in rows if not row['failedVariants']]
        scored = [row['scoreDifference'] for row in rows if row['scoreDifference'] is not None]
        summaries.append({'configuration': configuration, 'attribute': attribute, 'pairRuns': len(rows),
            'uniquePairs': len({row['pairId'] for row in rows}), 'failedVariants': sum(row['failedVariants'] for row in rows),
            'completedPairRuns': len(complete), 'scoredPairRuns': len(scored),
            'meanScoreDifference': sum(scored) / len(scored) if scored else None,
            'meanAbsoluteScoreDifference': sum(abs(x) for x in scored) / len(scored) if scored else None,
            'completedMeanReleaseDifference': sum(row['releaseDifference'] for row in complete) / len(complete) if complete else None,
            'completedMeanReviewDifference': sum(row['reviewDifference'] for row in complete) / len(complete) if complete else None,
            'completedMeanAbstainDifference': sum(row['abstainDifference'] for row in complete) / len(complete) if complete else None})
    return {'direction': 'variant 1 minus variant 0; see frozen author manifest', 'contrasts': contrasts, 'descriptiveSummaries': summaries,
            'note': 'Descriptive contrasts only. Failed variants retained; missing scores not replaced by zero. No population fairness, rank or selection claims.'}

def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cases', required=True)
    parser.add_argument('--annotator-a', required=True)
    parser.add_argument('--annotator-b', required=True)
    parser.add_argument('--adjudication')
    parser.add_argument('--grounding-predictions')
    parser.add_argument('--paired-runs')
    parser.add_argument('--author-manifest')
    parser.add_argument('--report', required=True)
    args = parser.parse_args()
    paths = [args.cases, args.annotator_a, args.annotator_b, args.adjudication, args.grounding_predictions, args.paired_runs, args.author_manifest]
    require(Path(args.report).resolve() not in {Path(p).resolve() for p in paths if p}, 'report must not overwrite input')
    cases = read(args.cases)
    report, gold = analyze_annotations(cases, read(args.annotator_a), read(args.annotator_b), read(args.adjudication) if args.adjudication else None)
    if args.grounding_predictions or args.paired_runs:
        require(gold is not None, 'annotations/adjudication pending: prediction analysis refused')
    if args.grounding_predictions:
        report['efficacyMetrics'] = analyze_grounding(cases, gold, read(args.grounding_predictions))
    if args.paired_runs:
        require(bool(args.author_manifest), 'paired analysis needs frozen author manifest')
        report['pairedMetrics'] = analyze_pairs(cases, read(args.author_manifest), read(args.paired_runs))
        report['pairedInputLabels'] = {c['caseId']: gold[c['caseId']] for c in cases if c['task'] == 'paired_input'}
    report['inputSha256'] = {str(p): hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in paths if p}
    report['limitations'] = 'Tool validation cannot establish human independence or annotation quality. Pilot metrics are descriptive; confidence intervals and a powered final study remain required.'
    Path(args.report).write_text(json.dumps(report, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    print(f"{report['status']}: A={report['completedA']}, B={report['completedB']}; report saved")

if __name__ == '__main__':
    try:
        main()
    except (InvalidData, ValueError, KeyError, TypeError) as error:
        raise SystemExit(f'Invalid study data: {error}')
