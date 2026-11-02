"""Review, validate, or deploy scoped Turnstile monitoring. Default: plan only."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / 'infra/turnstile-monitoring'
MANIFEST = json.loads((CONFIG / 'manifest.json').read_text())
PROFILE = 'red-remodels-deployer'


def aws(*args):
    result = subprocess.run(['aws', *args, '--region', MANIFEST['region'], '--profile', PROFILE, '--output', 'json', '--no-cli-pager'], capture_output=True, text=True, timeout=90)
    if result.returncode:
        match = re.search(r'An error occurred \(([^)]+)\)', result.stderr)
        code = match.group(1) if match else 'AWSCallFailed'
        raise RuntimeError(f'{args[0]}:{args[1]} failed ({code}). No raw logs, credentials, or subscription details printed.')
    return json.loads(result.stdout) if result.stdout.strip() else {}


def definitions():
    return [(item, json.loads((CONFIG / item['filterFile']).read_text()), json.loads((CONFIG / item['alarmFile']).read_text())) for item in MANIFEST['items']]


def validate():
    fixtures = json.loads((CONFIG / 'validation-fixtures.json').read_text())
    for item, filter_config, _ in definitions():
        result = aws('logs', 'test-metric-filter', '--filter-pattern', filter_config['filterPattern'], '--log-event-messages', *[fixture['message'] for fixture in fixtures])
        matched = {int(event['eventNumber']) for event in result.get('matches', [])}
        # CloudWatch TestMetricFilter numbers input events starting at one.
        expected = {index for index, fixture in enumerate(fixtures, start=1) if item['name'] in fixture['matches']}
        if matched != expected:
            raise RuntimeError('AWS pattern test failed for ' + item['name'] + '; no resources created by validation.')
        print('PASS AWS synthetic pattern validation: ' + item['name'])


def inspect():
    filters = aws('logs', 'describe-metric-filters', '--log-group-name', MANIFEST['logGroupName'])
    names = [alarm['AlarmName'] for _, _, alarm in definitions()]
    alarms = aws('cloudwatch', 'describe-alarms', '--alarm-names', *names)
    return filters, alarms


def equal_filter(current, desired):
    actual = current.get('metricTransformations', [])
    expected = desired['metricTransformations']
    return (current.get('filterPattern') == desired['filterPattern']
            and len(actual) == len(expected)
            and all(not value.get('dimensions') and all(value.get(key) == item for key, item in target.items())
                    for value, target in zip(actual, expected))
            and not current.get('applyOnTransformedLogs')
            and not current.get('emitSystemFieldDimensions'))


def equal_alarm(current, desired):
    return (not current.get('Dimensions') and not current.get('Metrics')
            and all(current.get(key) == value for key, value in desired.items()))


def apply():
    if aws('sts', 'get-caller-identity')['Account'] != MANIFEST['accountId']:
        raise RuntimeError('Unexpected AWS account; stop before deployment.')
    validate()  # TestMetricFilter never ingests messages or creates metrics.
    groups = aws('logs', 'describe-log-groups', '--log-group-name-prefix', MANIFEST['logGroupName'])
    group = next((group for group in groups.get('logGroups', []) if group['logGroupName'] == MANIFEST['logGroupName']), None)
    if not group or group.get('logGroupClass', 'STANDARD') != 'STANDARD':
        raise RuntimeError('Expected Standard-class Lambda log group is unavailable.')
    subscriptions = aws('sns', 'list-subscriptions-by-topic', '--topic-arn', MANIFEST['topicArn'])
    if not any(s.get('Protocol') == 'email' and s.get('SubscriptionArn') != 'PendingConfirmation' for s in subscriptions.get('Subscriptions', [])):
        raise RuntimeError('Existing alert topic has no confirmed email subscriber; no resources created.')
    old_filters, old_alarms = inspect()
    filters = {item['filterName']: item for item in old_filters.get('metricFilters', [])}
    alarms = {item['AlarmName']: item for item in old_alarms.get('MetricAlarms', [])}
    for _, filter_config, alarm_config in definitions():
        if filter_config['filterName'] in filters and not equal_filter(filters[filter_config['filterName']], filter_config):
            raise RuntimeError('Existing filter differs; review before replacing it.')
        if alarm_config['AlarmName'] in alarms and not equal_alarm(alarms[alarm_config['AlarmName']], alarm_config):
            raise RuntimeError('Existing alarm differs; review before replacing it.')
    parent = ROOT / '.local/waf-baselines'
    parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    backup = Path(tempfile.mkdtemp(prefix='turnstile-monitoring-', dir=parent))
    def save(name, data):
        (backup / name).write_text(json.dumps(data, indent=2))
    save('filters-before.json', old_filters)
    save('alarms-before.json', old_alarms)
    save('approved-plan.json', MANIFEST)
    for item, filter_config, alarm_config in definitions():
        if filter_config['filterName'] not in filters:
            result = aws('logs', 'put-metric-filter', '--cli-input-json', 'file://' + str(CONFIG / item['filterFile']))
            save(item['name'] + '-filter-create.json', result)
        if alarm_config['AlarmName'] not in alarms:
            result = aws('cloudwatch', 'put-metric-alarm', '--cli-input-json', 'file://' + str(CONFIG / item['alarmFile']))
            save(item['name'] + '-alarm-create.json', result)
    fresh_filters, fresh_alarms = inspect()
    filters = {item['filterName']: item for item in fresh_filters.get('metricFilters', [])}
    alarms = {item['AlarmName']: item for item in fresh_alarms.get('MetricAlarms', [])}
    for _, filter_config, alarm_config in definitions():
        if not equal_filter(filters.get(filter_config['filterName'], {}), filter_config) or not equal_alarm(alarms.get(alarm_config['AlarmName'], {}), alarm_config):
            raise RuntimeError('AWS readback differs; inspect the partial deployment before retrying.')
    save('filters-after.json', fresh_filters)
    save('alarms-after.json', fresh_alarms)
    print('VERIFIED: three scoped filters/alarms match the plan. No contact requests, synthetic log ingestion, or test alerts sent.')
    print('Private deployment records: ' + str(backup.relative_to(ROOT)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['plan', 'validate', 'apply', 'status'], nargs='?', default='plan')
    args = parser.parse_args()
    if args.action == 'plan':
        print('Proposed resources: three dimension-free custom metrics and three standard alarms in us-east-1.')
        print('Estimated metric/alarm cost: about $1.20/month before free allowances/credits; SNS, existing logs, API usage, and taxes are separate.')
        print('Actions use the existing redremodels-alerts topic. No new subscriptions or application changes.')
        print('Budget approval and administrator-reviewed permissions are required before apply.')
        for _, _, alarm in definitions():
            print(f"{alarm['AlarmName']}: Sum >= {alarm['Threshold']} per {alarm['Period']}s; {alarm['DatapointsToAlarm']}/{alarm['EvaluationPeriods']} periods; missing data not breaching")
    elif args.action == 'validate':
        validate()
    elif args.action == 'apply':
        apply()
    else:
        _, alarms = inspect()
        print(json.dumps([{'name':alarm['AlarmName'], 'state':alarm['StateValue']} for alarm in alarms.get('MetricAlarms', [])], indent=2))


if __name__ == '__main__':
    os.umask(0o077)
    try:
        main()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Monitoring operation did not complete. Private output suppressed; inspect state before retrying.', file=sys.stderr)
        sys.exit(1)
