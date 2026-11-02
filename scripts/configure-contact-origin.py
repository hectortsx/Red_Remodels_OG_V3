"""Configure only the contact API origin header and matching Lambda environment.

Run prepare, cloudfront, status, lambda, status in order. All private payloads
and rollback configurations stay in the git-ignored baseline directory.
"""
import copy
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
PRIVATE = ROOT / '.local/waf-baselines/origin-setup'
BASELINE = ROOT / '.local/waf-baselines/2026-10-28T17-09-58.203Z-64ypAx'
PROFILE = 'red-remodels-deployer'
DISTRIBUTION = 'EKTYEDHVURFWC'
FUNCTION = 'red-remodels-contact-handler'
HEADER = 'x-red-remodels-origin-verify'
VARIABLE = 'CLOUDFRONT_ORIGIN_SECRET'


def aws(*args):
    result = subprocess.run(
        ['aws', *args, '--region', 'us-east-1', '--profile', PROFILE,
         '--output', 'json', '--no-cli-pager'],
        capture_output=True, text=True, timeout=90,
    )
    if result.returncode:
        # Suppress the CLI response, which can contain private configuration.
        raise RuntimeError(f'AWS {args[0]} {args[1]} failed; private response suppressed.')
    return json.loads(result.stdout)


def save(name, value):
    with (PRIVATE / name).open('x') as stream:
        os.chmod(PRIVATE / name, 0o600)
        json.dump(value, stream, indent=2)


def read(name):
    return json.loads((PRIVATE / name).read_text())


def origin(config):
    matches = [o for o in config['Origins']['Items'] if o['Id'] == 'APIGateway-contact']
    if len(matches) != 1 or matches[0]['DomainName'] != '4cktifwaki.execute-api.us-east-1.amazonaws.com':
        raise RuntimeError('Unexpected API origin; stop and review.')
    behaviors = config.get('CacheBehaviors', {}).get('Items', [])
    if not any(b['PathPattern'] == '/api/*' and b['TargetOriginId'] == matches[0]['Id'] for b in behaviors):
        raise RuntimeError('Unexpected API behavior; stop and review.')
    return matches[0]


def prepare():
    if PRIVATE.exists():
        raise RuntimeError('Preparation already exists; use status before any further action.')
    baseline = json.loads((BASELINE / 'lambda-config.json').read_text())
    if not (BASELINE / 'deployed-contact-handler.zip').is_file():
        raise RuntimeError('Missing rollback ZIP.')
    if aws('sts', 'get-caller-identity')['Account'] != '365608889294':
        raise RuntimeError('Unexpected AWS account.')
    distribution = aws('cloudfront', 'get-distribution', '--id', DISTRIBUTION)
    cf = aws('cloudfront', 'get-distribution-config', '--id', DISTRIBUTION)
    function = aws('lambda', 'get-function-configuration', '--function-name', FUNCTION)
    if distribution['Distribution']['Status'] != 'Deployed' or function.get('LastUpdateStatus') != 'Successful':
        raise RuntimeError('AWS update already in progress; wait before preparing.')
    if function['CodeSha256'] != baseline['CodeSha256']:
        raise RuntimeError('Lambda code changed since backup; refresh baseline first.')
    headers = origin(cf['DistributionConfig']).get('CustomHeaders', {}).get('Items', [])
    if any(h['HeaderName'].lower() == HEADER for h in headers) or VARIABLE in function.get('Environment', {}).get('Variables', {}):
        raise RuntimeError('Origin protection already partly configured; inspect before changing it.')
    PRIVATE.mkdir(mode=0o700)
    save('cloudfront-before.json', cf)
    save('lambda-before.json', function)
    # Capture live frontend rollback copies; these GETs cannot submit the form.
    for filename, url in [('homepage.html', 'https://www.redremodels.com/'), ('contact.html', 'https://www.redremodels.com/contact-us/')]:
        with urllib.request.urlopen(url, timeout=30) as response:
            data = response.read()
        with (PRIVATE / filename).open('xb') as stream:
            stream.write(data)
    secret = secrets.token_hex(32)
    save('origin-secret.json', {'value': secret})
    desired = copy.deepcopy(cf['DistributionConfig'])
    updated = headers + [{'HeaderName': HEADER, 'HeaderValue': secret}]
    origin(desired)['CustomHeaders'] = {'Quantity': len(updated), 'Items': updated}
    save('cloudfront-desired.json', desired)
    print('Prepared: API origin custom header + one Lambda environment variable; fresh rollback settings and live pages saved privately.')
    print('No AWS settings changed. Lambda code and Google verification will remain unchanged.')


