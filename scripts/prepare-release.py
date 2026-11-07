#!/usr/bin/env python3
"""Offline release configuration check/command plan. Never executes a command.

Python 3.11+ uses tomllib; the local macOS Python can use pip's bundled tomli.
No environment values, linked-project files or credentials are read.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

try:
    import tomllib
except ImportError:
    from pip._vendor import tomli as tomllib

APP = Path(__file__).resolve().parents[1]
CLI_VERSION = '2.122.0'
RETIRED = ('send-push-notification', 'send-wellness-reminder', 'generate-vapid-keys')
APPLICATION = ('message-media', 'account-deletion', 'encyclopedia-admin', 'app-branding', 'get-vapid-public-key')
DEFERRED = ('dispatch-notifications', 'create-demo-user')
ENV_KEYS = ('OBEDIENCE_RELEASE_SITE_URL', 'OBEDIENCE_RELEASE_AUTH_REDIRECT_URL', 'OBEDIENCE_RELEASE_RECOVERY_REDIRECT_URL')


def require(ok, message):
    if not ok:
        raise ValueError(message)


def read_toml(path):
    require(path.is_file() and not path.is_symlink(), 'Expected regular configuration file: ' + str(path))
    return tomllib.loads(path.read_text())


def check(app=APP):
    require(not (app / 'supabase/config.json').exists(), 'config.json would compete with the reviewed TOML')
    config = read_toml(app / 'supabase/config.toml')
    require(set(config) == {'project_id', 'auth', 'functions'} and config['project_id'] == 'obedience',
            'Unexpected release config section or local project identifier')
    require(config['auth'] == {'site_url': 'env(' + ENV_KEYS[0] + ')',
            'additional_redirect_urls': ['env(' + key + ')' for key in ENV_KEYS[1:]]},
            'Auth release origins must remain explicit unresolved inputs')
    functions = config['functions']
    require(isinstance(functions, dict) and set(functions) == set(RETIRED + APPLICATION + DEFERRED),
            'Function inventory changed; review deployment membership')
    for name, actual in functions.items():
        expected = {'enabled': name not in DEFERRED, 'verify_jwt': name == 'create-demo-user',
                    'entrypoint': './functions/' + name + '/index.ts'}
        require(actual == expected and type(actual['enabled']) is bool and type(actual['verify_jwt']) is bool,
                'Unexpected authentication, enablement or entrypoint: ' + name)
        path = app / 'supabase' / expected['entrypoint']
        require(path.is_file() and not path.is_symlink(), 'Missing or redirected entrypoint: ' + name)
    for name in ('account-deletion', 'encyclopedia-admin', 'app-branding'):
        fragment = read_toml(app / 'supabase/functions' / name / 'config.toml')
        require(fragment == {'functions': {name: {'verify_jwt': False}}}, 'Function fragment disagrees: ' + name)
    return config


def origin(value):
    require(isinstance(value, str) and value.isascii() and value == value.strip(), 'Use an exact ASCII HTTPS origin')
    parsed = urlsplit(value)
    host = parsed.hostname or ''
    require(parsed.scheme == 'https' and not parsed.username and not parsed.password and parsed.port in (None, 443)
            and parsed.path in ('', '/') and not parsed.query and not parsed.fragment, 'Expected HTTPS origin without path, query or credentials')
    require(re.fullmatch(r'(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}', host)
            and not host.endswith(('.invalid', '.localhost', '.local', '.test', '.example'))
            and host not in ('example.com', 'example.net', 'example.org')
            and not any(word in host for word in ('replace', 'placeholder', '<', '>')),
            'Origin must be the chosen hosted domain, not a placeholder or local address')
    require(parsed.netloc == host or parsed.netloc == host + ':443', 'Use a normalized lowercase host')
    return 'https://' + host


def plan(project_ref, site_url, app=APP):
    check(app)
    require(isinstance(project_ref, str) and re.fullmatch(r'[a-z]{20}', project_ref)
            and len(set(project_ref)) > 1 and project_ref not in ('abcdefghijklmnopqrst', 'replacethisprojectref'),
            'An explicit reviewed 20-letter hosted project ref is required')
    site = origin(site_url)
    environment = dict(zip(ENV_KEYS, (site, site + '/auth', site + '/reset-password')))
    # Return argv, not a shell string. No linking, reset, prune, broad config push,
    # migrations, secrets, scheduler changes or deployment happens in this script.
    def command(names):
        return ['supabase', 'functions', 'deploy', *names, '--project-ref', project_ref, '--use-api', '--workdir', str(app)]
    return {
        'configurationResolved': True, 'deploymentPerformed': False, 'releaseAccepted': False,
        'cliVersion': CLI_VERSION, 'projectRef': project_ref, 'siteUrl': site,
        'configSha256': hashlib.sha256((app / 'supabase/config.toml').read_bytes()).hexdigest(),
        'requiredEnvironment': environment,
        'authUrlSettingsOnly': {'site_url': site, 'uri_allow_list': site + '/auth,' + site + '/reset-password'},
        'stepsAfterTargetReviewAndMaintenance': [
            {'stage': 'replace-retired-notification-endpoints', 'argv': command(RETIRED)},
            {'stage': 'after-reviewed-schema-and-old-media-worker-drain', 'argv': command(APPLICATION)},
        ],
        'excludedFunctions': list(DEFERRED),
        'mustRemainDisabled': ['notification delivery', 'notification scheduler', 'original-account lifecycle/accounting activation'],
        'unresolved': ['hosted identity and ownership verification', 'backup and exact migration reconciliation',
                       'legacy create-demo-user hosted retirement', 'old message-media worker drain',
                       'Auth URL settings readback and existing redirects review',
                       'frontend origin/backend allowlist and public-key build binding',
                       'hosted built-in SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY compatibility',
                       'SMTP/email template delivery review', 'actual hosted synthetic acceptance and rollback/cutover review'],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check only the unresolved source template')
    parser.add_argument('--project-ref')
    parser.add_argument('--site-url')
    args = parser.parse_args()
    try:
        if args.check:
            require(not args.project_ref and not args.site_url, '--check does not resolve a deployment target')
            check()
            result = {'templateValid': True, 'configurationResolved': False, 'deploymentPerformed': False,
                      'missingInputs': ['reviewed hosted project ref', 'final HTTPS app origin']}
        else:
            require(args.project_ref and args.site_url, 'Both --project-ref and --site-url are required; use --check for the template')
            result = plan(args.project_ref, args.site_url)
        print(json.dumps(result, indent=2))
    except (ValueError, OSError) as error:
        parser.exit(2, 'Release preparation stopped: ' + str(error) + '\n')


if __name__ == '__main__':
    main()
