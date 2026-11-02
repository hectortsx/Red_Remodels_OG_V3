import contextlib
import copy
import io
import json
import os
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts/configure-turnstile-monitoring.py'


class MonitoringSafetyTests(unittest.TestCase):
    def setUp(self):
        self.module = types.ModuleType('monitoring_under_test')
        self.module.__file__ = str(SCRIPT)
        exec(compile(SCRIPT.read_text(), str(SCRIPT), 'exec'), self.module.__dict__)
        self.m = self.module
        self.writes = []
        self.old_umask = os.umask(0o077)

    def tearDown(self):
        os.umask(self.old_umask)

    def aws(self, *args):
        op = args[:2]
        if op == ('sts', 'get-caller-identity'):
            return {'Account': self.m.MANIFEST['accountId']}
        if op == ('logs', 'describe-log-groups'):
            return {'logGroups': [{'logGroupName': self.m.MANIFEST['logGroupName'], 'logGroupClass': 'STANDARD'}]}
        if op == ('sns', 'list-subscriptions-by-topic'):
            return {'Subscriptions': [{'Protocol': 'email', 'SubscriptionArn': 'confirmed-fixture'}]}
        if op in [('logs', 'put-metric-filter'), ('cloudwatch', 'put-metric-alarm')]:
            self.writes.append(args)
            return {}
        raise AssertionError('Unexpected AWS operation: ' + str(op))

    def test_wrong_account_stops_before_validation_or_writes(self):
        self.m.aws = Mock(return_value={'Account': '000000000000'})
        self.m.validate = Mock()
        with self.assertRaisesRegex(RuntimeError, 'Unexpected AWS account'):
            self.m.apply()
        self.m.validate.assert_not_called()
        self.assertEqual(self.m.aws.call_count, 1)

    def test_conflicting_filter_is_not_overwritten(self):
        self.m.aws = self.aws
        self.m.validate = Mock()
        _, config, _ = self.m.definitions()[0]
        existing = copy.deepcopy(config)
        existing['filterPattern'] = 'different owner pattern'
        self.m.inspect = Mock(return_value=({'metricFilters': [existing]}, {'MetricAlarms': []}))
        with self.assertRaisesRegex(RuntimeError, 'Existing filter differs'):
            self.m.apply()
        self.assertEqual(self.writes, [])

    def test_conflicting_alarm_is_not_overwritten(self):
        self.m.aws = self.aws
        self.m.validate = Mock()
        _, _, alarm = self.m.definitions()[0]
        existing = copy.deepcopy(alarm)
        existing['AlarmActions'] = ['different-owner-topic']
        self.m.inspect = Mock(return_value=({'metricFilters': []}, {'MetricAlarms': [existing]}))
        with self.assertRaisesRegex(RuntimeError, 'Existing alarm differs'):
            self.m.apply()
        self.assertEqual(self.writes, [])

    def test_dimensions_cannot_silently_expand_metric_cost(self):
        _, config, _ = self.m.definitions()[0]
        actual = copy.deepcopy(config)
        actual['metricTransformations'][0]['dimensions'] = {}
        self.assertTrue(self.m.equal_filter(actual, config))
        actual['metricTransformations'][0]['dimensions'] = {'RequestId': '$.requestId'}
        self.assertFalse(self.m.equal_filter(actual, config))

    def test_unconfirmed_notifications_stop_before_writes(self):
        def aws(*args):
            if args[:2] == ('sns', 'list-subscriptions-by-topic'):
                return {'Subscriptions': [{'Protocol': 'email', 'SubscriptionArn': 'PendingConfirmation'}]}
            return self.aws(*args)
        self.m.aws = aws
        self.m.validate = Mock()
        with self.assertRaisesRegex(RuntimeError, 'no confirmed email subscriber'):
            self.m.apply()
        self.assertEqual(self.writes, [])

    def test_permission_failure_does_not_create_anything(self):
        self.m.aws = Mock(side_effect=RuntimeError('AccessDeniedException'))
        with self.assertRaisesRegex(RuntimeError, 'AccessDeniedException'):
            self.m.validate()
        self.assertEqual(self.writes, [])

    def test_validation_accepts_one_based_aws_event_numbers(self):
        fixtures = json.loads((self.m.CONFIG / 'validation-fixtures.json').read_text())
        responses = [
            {'matches': [{'eventNumber': index, 'eventMessage': fixture['message']}
                         for index, fixture in enumerate(fixtures, start=1)
                         if item['name'] in fixture['matches']]}
            for item, _, _ in self.m.definitions()
        ]
        self.m.aws = Mock(side_effect=responses)
        with contextlib.redirect_stdout(io.StringIO()):
            self.m.validate()
        self.assertEqual(self.m.aws.call_count, 3)

    def test_validation_rejects_an_unexpected_match(self):
        self.m.aws = Mock(return_value={'matches': [{'eventNumber': 1}]})
        with self.assertRaisesRegex(RuntimeError, 'AWS pattern test failed for configuration'):
            self.m.validate()

    def test_apply_verifies_aws_normalized_readback_and_private_backup(self):
        self.m.aws = self.aws
        self.m.validate = Mock()
        filters, alarms = [], []
        for _, f, a in self.m.definitions():
            f = copy.deepcopy(f)
            f['metricTransformations'][0]['dimensions'] = {}
            filters.append(f)
            alarms.append(copy.deepcopy(a))
        self.m.inspect = Mock(side_effect=[({'metricFilters': []}, {'MetricAlarms': []}), ({'metricFilters': filters}, {'MetricAlarms': alarms})])
        with tempfile.TemporaryDirectory(prefix='monitoring-test-') as directory, contextlib.redirect_stdout(io.StringIO()):
            self.m.ROOT = Path(directory)
            self.m.apply()
            self.assertEqual(len(self.writes), 6)
            self.m.validate.assert_called_once()
            for file in Path(directory).rglob('*.json'):
                self.assertEqual(file.stat().st_mode & 0o777, 0o600)


if __name__ == '__main__':
    unittest.main()
