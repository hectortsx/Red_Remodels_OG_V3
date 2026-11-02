"""Run in your own interactive terminal; never send the secret through chat.

Only updates the Lambda environment. It preserves existing variables and code,
backs up configuration privately, and checks the revision before writing.
"""
import getpass
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import warnings

ROOT = Path(__file__).resolve().parent.parent
FUNCTION = 'red-remodels-contact-handler'
HOSTNAMES = 'www.redremodels.com,redremodels.com'


def aws(*args):
    result = subprocess.run(
        ['aws', *args, '--region', 'us-east-1', '--profile', 'red-remodels-deployer',
         '--output', 'json', '--no-cli-pager'],
        capture_output=True, text=True, timeout=90,
    )
    if result.returncode:
        raise RuntimeError(f'AWS {args[0]} {args[1]} failed; private response suppressed. Check login/read/write permissions.')
    return json.loads(result.stdout) if result.stdout.strip() else {}


def desired_environment(config, secret):
    variables = dict(config.get('Environment', {}).get('Variables', {}))
    if len(variables.get('CLOUDFRONT_ORIGIN_SECRET', '').encode()) < 32:
        raise RuntimeError('Existing origin protection is missing. Stop and review before configuring Turnstile.')
    if not re.fullmatch(r'[A-Za-z0-9_-]{16,512}', secret):
        raise RuntimeError('Secret format is invalid. Copy the private secret key from your widget, not the public sitekey.')
    if secret == '0x4AAAAAAFqBe8etgytx9j6M':
        raise RuntimeError('That is the public sitekey. Use the private secret key instead.')
    variables['TURNSTILE_SECRET_KEY'] = secret
    variables['TURNSTILE_ALLOWED_HOSTNAMES'] = HOSTNAMES
    return {'Variables': variables}


def main():
    if len(sys.argv) != 1 or not sys.stdin.isatty():
        raise RuntimeError('Run python3 scripts/configure-turnstile.py in your own interactive terminal. Secret input must be hidden.')
    if aws('sts', 'get-caller-identity')['Account'] != '365608889294':
        raise RuntimeError('Unexpected AWS account. No configuration changed.')
    before = aws('lambda', 'get-function-configuration', '--function-name', FUNCTION)
    if before.get('State') != 'Active' or before.get('LastUpdateStatus') != 'Successful':
        raise RuntimeError('Lambda is not ready for an environment update. No configuration changed.')
    print('This adds the Turnstile secret and the two approved hostnames to Lambda.')
    print('Existing environment variables and Lambda code are preserved. No email is sent.')
    warnings.simplefilter('error', getpass.GetPassWarning)
    secret = getpass.getpass('Paste the PRIVATE Turnstile secret key (hidden): ').strip()
    environment = desired_environment(before, secret)
    parent = ROOT / '.local/waf-baselines'
    parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    private = Path(tempfile.mkdtemp(prefix='turnstile-env-', dir=parent))

    def save(name, data):
        with (private / name).open('x') as stream:
            json.dump(data, stream, indent=2)

    save('lambda-before.json', before)
    save('environment-desired.json', environment)
    result = aws('lambda', 'update-function-configuration', '--function-name', FUNCTION,
                 '--revision-id', before['RevisionId'], '--environment',
                 'file://' + str(private / 'environment-desired.json'))
    save('lambda-update.json', result)
    if result.get('CodeSha256') != before['CodeSha256'] or result.get('Environment', {}).get('Variables') != environment['Variables']:
        raise RuntimeError('AWS readback differs from the expected environment/code. Inspect state before proceeding.')
    print('Environment update accepted; private configuration matches and Lambda code is unchanged.')
    print('Waiting for Lambda to finish applying it...')
    # AWS waiter is bounded; the following readback verifies the completed state.
    aws('lambda', 'wait', 'function-updated-v2', '--function-name', FUNCTION)
    after = aws('lambda', 'get-function-configuration', '--function-name', FUNCTION)
    save('lambda-after.json', after)
    if (after.get('State') != 'Active' or after.get('LastUpdateStatus') != 'Successful'
            or after.get('CodeSha256') != before['CodeSha256']
            or after.get('Environment', {}).get('Variables') != environment['Variables']):
        raise RuntimeError('Final verification did not match. Inspect AWS state before retrying.')
    print('VERIFIED: Lambda Active/Successful; matching environment; existing values preserved; no code deployed.')
    print('Private backup: ' + str(private.relative_to(ROOT)))
    print('Do not paste the backup or secret into chat. Share only the VERIFIED result.')


if __name__ == '__main__':
    os.umask(0o077)
    try:
        main()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except (KeyboardInterrupt, EOFError):
        print('Cancelled. If an AWS update was already accepted, check its state before retrying.', file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Setup did not complete; private output suppressed. Check AWS state before retrying.', file=sys.stderr)
        sys.exit(1)