def cloudfront():
    before = read('cloudfront-before.json')
    current = aws('cloudfront', 'get-distribution-config', '--id', DISTRIBUTION)
    if current['DistributionConfig'] == read('cloudfront-desired.json'):
        print('CloudFront already has the prepared configuration.')
        return
    if current != before:
        raise RuntimeError('CloudFront changed since preparation; stop and review.')
    result = aws('cloudfront', 'update-distribution', '--id', DISTRIBUTION,
                 '--if-match', before['ETag'], '--distribution-config',
                 'file://' + str(PRIVATE / 'cloudfront-desired.json'))
    save('cloudfront-update.json', result)
    print('CloudFront origin header update accepted. Wait for Deployed before updating Lambda.')


def update_lambda():
    distribution = aws('cloudfront', 'get-distribution', '--id', DISTRIBUTION)['Distribution']
    if distribution['Status'] != 'Deployed' or distribution['DistributionConfig'] != read('cloudfront-desired.json'):
        raise RuntimeError('CloudFront is not deployed with the prepared configuration yet.')
    before = read('lambda-before.json')
    current = aws('lambda', 'get-function-configuration', '--function-name', FUNCTION)
    if current['RevisionId'] != before['RevisionId']:
        raise RuntimeError('Lambda changed since preparation; stop and review.')
    variables = dict(current.get('Environment', {}).get('Variables', {}))
    variables[VARIABLE] = read('origin-secret.json')['value']
    save('lambda-environment-desired.json', {'Variables': variables})
    result = aws('lambda', 'update-function-configuration', '--function-name', FUNCTION,
                 '--revision-id', current['RevisionId'], '--environment',
                 'file://' + str(PRIVATE / 'lambda-environment-desired.json'))
    save('lambda-update.json', result)
    print('Matching Lambda environment update accepted. Existing environment variables preserved; no code deployed.')


def status():
    distribution = aws('cloudfront', 'get-distribution', '--id', DISTRIBUTION)['Distribution']
    current = aws('lambda', 'get-function-configuration', '--function-name', FUNCTION)
    before = read('lambda-before.json')
    expected_variables = dict(before.get('Environment', {}).get('Variables', {}))
    expected_variables[VARIABLE] = read('origin-secret.json')['value']
    report = {
        'cloudfrontStatus': distribution['Status'],
        'cloudfrontConfigurationMatches': distribution['DistributionConfig'] == read('cloudfront-desired.json'),
        'lambdaUpdateStatus': current.get('LastUpdateStatus'),
        'lambdaRequiredEnvironmentValuesPreserved': all(
            current.get('Environment', {}).get('Variables', {}).get(key) == value
            for key, value in expected_variables.items()
            if key not in {'RECAPTCHA_SECRET', 'RECAPTCHA_MIN_SCORE', 'RECAPTCHA_BYPASS'}
        ),
        'retiredGoogleConfigurationRemoved': not any(
            key in current.get('Environment', {}).get('Variables', {})
            for key in {'RECAPTCHA_SECRET', 'RECAPTCHA_MIN_SCORE', 'RECAPTCHA_BYPASS'}
        ),
        'lambdaOriginSecretMatches': current.get('Environment', {}).get('Variables', {}).get(VARIABLE) == read('origin-secret.json')['value'],
        'turnstileSecretConfigured': bool(current.get('Environment', {}).get('Variables', {}).get('TURNSTILE_SECRET_KEY')),
        'turnstileAllowedHostnames': current.get('Environment', {}).get('Variables', {}).get('TURNSTILE_ALLOWED_HOSTNAMES'),
        'lambdaCodeMatchesPreGuardBackup': current['CodeSha256'] == before['CodeSha256'],
    }
    if (PRIVATE / 'guard-package.json').exists():
        report['lambdaCodeMatchesGuardPackage'] = current['CodeSha256'] == read('guard-package.json')['codeSha256']
    packages = list(PRIVATE.parent.glob('turnstile-env-*/turnstile-package.json'))
    if packages:
        report['lambdaCodeMatchesTurnstilePackage'] = any(
            current['CodeSha256'] == json.loads(package.read_text())['codeSha256']
            for package in packages
        )
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    os.umask(0o077)
    actions = {'prepare': prepare, 'cloudfront': cloudfront, 'lambda': update_lambda, 'status': status}
    try:
        if len(sys.argv) != 2 or sys.argv[1] not in actions:
            raise RuntimeError('Usage: python3 scripts/configure-contact-origin.py prepare|cloudfront|lambda|status')
        actions[sys.argv[1]]()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Operation failed; private configuration and secret output suppressed. Inspect state before retrying.', file=sys.stderr)
        sys.exit(1)
